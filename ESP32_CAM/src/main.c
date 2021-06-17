#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <unistd.h>
#include <limits.h>
#include <string.h>

#include "sdkconfig.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "freertos/timers.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event_loop.h"
#include "esp_log.h"
#include "esp_vfs_fat.h"
#include "driver/sdmmc_host.h"

#include "nvs.h"
#include "nvs_flash.h"

#include "aws_iot_config.h"
#include "aws_iot_log.h"
#include "aws_iot_version.h"
#include "aws_iot_mqtt_client_interface.h"

#include "esp_camera.h"
#include "esp_http_server.h"
#include "esp_timer.h"
#include "esp_deep_sleep.h"

#include "camera-config.h"
#include "camera-s3-upload.h"
#include "camera-webserver.h"

/* The examples use simple WiFi configuration that you can set via  'make menuconfig'.
   If you'd rather not, just change the below entries to strings with
   the config you want - ie #define EXAMPLE_WIFI_SSID "mywifissid"

   예제에서는 다음을 통해 설정할 수있는 간단한 WiFi 구성을 사용합니다. 'make menuconfig'.

    원하지 않는 경우 아래 항목을 문자열로 변경하십시오.
    원하는 구성-예 : #define EXAMPLE_WIFI_SSID "mywifissid"
*/
#define EXAMPLE_WIFI_SSID CONFIG_WIFI_SSID
#define EXAMPLE_WIFI_PASS CONFIG_WIFI_PASSWORD

/* FreeRTOS event group to signal when we are connected & ready to make a request 
   연결되어 요청을 할 준비가되었을 때 신호를 보낼 FreeRTOS 이벤트 그룹
*/
static EventGroupHandle_t wifi_event_group;

/* The event group allows multiple bits for each event, but we only care about one event - are we connected to the AP with an IP?
   이벤트 그룹은 각 이벤트에 대해 여러 비트를 허용하지만 하나의 이벤트에만 관심이 있습니다. IP로 AP에 연결되어 있습니까?
 */
const int CONNECTED_BIT = BIT0;

/* CA Root certificate, device ("Thing") certificate and device ("Thing") key.
   Example can be configured one of two ways: "Embedded Certs" are loaded from files in "certs/" and embedded into the app binary.
   "Filesystem Certs" are loaded from the filesystem (SD card, etc.)
   See example README for more details.
   CA 루트 인증서, 사물 인증서, 사물 키.
   예제는 다음 두 가지 방법 중 하나로 구성 할 수 있습니다: "Embedded Certs"는 "certs /"의 파일에서로드되고 앱 바이너리에 포함됩니다.
   "파일 시스템 인증서"는 파일 시스템 (SD 카드 등)에서로드됩니다.
자세한 내용은 예제 README를 참조하십시오.
*/
#if defined(CONFIG_EXAMPLE_EMBEDDED_CERTS)

//인증서 가져오기
extern const uint8_t aws_root_ca_pem_start[] asm("_binary_aws_root_ca_pem_start");
extern const uint8_t aws_root_ca_pem_end[] asm("_binary_aws_root_ca_pem_end");
extern const uint8_t certificate_pem_crt_start[] asm("_binary_certificate_pem_crt_start");
extern const uint8_t certificate_pem_crt_end[] asm("_binary_certificate_pem_crt_end");
extern const uint8_t private_pem_key_start[] asm("_binary_private_pem_key_start");
extern const uint8_t private_pem_key_end[] asm("_binary_private_pem_key_end");

#elif defined(CONFIG_EXAMPLE_FILESYSTEM_CERTS)

static const char * DEVICE_CERTIFICATE_PATH = CONFIG_EXAMPLE_CERTIFICATE_PATH;
static const char * DEVICE_PRIVATE_KEY_PATH = CONFIG_EXAMPLE_PRIVATE_KEY_PATH;
static const char * ROOT_CA_PATH = CONFIG_EXAMPLE_ROOT_CA_PATH;

#else
#error "Invalid method for loading certs"
#endif

#define STREAM_URL "{StaticIP}"

char* HelmetID = ""; //헬멧 ID
char* S3_URL = "{BUCKET_NAME}.s3.{REGION}.amazonaws.com"; //S3 Host 주소


uint8_t base_mac_addr[6] = {0};
uint32_t aws_host_port = AWS_IOT_MQTT_PORT;
char aws_host_address[255] = AWS_IOT_MQTT_HOST;

/**
 * Function signatures
 * */
