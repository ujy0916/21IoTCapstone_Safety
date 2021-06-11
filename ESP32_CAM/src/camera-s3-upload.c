#include <string.h>
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"

#include "lwip/err.h"
#include "lwip/sockets.h"
#include "lwip/sys.h"
#include "lwip/netdb.h"
#include "lwip/dns.h"
#include "esp_camera.h"

#include "camera-config.h"

esp_err_t upload_image_to_s3(char *S3_URL, char *filename)
{
    camera_fb_t * fb = NULL;
    fb = esp_camera_fb_get(); //카메라 프레임 캡쳐 가져오기
    if (!fb) {
        ESP_LOGE(TAG, "Camera capture failed");
        return ESP_FAIL;
    }

    if(fb->format != PIXFORMAT_JPEG){
        ESP_LOGE(TAG, "Non jpeg format");
        return ESP_FAIL;
    } 

    char s3Request[2048]= {0};
    sleep(3); //3초 대기
    /*
    HTTP PUT 요청 형식
     PUT /{Filename} HTTP/1.1
     Host: {Bucketname}.s3.{Region}.amazonaws.com
     x-amz-acl: bucket-owner-full-control //객체 적용할 ACL(Acces Control List), bucket_owner-full-control은 업로딩하는 객체를 자동으로 버킷 소유자가 소유하게 해주는 것(람다함수를 통한 S3 접근에 용이)
     Content-Type: text/plain
     Content-Length: {fb->len, 사진데이터 길이}
    */    
    
    sprintf(s3Request,"PUT /Helmet/%s.jpg HTTP/1.1\r\nHost: %s\r\nx-amz-acl: bucket-owner-full-control\r\nContent-Type: text/plain\r\nContent-Length: %d\r\n\r\n", filename, S3_URL, fb->len);
    //ESP_LOGE(TAG, "[S3]Request: %s", s3Request);
    

    esp_camera_fb_return(fb);

    const struct addrinfo hints = {
        .ai_family = AF_INET,
        .ai_socktype = SOCK_STREAM,
    };
    struct addrinfo *res;
    struct in_addr *addr;
    int s/*, r */;

    int err = getaddrinfo(S3_URL, "80", &hints, &res);

    if(err != 0 || res == NULL) {
        ESP_LOGE(TAG, "DNS lookup failed err=%d res=%p", err, res);
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }

    /* Code to print the resolved IP.
    확인된 IP를 인쇄하기 위한 코드
    Note: inet_ntoa is non-reentrant, look at ipaddr_ntoa_r for "real" code */

    addr = &((struct sockaddr_in *)res->ai_addr)->sin_addr;
    ESP_LOGI(TAG, "DNS lookup succeeded. IP=%s", inet_ntoa(*addr));

    s = socket(res->ai_family, res->ai_socktype, 0);
    if(s < 0) {
        ESP_LOGE(TAG, "... Failed to allocate socket.");
        freeaddrinfo(res);
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
    ESP_LOGI(TAG, "... allocated socket");

    if(connect(s, res->ai_addr, res->ai_addrlen) != 0) {
        ESP_LOGE(TAG, "... socket connect failed errno=%d", errno);
        close(s);
        freeaddrinfo(res);
        vTaskDelay(4000 / portTICK_PERIOD_MS);
    }

    ESP_LOGI(TAG, "... connected");
    freeaddrinfo(res);

    if (write(s, s3Request, strlen(s3Request)) < 0) {
        close(s);
        vTaskDelay(4000 / portTICK_PERIOD_MS);
        ESP_LOGE(TAG, "... socket send failed #1");
    }
    
    if (write(s, (const char *)fb->buf, fb->len) < 0) {
        ESP_LOGE(TAG, "... socket send failed #2");
        close(s);
    }
    
    char *footer = "\r\n";
    if (write(s, footer, strlen(footer)) < 0) {
        ESP_LOGE(TAG, "... socket send failed #3");
        close(s);
        vTaskDelay(4000 / portTICK_PERIOD_MS);
    }

    ESP_LOGI(TAG, "... socket send success");

    struct timeval receiving_timeout;
    receiving_timeout.tv_sec = 5;
    receiving_timeout.tv_usec = 0;
    if (setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, &receiving_timeout,
            sizeof(receiving_timeout)) < 0) {
        ESP_LOGE(TAG, "... failed to set socket receiving timeout");
        close(s);
        vTaskDelay(4000 / portTICK_PERIOD_MS);
    }
    ESP_LOGI(TAG, "... set socket receiving timeout success");

    close(s);

    return ESP_OK;
}


//      <<fb 구조>>
//     typedef struct {
//     uint8_t * buf;       // Pointer to the pixel data - 픽셀 데이터 포인터
//     size_t len;          // Length of the buffer in bytes  - 버퍼 길이(바이트)
//     size_t width;        // Width of the buffer in pixels  - 버퍼 너비(픽셀)
//     size_t height;       // Height of the buffer in pixels  - 버퍼 높이(픽셀)
//     pixformat_t format;  // Format of the pixel data  - 픽셀 데이터 형태
// } camera_fb_t;