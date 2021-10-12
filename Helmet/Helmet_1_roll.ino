/*
  AWS IoT WiFi

  This sketch securely connects to an AWS IoT using MQTT over WiFi.
  It uses a private key stored in the ATECC508A and a public
  certificate for SSL/TLS authetication.

  It publishes a message every 5 seconds to arduino/outgoing
  topic and subscribes to messages on the arduino/incoming
  topic.

  The circuit:
  - Arduino MKR WiFi 1010 or MKR1000

  The following tutorial on Arduino Project Hub can be used
  to setup your AWS account and the MKR board:

  https://create.arduino.cc/projecthub/132016/securely-connecting-an-arduino-mkr-wifi-1010-to-aws-iot-core-a9f365

  This example code is in the public domain.
*/

#include <ArduinoBearSSL.h>
#include <ArduinoECCX08.h>
#include <ArduinoMqttClient.h>
#include <WiFiNINA.h> // change to #include <WiFi101.h> for MKR1000

#include <Arduino_LSM6DS3.h>

#include "arduino_secrets.h"

#include "DHT.h"
#define DHTPIN A6     // Digital pin connected to the DHT sensor
#define DHTTYPE DHT11   // DHT 11
DHT dht(DHTPIN, DHTTYPE);

// MQ-4 , MQ-7 + 근접센서
int Mq_4 = A2;   // MQ-4 가스센서 입력을 위한 아날로그 핀
int Mq_7 = A3;   // MQ-7 가스센서 입력을 위한 아날로그 핀

//위험 수치
#define mq4_d 500
#define mq7_d 500
#define t_d 30
#define h_d 80

int speaker = 2;  //스피커 

#include <ArduinoJson.h>

//beacon
#include <ArduinoBLE.h>

/////// Enter your sensitive data in arduino_secrets.h
const char ssid[]        = SECRET_SSID;
const char pass[]        = SECRET_PASS;
const char broker[]      = SECRET_BROKER;
const char* certificate  = SECRET_CERTIFICATE;

WiFiClient    wifiClient;            // Used for the TCP socket connection
BearSSLClient sslClient(wifiClient); // Used for SSL/TLS connection, integrates with ECC508
MqttClient    mqttClient(sslClient);

unsigned long lastMillis = 0;
unsigned long bleMillis = 0;
unsigned long checkMillis = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial);

  if (!IMU.begin()) { //LSM6DS3센서 시작
    Serial.println("LSM6DS3센서 오류!");
    while (1);
  }

  pinMode(Mq_4 ,INPUT);   // 아날로그 핀 A2를 입력모드로 설정
  pinMode(Mq_7 ,INPUT);   // 아날로그 핀 A3를 입력모드로 설정
  pinMode(7, INPUT);     // 근접센서1
  pinMode(8, INPUT);     // 근접센서2
  pinMode(2, OUTPUT);     //스피커

  dht.begin(); 
  if (!ECCX08.begin()) {
    Serial.println("No ECCX08 present!");
    while (1);
  }

  // Set a callback to get the current time
  // used to validate the servers certificate
  ArduinoBearSSL.onGetTime(getTime);

  // Set the ECCX08 slot to use for the private key
  // and the accompanying public certificate for it
  sslClient.setEccSlot(0, certificate);

  // Optional, set the client id used for MQTT,
  // each device that is connected to the broker
  // must have a unique client id. The MQTTClient will generate
  // a client id for you based on the millis() value if not set
  //
  // mqttClient.setId("clientId");

  // Set the message callback, this function is
  // called when the MQTTClient receives a message
  mqttClient.onMessage(onMessageReceived);

  //beacon
  BLE_scan_setup();
}

String bleName = "";
char ble[100] = "None";

int search_ble_value = 10000*6*3;  //시간
int mqtt_send_time = 5000;  //5초
int ble_count = 0;

void Search_BLE() {
  //정해진 시간 동안 비콘 스캔
  while( millis() - bleMillis < mqtt_send_time) {
    BLEDevice peripheral = BLE.available();    

    if (peripheral) {
      //인식된 비콘 값 중 정해진 구역 값만 가져옴 
      if (peripheral.localName() == "En" || peripheral.localName() == "A1" || peripheral.localName() == "A2" || peripheral.localName() == "A3" || peripheral.localName() == "A4") {
        Serial.println("Discovered a peripheral");
        Serial.println("-----------------------");

        // print address
        Serial.print("localName: ");
        bleName = peripheral.localName();
        Serial.println(bleName);

        if(bleName == "En")
          bleName = "Enter";
        
        int bleLen = bleName.length();
        bleName.toCharArray(ble, bleLen+1);
        Serial.print("ble");
        Serial.println(ble);
    
        break;
      }
    }
  }
}

void MQTT() {
  if (millis() - lastMillis > 5000) {
    lastMillis = millis();
    
    char payload[512];
    getDeviceStatus(payload);
    sendMessage(payload);
  }
}

void BLE_scan_setup() {
  //beacon 스캔 시작
  if (!BLE.begin()) {
    Serial.println("starting BLE failed!");
    while (1);
  }
  Serial.println("BLE Central scan");

  BLE.scan();
}