static void init_app();
static void init_wifi(void);
void subscribe_callback_handler(AWS_IoT_Client *pClient, char *topicName, uint16_t topicNameLen, IoT_Publish_Message_Params *params, void *pData);
void disconnect_callback_handler(AWS_IoT_Client *pClient, void *data);
void aws_mqtt_task(void *param);

static esp_err_t event_handler(void *ctx, system_event_t *event);

/** 
 * 초기화 부분
 * Description: Setting initial vars with zeros. Reading out MAC Address for device identification
 * 0으로 초기 변수 설정. 장치 식별을 위해 MAC 주소 읽기
 * */
static void init_app() 
{       
    esp_err_t ret = ESP_OK;
    esp_efuse_mac_get_default(base_mac_addr);

    ret = esp_efuse_mac_get_default(base_mac_addr);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to get base MAC address from EFUSE BLK0. (%s)", esp_err_to_name(ret));
        ESP_LOGE(TAG, "Aborting");
        abort();
    } else {
        esp_log_buffer_hexdump_internal(TAG, base_mac_addr, 6, ESP_LOG_INFO);
    }    
}

/**
 * Description: Wifi init - WiFi 초기화 함수
 * */
static void init_wifi(void)
{
    tcpip_adapter_init();
    wifi_event_group = xEventGroupCreate();
    ESP_ERROR_CHECK( esp_event_loop_init(event_handler, NULL) );
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK( esp_wifi_init(&cfg) );
    ESP_ERROR_CHECK( esp_wifi_set_storage(WIFI_STORAGE_RAM) );

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = EXAMPLE_WIFI_SSID,
            .password = EXAMPLE_WIFI_PASS
        },
    };

    ESP_LOGI(TAG, "Setting WiFi configuration SSID %s...", wifi_config.sta.ssid);
    ESP_ERROR_CHECK( esp_wifi_set_mode(WIFI_MODE_STA) );
    ESP_ERROR_CHECK( esp_wifi_set_config(WIFI_IF_STA, &wifi_config) );
    ESP_ERROR_CHECK( esp_wifi_start() );
}

/**
 * Description: Handler for system events - 시스템 이벤트 처리기
 * */
static esp_err_t event_handler(void *ctx, system_event_t *event)
{
    switch(event->event_id) {
    case SYSTEM_EVENT_STA_START:
        esp_wifi_connect();
        break;
    case SYSTEM_EVENT_STA_GOT_IP:
        xEventGroupSetBits(wifi_event_group, CONNECTED_BIT);
        break;
    case SYSTEM_EVENT_STA_DISCONNECTED:
        /* This is a workaround as ESP32 WiFi libs don't currently auto-reassociate.
           ESP32 WiFi 라이브러리가 자동 재 연결되지 않을 때 쓰는 코드
         */
        esp_wifi_connect();
        xEventGroupClearBits(wifi_event_group, CONNECTED_BIT);
        break;
    default:
        break;
    }
    return ESP_OK;
}

/**
 * Description: Callback for MQTT url subscription - MQTT URL 구독에 대한 콜백
*/

/*(1) HelmetID 정보 searching_face 함수로 publish -> searching face 함수에서 받아서 변수값(photo)으로 저장함
    (2) camera_s3_upload() - S3로 사진 업로드
    (3) searching_face 함수로부터 rekog 결과(SUCCESS || "") subscribe
    (4) SUCCESS면 camera_s3_upload() 호출 중지
    - SUCCESS이면 바로 중지 ()
    - SUCCESS가 아니면 5번 더 camera_s3_upload() 호출하고 중지
    -> 다시 업로딩하고 싶으면 reset버튼 누르기 
*/
    

/**
 * Description: Handler if mqtt disconnects and attempt reconnecting
 * mqtt의 연결이 끊겼을 때, 재연결을 시도하는 handler.
 * */
void disconnect_callback_handler(AWS_IoT_Client *pClient, void *data) {
    ESP_LOGW(TAG, "MQTT Disconnect"); //TAG는 esp32임.
    IoT_Error_t rc = FAILURE;

    if(NULL == pClient) {
        return;
    }

    if(aws_iot_is_autoreconnect_enabled(pClient)) { //클라이언트 mqtt 자동재연결 가능하다면
        ESP_LOGI(TAG, "Auto Reconnect is enabled, Reconnecting attempt will start now");
    } else { //자동재연결 불가능한 경우
        ESP_LOGW(TAG, "Auto Reconnect not enabled. Starting manual reconnect...");
        rc = aws_iot_mqtt_attempt_reconnect(pClient);
        if(NETWORK_RECONNECTED == rc) {
            ESP_LOGW(TAG, "Manual Reconnect Successful");
        } else {
            ESP_LOGW(TAG, "Manual Reconnect Failed - %d", rc);
        }
    }
}