void loop() {
  bleMillis = millis();
  checkMillis = millis();

  //비콘 수정 추가
  //connectMQTT();
  //mqtt.loop();

  BLE.scan();
  //beacon  
  Search_BLE();
  
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!mqttClient.connected()) {
    // MQTT client is disconnected, connect
    connectMQTT();
  }

  // poll for new MQTT messages and send keep alives
  mqttClient.poll();

  // publish a message roughly every 5 seconds.
  if (millis() - lastMillis > 5000) {
    lastMillis = millis();
    char payload[512];
    getDeviceStatus(payload);
    sendMessage(payload);
  }

  Search_BLE();
}

unsigned long getTime() {
  // get the current time from the WiFi module  
  return WiFi.getTime();
}

void connectWiFi() {
  Serial.print("Attempting to connect to SSID: ");
  Serial.print(ssid);
  Serial.print(" ");

  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    // failed, retry
    Serial.print(".");
    delay(5000);
  }
  Serial.println();

  Serial.println("You're connected to the network");
  Serial.println();
}

void connectMQTT() {
  Serial.print("Attempting to MQTT broker: ");
  Serial.print(broker);
  Serial.println(" ");

  while (!mqttClient.connect(broker, 8883)) {
    // failed, retry
    Serial.print(".");
    delay(5000);
  }
  Serial.println();

  Serial.println("You're connected to the MQTT broker");
  Serial.println();

  // subscribe to a topic
  mqttClient.subscribe("$aws/things/Helmet001/shadow/update/delta");
}

float acc_x, acc_y, acc_z;
float acc_pit, acc_roll;

void getDeviceStatus(char* payload) {

  float t = dht.readTemperature();
  int h = dht.readHumidity();
  int Mq4 = analogRead(Mq_4); 
  int Mq7 = analogRead(Mq_7);
  int danger = 0;

  //가속도센서
  if (IMU.accelerationAvailable()) {
    IMU.readAcceleration(acc_x, acc_y, acc_z);
    
  //각도 계산
    acc_pit = RAD_TO_DEG * atan(acc_x / sqrt(acc_y*acc_y + acc_z*acc_z)); //라디안을 각도로
    acc_roll = RAD_TO_DEG * atan(acc_y / sqrt(acc_x*acc_x + acc_z*acc_z));//180/PI = 57.27755
  }

  String matter_str = "";  
  char matter[500];   

  Search_BLE();

  //근접
  if(digitalRead(7)==0 && digitalRead(8)==0) {
    Serial.println("착용");  

    if(Mq4 > mq4_d || Mq7 > mq7_d || t > t_d || h > h_d || acc_roll < 20 ) {
     Serial.println("위험상황");
     //danger = -1;

     if(Mq4 > mq4_d) {
        matter_str += "MQ4*";
     }
     if(Mq7 > mq7_d) {
      matter_str += "Mq7*";
     }
     if(t > t_d) {
      matter_str += "temp*";
     }
     if(h > h_d) {
      matter_str += "humi*";
     }
     if(acc_roll < 20) {
      matter_str += "fall*";
     }
     int len = matter_str.length();
     matter_str.toCharArray(matter, len+1);
     
     sprintf(payload,"{\"state\":{\"reported\":{\"temperature\":\"%0.2f\",\"humidity\":\"%d\",\"Mq4\":\"%d\",\"Mq7\":\"%d\",\"acc_roll\":\"%0.2f\",\"workSection\":\"%s\",\"danger\":\"%s\"}}}",t,h,Mq4,Mq7,acc_roll,ble,matter);  
     danger_speaker();
    }
    else {
      danger = 0;
      sprintf(payload,"{\"state\":{\"reported\":{\"temperature\":\"%0.2f\",\"humidity\":\"%d\",\"Mq4\":\"%d\",\"Mq7\":\"%d\",\"acc_roll\":\"%0.2f\",\"workSection\":\"%s\",\"danger\":\"%d\"}}}",t,h,Mq4,Mq7,acc_roll,ble,danger); 
    }
  }

  //미착용
  else {
    Serial.println("미착용");
    String WearOrNot = "NoWear";
    char WON[50];
    int Wlen = WearOrNot.length();
    WearOrNot.toCharArray(WON, Wlen+1);
    sprintf(payload,"{\"state\":{\"reported\":{\"WearOrNot\":\"%s\"}}}",WON); 
  }
}

void danger_speaker(){
  tone(2,500);
  delay(500);
  tone(2,250);
  delay(500);
  noTone(2);
  delay(500);
}


void sendMessage(char* payload) {
  char TOPIC_NAME[]= "$aws/things/Helmet001/shadow/update";
  
  Serial.print("Publishing send message:");
  Serial.println(payload);
  mqttClient.beginMessage(TOPIC_NAME);
  mqttClient.print(payload);
  mqttClient.endMessage();
}


void onMessageReceived(int messageSize) {
  // we received a message, print out the topic and contents
  Serial.print("Received a message with topic '");
  Serial.print(mqttClient.messageTopic());
  Serial.print("', length ");
  Serial.print(messageSize);
  Serial.println(" bytes:");

  // store the message received to the buffer
  char buffer[512] ;
  int count=0;
  while (mqttClient.available()) {
     buffer[count++] = (char)mqttClient.read();
  }
  buffer[count]='\0'; // 버퍼의 마지막에 null 캐릭터 삽입
  Serial.println(buffer);
  Serial.println();

  DynamicJsonDocument doc(1024);
  deserializeJson(doc, buffer);
  JsonObject root = doc.as<JsonObject>();
  JsonObject state = root["state"];
  
  char payload[512];
}