/**
 * Description: Main task for handling MQTT transport
 * MQTT 전송을 처리하기 위한 기본 작업 수행
 * */
void aws_mqtt_task(void *param) {
    char cPayload[128];

    IoT_Error_t rc = FAILURE;

    AWS_IoT_Client client;
    IoT_Client_Init_Params mqttInitParams = iotClientInitParamsDefault;
    IoT_Client_Connect_Params connectParams = iotClientConnectParamsDefault;

    IoT_Publish_Message_Params paramsQOS0;

    // ESP_LOGI(TAG, "AWS IoT SDK Version %d.%d.%d-%s", VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH, VERSION_TAG);

    mqttInitParams.enableAutoReconnect = false; // We enable this later below
    mqttInitParams.pHostURL = aws_host_address;
    mqttInitParams.port = aws_host_port;

//인증서 mqttInitParams 구조체에 담기
#if defined(CONFIG_EXAMPLE_EMBEDDED_CERTS)
    mqttInitParams.pRootCALocation = (const char *)aws_root_ca_pem_start;
    mqttInitParams.pDeviceCertLocation = (const char *)certificate_pem_crt_start;
    mqttInitParams.pDevicePrivateKeyLocation = (const char *)private_pem_key_start;

#elif defined(CONFIG_EXAMPLE_FILESYSTEM_CERTS)
    mqttInitParams.pRootCALocation = ROOT_CA_PATH;
    mqttInitParams.pDeviceCertLocation = DEVICE_CERTIFICATE_PATH;
    mqttInitParams.pDevicePrivateKeyLocation = DEVICE_PRIVATE_KEY_PATH;
#endif

    mqttInitParams.mqttCommandTimeout_ms = 20000;
    mqttInitParams.tlsHandshakeTimeout_ms = 5000;
    mqttInitParams.isSSLHostnameVerify = true;
    mqttInitParams.disconnectHandler = disconnect_callback_handler;
    mqttInitParams.disconnectHandlerData = NULL;

    rc = aws_iot_mqtt_init(&client, &mqttInitParams);
    if(SUCCESS != rc) {
        ESP_LOGE(TAG, "aws_iot_mqtt_init returned error : %d ", rc);
        abort();
    }

    /* Wait for WiFI to show as connected */
    xEventGroupWaitBits(wifi_event_group, CONNECTED_BIT,
                        false, true, portMAX_DELAY);

    connectParams.keepAliveIntervalInSec = 10;
    connectParams.isCleanSession = true;
    connectParams.MQTTVersion = MQTT_3_1_1;
    /* Client ID is set in the menuconfig of the example */
    connectParams.pClientID = CONFIG_AWS_EXAMPLE_CLIENT_ID;
    connectParams.clientIDLen = (uint16_t) strlen(CONFIG_AWS_EXAMPLE_CLIENT_ID);
    connectParams.isWillMsgPresent = false;

    ESP_LOGI(TAG, "Connecting to AWS...");
    do {
        rc = aws_iot_mqtt_connect(&client, &connectParams);
        if(SUCCESS != rc) {
            ESP_LOGE(TAG, "Error(%d) connecting to %s:%d", rc, mqttInitParams.pHostURL, mqttInitParams.port);
            vTaskDelay(1000 / portTICK_RATE_MS);
        }
    } while(SUCCESS != rc);

    /*
     * Enable Auto Reconnect functionality. Minimum and Maximum time of Exponential backoff are set in aws_iot_config.h
     *  #AWS_IOT_MQTT_MIN_RECONNECT_WAIT_INTERVAL
     *  #AWS_IOT_MQTT_MAX_RECONNECT_WAIT_INTERVAL
     */
    rc = aws_iot_mqtt_autoreconnect_set_status(&client, true);
    if(SUCCESS != rc) {
        ESP_LOGE(TAG, "Unable to set Auto Reconnect to true - %d", rc);
        abort();
    }

    const char *TOPIC_SUB = "esp32/sub/recognition";
    const int TOPIC_SUB_LEN = strlen(TOPIC_SUB);

    const char *TOPIC_PUB_ID = "esp32/pub/url";
    const int TOPIC_PUB_URL_LEN = strlen(TOPIC_PUB_ID);

    while((NETWORK_ATTEMPTING_RECONNECT == rc || NETWORK_RECONNECTED == rc || SUCCESS == rc)) {

        //Max time the yield function will wait for read messages
        //yield 함수가 읽기 메시지를 기다리는 최대 시간
        rc = aws_iot_mqtt_yield(&client, 100);
        if(NETWORK_ATTEMPTING_RECONNECT == rc) {
            // If the client is attempting to reconnect we will skip the rest of the loop.
            // 클라이언트가 재 연결을 시도하면 나머지 루프를 건너 뜁니다.
            continue;
        }
        sprintf(cPayload, "{\"id\": \"%s\"}",  HelmetID);
        paramsQOS0.qos = QOS0;
        paramsQOS0.payload = (void *) cPayload;
        paramsQOS0.isRetained = 0;
        paramsQOS0.payloadLen = strlen(cPayload);

        rc = aws_iot_mqtt_publish(&client, TOPIC_PUB_ID, TOPIC_PUB_URL_LEN, &paramsQOS0);
        if (rc == MQTT_REQUEST_TIMEOUT_ERROR) {
            ESP_LOGW(TAG, "QOS0 publish ack not received.");
            rc = SUCCESS;
        }

        ESP_LOGI(TAG, "Subscribing...");
        rc = aws_iot_mqtt_subscribe(&client, TOPIC_SUB, TOPIC_SUB_LEN, QOS0, subscribe_callback_handler, NULL);
        if(SUCCESS != rc) {
            ESP_LOGE(TAG, "Error subscribing : %d ", rc);
            abort();
        }
        vTaskDelay(5000 / portTICK_RATE_MS);
    }

    ESP_LOGE(TAG, "An error occurred in the main loop.");
    abort();
}

void subscribe_callback_handler(AWS_IoT_Client *pClient, char *topicName, uint16_t topicNameLen,
                                    IoT_Publish_Message_Params *params, void *pData) {
    ESP_LOGE(TAG, "Subscribe callback");
    char* r_topicName = malloc (sizeof(char) * topicNameLen+1);
    strlcpy(r_topicName, topicName, topicNameLen+1);

    char* r_payload = malloc (sizeof(char) * (int) params->payloadLen+1);
    strlcpy(r_payload, (char *)params->payload, (int) params->payloadLen+1);

    if (strcmp(r_topicName, "esp32/sub/recognition") == 0) {
        int i=0;
        char* rekog = malloc(10 * sizeof(char));
        strlcpy( rekog, r_payload, strlen(r_payload+1) ); //SUCCESS || FAIL
        ESP_LOGE( TAG, "[SUB]리턴결과: %s", rekog );
        
        char* det = strchr(rekog, 'S');
        if( det != NULL) {
            
            
        }
            while( det == NULL ){
                if(i==4){ //4번 다 실패하면 프로그램 종료 (reset 눌러야 시작됨)
                    ESP_LOGE(TAG, "[EXIT_F]프로그램을 종료합니다");
                    esp_deep_sleep_start();
                } 
                i++;
                ESP_LOGE(TAG, "[FAIL]%d번째", i); //대략 5~6초에 한 번씩 업로딩됨.
                upload_image_to_s3(S3_URL, HelmetID);
            } //while
        // } //else
    }//IF esp32/sub/recognition
}

/**
 * Description: 메인 함수
 * */
void app_main()
{
    static httpd_handle_t server = NULL;

    // Initialize NVS.
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    ESP_ERROR_CHECK( err );

    init_app();
    init_wifi();

    esp32_camera_init();

    //xTaskCreate(): 새로운 태스크를 만들어 태스크 리스트에 추가하는 함수 (태스크가 구현된 함수 이름, 태스크 이름 부제목, 태스크의 스택에게 할당해 줄 WORD의 수(바이트X), 인수로 전달될 값, 실행우선순위, 핸들 전달)
    xTaskCreate(&aws_mqtt_task, "aws_mqtt_task", 18432, NULL, 1, NULL);

    // Enable webserver to check the stream. Just open the http://your-esp32-cam-ip-address/ in the browser.
    // 웹 서버를 활성화하면 동영상 스트림 확인 가능(http:// your-esp32-cam-ip-address)
    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &connect_handler, &server));
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, WIFI_EVENT_STA_DISCONNECTED, &disconnect_handler, &server));

    server = start_webserver();
}
