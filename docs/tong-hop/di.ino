/*
============================================================
                    FRUITTRACE ESP32
============================================================

DHT22 DATA  -> GPIO 14

LED DO      -> GPIO 25
LED XANH    -> GPIO 26
LED VANG    -> GPIO 32

BUZZER      -> GPIO 27

Trang thai:
> 50%       -> XANH
20% - 50%   -> VANG
< 20%       -> DO + BUZZER 3 tieng

ESP32
   |
   | HTTPS REST API
   v
Firebase Realtime Database
   |
   v
FruitTrace App

============================================================
*/


#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#include <DHT.h>
#include <ArduinoJson.h>

#include <time.h>
#include <math.h>
#include <stdint.h>


// ============================================================
// 1. WIFI
// ============================================================

const char* WIFI_SSID = "Nhom13";

const char* WIFI_PASSWORD = "123456789";


// ============================================================
// 2. FIREBASE
// ============================================================

// KHONG de dau / o cuoi URL

const char* FIREBASE_URL =
"https://fruit-management-system-a2e62-default-rtdb.asia-southeast1.firebasedatabase.app";


// Database Secret
// Sau khi demo nen rotate secret nay.

const char* DATABASE_SECRET =
"ZK80pPGtCTiwXqimy4HJfFOTEMUS4HUidHGgqgrS";


// UID tai khoan dai ly

const char* RETAILER_UID =
"7SJfz1zsm0NaUT0pue7p4MjQSLC2";


// Station

const char* STATION_ID =
"station-001";

const char* STATION_NAME =
"Kho demo FruitTrace";


// ============================================================
// 3. DEMO MODE
// ============================================================

// true:
// Firebase cap nhat 30 giay / lan
//
// false:
// Firebase cap nhat 15 phut / lan

const bool DEMO_MODE = true;


// ============================================================
// 4. DHT22
// ============================================================

#define DHT_PIN 14
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);


// ============================================================
// 5. LED
// ============================================================

#define LED_RED_PIN     25
#define LED_GREEN_PIN   26
#define LED_YELLOW_PIN  32


// HIGH = LED sang

const bool LED_ACTIVE_HIGH = true;


// ============================================================
// 6. BUZZER
// ============================================================

#define BUZZER_PIN 27

const bool BUZZER_ACTIVE_HIGH = true;


// ============================================================
// 7. CHU KY HOAT DONG
// ============================================================

// Doc DHT22 moi 30 giay

const unsigned long SENSOR_INTERVAL =
30000UL;


// Demo Firebase moi 30 giay

const unsigned long DEMO_FIREBASE_INTERVAL =
30000UL;


// Binh thuong Firebase moi 15 phut

const unsigned long NORMAL_FIREBASE_INTERVAL =
15UL * 60UL * 1000UL;


const unsigned long FIREBASE_INTERVAL =
DEMO_MODE
? DEMO_FIREBASE_INTERVAL
: NORMAL_FIREBASE_INTERVAL;


unsigned long lastSensorRead = 0;

unsigned long lastFirebaseUpdate = 0;


// ============================================================
// 8. BO DEM TRUNG BINH
// ============================================================

const int MAX_SAMPLES = 30;

float tempSamples[MAX_SAMPLES];

float humidSamples[MAX_SAMPLES];

int sampleIndex = 0;

int sampleCount = 0;


// ============================================================
// 9. TRANG THAI KHO
// ============================================================

enum StorageLevel
{
  LEVEL_NONE,

  LEVEL_GREEN,

  LEVEL_YELLOW,

  LEVEL_RED
};


StorageLevel currentLevel =
LEVEL_NONE;


// ============================================================
// 10. DIEU KHIEN LED
// ============================================================

void writeLED(
  int pin,
  bool state
)
{
  if (LED_ACTIVE_HIGH)
  {
    digitalWrite(
      pin,

      state
      ? HIGH
      : LOW
    );
  }
  else
  {
    digitalWrite(
      pin,

      state
      ? LOW
      : HIGH
    );
  }
}


// ============================================================
// TAT TAT CA LED
// ============================================================

void allLEDOff()
{
  writeLED(
    LED_RED_PIN,
    false
  );

  writeLED(
    LED_GREEN_PIN,
    false
  );

  writeLED(
    LED_YELLOW_PIN,
    false
  );
}


// ============================================================
// XANH
// ============================================================

void ledGreen()
{
  allLEDOff();

  writeLED(
    LED_GREEN_PIN,
    true
  );
}


// ============================================================
// VANG
// ============================================================

void ledYellow()
{
  allLEDOff();

  writeLED(
    LED_YELLOW_PIN,
    true
  );
}


// ============================================================
// DO
// ============================================================

void ledRed()
{
  allLEDOff();

  writeLED(
    LED_RED_PIN,
    true
  );
}


// ============================================================
// 11. BUZZER
// ============================================================

void writeBuzzer(
  bool state
)
{
  if (BUZZER_ACTIVE_HIGH)
  {
    digitalWrite(
      BUZZER_PIN,

      state
      ? HIGH
      : LOW
    );
  }
  else
  {
    digitalWrite(
      BUZZER_PIN,

      state
      ? LOW
      : HIGH
    );
  }
}


// ============================================================
// BUZZER 3 TIENG
// ============================================================

void beepThreeTimes()
{
  for (
    int i = 0;
    i < 3;
    i++
  )
  {
    writeBuzzer(true);

    delay(250);

    writeBuzzer(false);

    delay(250);
  }
}


// ============================================================
// 12. TEST LED KHI KHOI DONG
// ============================================================

void testLED()
{
  Serial.println();

  Serial.println(
    "TEST LED..."
  );


  Serial.println(
    "XANH GPIO26"
  );

  ledGreen();

  delay(700);


  Serial.println(
    "VANG GPIO32"
  );

  ledYellow();

  delay(700);


  Serial.println(
    "DO GPIO25"
  );

  ledRed();

  delay(700);


  allLEDOff();


  Serial.println(
    "TEST LED XONG."
  );
}


// ============================================================
// 13. WIFI
// ============================================================

void connectWiFi()
{
  if (
    WiFi.status() ==
    WL_CONNECTED
  )
  {
    return;
  }


  Serial.println();

  Serial.println(
    "===================================="
  );

  Serial.print(
    "Dang ket noi WiFi: "
  );

  Serial.println(
    WIFI_SSID
  );


  WiFi.mode(
    WIFI_STA
  );


  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );


  int retry = 0;


  while (
    WiFi.status() !=
    WL_CONNECTED
  )
  {
    delay(500);

    Serial.print(".");


    retry++;


    if (retry >= 40)
    {
      Serial.println();

      Serial.println(
        "WiFi chua ket noi. Thu lai..."
      );


      WiFi.disconnect();

      delay(1000);


      WiFi.begin(
        WIFI_SSID,
        WIFI_PASSWORD
      );


      retry = 0;
    }
  }


  Serial.println();

  Serial.println(
    "WiFi CONNECTED!"
  );


  Serial.print(
    "IP ESP32: "
  );

  Serial.println(
    WiFi.localIP()
  );


  Serial.println(
    "===================================="
  );
}


// ============================================================
// 14. NTP
// ============================================================

void syncNTP()
{
  Serial.println();

  Serial.println(
    "Dang dong bo NTP..."
  );


  configTime(
    7 * 3600,

    0,

    "pool.ntp.org",

    "time.google.com",

    "time.cloudflare.com"
  );


  time_t now =
  time(nullptr);


  int retry = 0;


  while (
    now < 1700000000 &&
    retry < 40
  )
  {
    delay(500);

    Serial.print(".");


    now =
    time(nullptr);


    retry++;
  }


  Serial.println();


  if (
    now >=
    1700000000
  )
  {
    Serial.println(
      "NTP OK!"
    );
  }
  else
  {
    Serial.println(
      "NTP FAILED!"
    );
  }
}


// ============================================================
// 15. KIEM TRA THOI GIAN
// ============================================================

bool timeValid()
{
  return (
    time(nullptr) >
    1700000000
  );
}


// ============================================================
// 16. TAO ISO UTC
// ============================================================
//
// Vi du:
//
// 2026-09-13T06:30:00.000Z
//

String getISOTime()
{
  if (!timeValid())
  {
    syncNTP();
  }


  time_t now =
  time(nullptr);


  struct tm tmUTC;


  // BAT BUOC UTC

  gmtime_r(
    &now,
    &tmUTC
  );


  char buffer[32];


  strftime(
    buffer,

    sizeof(buffer),

    "%Y-%m-%dT%H:%M:%S.000Z",

    &tmUTC
  );


  return String(
    buffer
  );
}


// ============================================================
// 17. HAM THAY THE timegm()
// ============================================================
//
// Tinh so ngay tu 01/01/1970
//
// Khong dung timegm()
// nen tranh loi compile ESP32 Core.
//

int64_t daysFromCivil(
  int year,

  unsigned month,

  unsigned day
)
{
  year -=
  month <= 2;


  const int era =
  (
    year >= 0
    ? year
    : year - 399
  ) / 400;


  const unsigned yoe =
  (unsigned)(
    year -
    era * 400
  );


  const unsigned doy =
  (
    153 *
    (
      month +
      (
        month > 2
        ? -3
        : 9
      )
    )
    +
    2
  ) / 5
  +
  day
  -
  1;


  const unsigned doe =
  yoe * 365
  +
  yoe / 4
  -
  yoe / 100
  +
  doy;


  return
  (int64_t)era * 146097
  +
  (int64_t)doe
  -
  719468;
}


// ============================================================
// 18. ISO 8601 -> UNIX TIMESTAMP
// ============================================================
//
// KHONG SU DUNG timegm()
//
// VD:
// 2026-09-13T06:30:00.000Z
//

bool isoToEpoch(
  const char* iso,

  time_t& epoch
)
{
  if (
    iso ==
    nullptr
  )
  {
    return false;
  }


  int year;

  int month;

  int day;

  int hour;

  int minute;

  int second;


  int parsed =
  sscanf(
    iso,

    "%d-%d-%dT%d:%d:%d",

    &year,

    &month,

    &day,

    &hour,

    &minute,

    &second
  );


  if (
    parsed != 6
  )
  {
    return false;
  }


  int64_t days =
  daysFromCivil(
    year,

    (unsigned)month,

    (unsigned)day
  );


  int64_t seconds =
  days * 86400LL

  +

  (int64_t)hour * 3600LL

  +

  (int64_t)minute * 60LL

  +

  second;


  epoch =
  (time_t)seconds;


  return true;
}


// ============================================================
// 19. DOC DHT22
// ============================================================

void readDHT22()
{
  float temperature =
  dht.readTemperature();


  float humidity =
  dht.readHumidity();


  if (
    isnan(temperature) ||

    isnan(humidity)
  )
  {
    Serial.println();

    Serial.println(
      "LOI DHT22: Khong doc duoc cam bien!"
    );

    return;
  }


  if (
    temperature < -10 ||

    temperature > 60
  )
  {
    Serial.println(
      "Nhiet do khong hop le!"
    );

    return;
  }


  if (
    humidity < 0 ||

    humidity > 100
  )
  {
    Serial.println(
      "Do am khong hop le!"
    );

    return;
  }


  tempSamples[
    sampleIndex
  ] =
  temperature;


  humidSamples[
    sampleIndex
  ] =
  humidity;


  sampleIndex++;


  if (
    sampleIndex >=
    MAX_SAMPLES
  )
  {
    sampleIndex = 0;
  }


  if (
    sampleCount <
    MAX_SAMPLES
  )
  {
    sampleCount++;
  }


  Serial.println();

  Serial.print(
    "DHT22 | Temp = "
  );


  Serial.print(
    temperature,
    1
  );


  Serial.print(
    " C | Humid = "
  );


  Serial.print(
    humidity,
    1
  );


  Serial.println(
    " %"
  );
}


// ============================================================
// 20. TRUNG BINH TEMP
// ============================================================

float getAverageTemperature()
{
  if (
    sampleCount == 0
  )
  {
    return NAN;
  }


  float sum = 0;


  for (
    int i = 0;
    i < sampleCount;
    i++
  )
  {
    sum +=
    tempSamples[i];
  }


  return
  sum /
  sampleCount;
}


// ============================================================
// 21. TRUNG BINH HUMID
// ============================================================

float getAverageHumidity()
{
  if (
    sampleCount == 0
  )
  {
    return NAN;
  }


  float sum = 0;


  for (
    int i = 0;
    i < sampleCount;
    i++
  )
  {
    sum +=
    humidSamples[i];
  }


  return
  sum /
  sampleCount;
}


// ============================================================
// 22. TAO FIREBASE URL
// ============================================================

String createFirebaseURL(
  String path,

  String query = ""
)
{
  String url =
  String(
    FIREBASE_URL
  );


  if (
    path.length() == 0 ||

    path == "/"
  )
  {
    url +=
    "/.json";
  }
  else
  {
    if (
      !path.startsWith("/")
    )
    {
      url += "/";
    }


    url +=
    path;


    url +=
    ".json";
  }


  url +=
  "?auth=";


  url +=
  DATABASE_SECRET;


  if (
    query.length() >
    0
  )
  {
    url += "&";

    url += query;
  }


  return url;
}


// ============================================================
// 23. FIREBASE GET
// ============================================================

bool firebaseGET(
  const String& path,

  String& response,

  const String& query = ""
)
{
  connectWiFi();


  WiFiClientSecure client;


  client.setInsecure();


  HTTPClient https;


  String url =
  createFirebaseURL(
    path,
    query
  );


  if (
    !https.begin(
      client,
      url
    )
  )
  {
    Serial.println(
      "HTTPS GET begin FAILED!"
    );

    return false;
  }


  https.setTimeout(
    15000
  );


  int httpCode =
  https.GET();


  Serial.print(
    "Firebase GET HTTP: "
  );


  Serial.println(
    httpCode
  );


  if (
    httpCode > 0
  )
  {
    response =
    https.getString();


    if (
      httpCode != 200
    )
    {
      Serial.print(
        "GET RESPONSE: "
      );

      Serial.println(
        response
      );
    }
  }


  https.end();


  return (
    httpCode ==
    200
  );
}


// ============================================================
// 24. FIREBASE PATCH
// ============================================================

bool firebasePATCH(
  const String& path,

  const String& json
)
{
  connectWiFi();


  WiFiClientSecure client;


  client.setInsecure();


  HTTPClient https;


  String url =
  createFirebaseURL(
    path
  );


  if (
    !https.begin(
      client,
      url
    )
  )
  {
    Serial.println(
      "HTTPS PATCH begin FAILED!"
    );

    return false;
  }


  https.setTimeout(
    15000
  );


  https.addHeader(
    "Content-Type",

    "application/json"
  );


  int httpCode =
  https.sendRequest(
    "PATCH",

    json
  );


  Serial.print(
    "Firebase PATCH HTTP: "
  );


  Serial.println(
    httpCode
  );


  if (
    httpCode > 0
  )
  {
    String response =
    https.getString();


    if (
      httpCode != 200 &&

      httpCode != 204
    )
    {
      Serial.print(
        "PATCH RESPONSE: "
      );

      Serial.println(
        response
      );
    }
  }


  https.end();


  return (
    httpCode == 200 ||

    httpCode == 204
  );
}


// ============================================================
// 25. TAO STATION
// ============================================================

void ensureStation()
{
  JsonDocument doc;


  doc[
    "retailerId"
  ] =
  RETAILER_UID;


  doc[
    "name"
  ] =
  STATION_NAME;


  String json;


  serializeJson(
    doc,
    json
  );


  String path =
  String(
    "stations/"
  )
  +
  STATION_ID;


  Serial.println();

  Serial.println(
    "Tao/cap nhat station..."
  );


  if (
    firebasePATCH(
      path,
      json
    )
  )
  {
    Serial.println(
      "STATION METADATA OK."
    );
  }
  else
  {
    Serial.println(
      "STATION METADATA FAILED."
    );
  }
}


// ============================================================
// 26. GUI SENSOR LEN FIREBASE
// ============================================================

bool updateStationSensor(
  float temperature,

  float humidity
)
{
  JsonDocument doc;


  doc[
    "temp"
  ] =
  round(
    temperature *
    10.0
  ) / 10.0;


  doc[
    "humid"
  ] =
  round(
    humidity *
    10.0
  ) / 10.0;


  doc[
    "updatedAt"
  ] =
  getISOTime();


  String json;


  serializeJson(
    doc,
    json
  );


  Serial.println();

  Serial.println(
    "GUI SENSOR LEN FIREBASE:"
  );


  Serial.println(
    json
  );


  String path =
  String(
    "stations/"
  )
  +
  STATION_ID;


  return
  firebasePATCH(
    path,
    json
  );
}


// ============================================================
// 27. Q10
// ============================================================
//
// k = 2 ^ ((T - 25) / 10)
//

float calculateQ10(
  float temperature
)
{
  return
  pow(
    2.0,

    (
      temperature -
      25.0
    ) / 10.0
  );
}


// ============================================================
// 28. DIEU KHIEN LED THEO % CON LAI
// ============================================================

void updateStorageIndicator(
  float remainingRatio
)
{
  // Khong co lo

  if (
    remainingRatio <
    0
  )
  {
    allLEDOff();


    writeBuzzer(
      false
    );


    currentLevel =
    LEVEL_NONE;


    Serial.println(
      "KHONG CO LO -> TAT LED"
    );


    return;
  }


  StorageLevel newLevel;


// ==========================================================
// > 50% -> XANH GPIO26
// ==========================================================

  if (
    remainingRatio >
    0.50
  )
  {
    newLevel =
    LEVEL_GREEN;
  }


// ==========================================================
// 20 - 50% -> VANG GPIO32
// ==========================================================

  else if (
    remainingRatio >=
    0.20
  )
  {
    newLevel =
    LEVEL_YELLOW;
  }


// ==========================================================
// < 20% -> DO GPIO25
// ==========================================================

  else
  {
    newLevel =
    LEVEL_RED;
  }


  switch (
    newLevel
  )
  {
    case LEVEL_GREEN:

      ledGreen();


      Serial.println(
        "============================"
      );

      Serial.println(
        "TRANG THAI: XANH"
      );

      Serial.println(
        "GPIO26 = ON"
      );

      Serial.println(
        "============================"
      );

      break;


    case LEVEL_YELLOW:

      ledYellow();


      Serial.println(
        "============================"
      );

      Serial.println(
        "TRANG THAI: VANG"
      );

      Serial.println(
        "GPIO32 = ON"
      );

      Serial.println(
        "============================"
      );

      break;


    case LEVEL_RED:

      ledRed();


      Serial.println(
        "============================"
      );

      Serial.println(
        "TRANG THAI: DO"
      );

      Serial.println(
        "GPIO25 = ON"
      );

      Serial.println(
        "============================"
      );

      break;


    default:

      allLEDOff();

      break;
  }


// ==========================================================
// BUZZER CHI KEU KHI VUA CHUYEN SANG DO
// ==========================================================

  if (
    newLevel ==
    LEVEL_RED &&

    currentLevel !=
    LEVEL_RED
  )
  {
    Serial.println(
      "BUZZER: BEEP BEEP BEEP"
    );


    beepThreeTimes();
  }


  currentLevel =
  newLevel;
}


// ============================================================
// 29. DOC NHIET DO CU FIREBASE
// ============================================================

float getLastStationTemperature()
{
  String response;


  String path =
  String(
    "stations/"
  )
  +
  STATION_ID
  +
  "/temp";


  if (
    !firebaseGET(
      path,
      response
    )
  )
  {
    return NAN;
  }


  if (
    response ==
    "null" ||

    response.length() ==
    0
  )
  {
    return NAN;
  }


  return
  response.toFloat();
}


// ============================================================
// 30. DOC LOTS VA TINH consumedRatio
// ============================================================

void updateLots(
  float temperature
)
{
  Serial.println();

  Serial.println(
    "===================================="
  );

  Serial.println(
    "            UPDATE LOTS"
  );

  Serial.println(
    "===================================="
  );


// ==========================================================
// QUERY LOTS THEO currentHolderId
// ==========================================================

  String query =
  "orderBy=%22currentHolderId%22";


  query +=
  "&equalTo=%22";


  query +=
  RETAILER_UID;


  query +=
  "%22";


  String response;


  if (
    !firebaseGET(
      "lots",
      response,
      query
    )
  )
  {
    Serial.println(
      "KHONG DOC DUOC LOTS!"
    );

    return;
  }


  if (
    response ==
    "null" ||

    response ==
    "{}"
  )
  {
    Serial.println(
      "CHUA CO LO TRONG KHO."
    );


    updateStorageIndicator(
      -1
    );


    return;
  }


// ==========================================================
// PARSE JSON
// ==========================================================

  JsonDocument lotsDoc;


  DeserializationError error =
  deserializeJson(
    lotsDoc,
    response
  );


  if (error)
  {
    Serial.print(
      "JSON ERROR: "
    );


    Serial.println(
      error.c_str()
    );


    return;
  }


  JsonObject lots =
  lotsDoc.as<JsonObject>();


// ==========================================================
// MULTI-PATH PATCH
// ==========================================================

  JsonDocument patchDoc;


  JsonObject patch =
  patchDoc.to<JsonObject>();


  time_t nowEpoch =
  time(nullptr);


  String nowISO =
  getISOTime();


  float k =
  calculateQ10(
    temperature
  );


  Serial.print(
    "Nhiet do Q10 = "
  );


  Serial.print(
    temperature,
    2
  );


  Serial.println(
    " C"
  );


  Serial.print(
    "Q10 k = "
  );


  Serial.println(
    k,
    4
  );


  float minimumRemainingRatio =
  -1;


  int inStockCount =
  0;


  int updateCount =
  0;


// ==========================================================
// DUYET CAC LOT
// ==========================================================

  for (
    JsonPair item :
    lots
  )
  {
    String lotId =
    item.key().c_str();


    JsonObject lot =
    item.value()
    .as<JsonObject>();


    const char* status =
    lot[
      "status"
    ];


// ==========================================================
// CHI XU LY in_stock
// ==========================================================

    if (
      status ==
      nullptr ||

      strcmp(
        status,
        "in_stock"
      ) != 0
    )
    {
      continue;
    }


    inStockCount++;


// ==========================================================
// KIEM TRA initialShelfDays
// ==========================================================

    if (
      lot[
        "initialShelfDays"
      ].isNull()
    )
    {
      Serial.print(
        "THIEU initialShelfDays: "
      );


      Serial.println(
        lotId
      );


      continue;
    }


// ==========================================================
// KIEM TRA consumedRatio
// ==========================================================

    if (
      lot[
        "consumedRatio"
      ].isNull()
    )
    {
      Serial.print(
        "THIEU consumedRatio: "
      );


      Serial.println(
        lotId
      );


      continue;
    }


// ==========================================================
// KIEM TRA updatedAt
// ==========================================================

    const char* updatedAt =
    lot[
      "updatedAt"
    ];


    if (
      updatedAt ==
      nullptr
    )
    {
      Serial.print(
        "THIEU updatedAt: "
      );


      Serial.println(
        lotId
      );


      continue;
    }


    float initialShelfDays =
    lot[
      "initialShelfDays"
    ].as<float>();


    float oldConsumed =
    lot[
      "consumedRatio"
    ].as<float>();


    if (
      initialShelfDays <=
      0
    )
    {
      continue;
    }


// ==========================================================
// ISO -> EPOCH
// ==========================================================

    time_t previousEpoch;


    if (
      !isoToEpoch(
        updatedAt,
        previousEpoch
      )
    )
    {
      Serial.print(
        "updatedAt SAI: "
      );


      Serial.println(
        lotId
      );


      continue;
    }


// ==========================================================
// DELTA TIME
// ==========================================================

    double deltaSeconds =
    difftime(
      nowEpoch,
      previousEpoch
    );


    if (
      deltaSeconds <
      0
    )
    {
      deltaSeconds =
      0;
    }


    float deltaHours =
    deltaSeconds /
    3600.0;


// ==========================================================
// CONG THUC FRUITTRACE
//
// consumedRatio +=
//
// (deltaHours / 24)
// *
// k
// /
// initialShelfDays
// ==========================================================

    float consumedIncrease =
    (
      deltaHours /
      24.0
    )
    *
    k
    /
    initialShelfDays;


    float newConsumed =
    oldConsumed +
    consumedIncrease;


// ==========================================================
// GIOI HAN 0 -> 1
// ==========================================================

    if (
      newConsumed >
      1.0
    )
    {
      newConsumed =
      1.0;
    }


    if (
      newConsumed <
      0
    )
    {
      newConsumed =
      0;
    }


    float remainingRatio =
    1.0 -
    newConsumed;


// ==========================================================
// TIM LOT XAU NHAT
// ==========================================================

    if (
      minimumRemainingRatio <
      0 ||

      remainingRatio <
      minimumRemainingRatio
    )
    {
      minimumRemainingRatio =
      remainingRatio;
    }


// ==========================================================
// SERIAL
// ==========================================================

    Serial.println();

    Serial.print(
      "LOT: "
    );


    Serial.println(
      lotId
    );


    Serial.print(
      "Consumed cu = "
    );


    Serial.println(
      oldConsumed,
      6
    );


    Serial.print(
      "Delta hours = "
    );


    Serial.println(
      deltaHours,
      4
    );


    Serial.print(
      "Increase = "
    );


    Serial.println(
      consumedIncrease,
      6
    );


    Serial.print(
      "Consumed moi = "
    );


    Serial.println(
      newConsumed,
      6
    );


    Serial.print(
      "Con lai = "
    );


    Serial.print(
      remainingRatio *
      100.0,
      1
    );


    Serial.println(
      "%"
    );


// ==========================================================
// DEMO GHI MOI CHU KY
// ==========================================================

    bool shouldWrite =
    DEMO_MODE;


    if (!DEMO_MODE)
    {
      float oldRemainingDays =
      (
        1.0 -
        oldConsumed
      )
      *
      initialShelfDays;


      float newRemainingDays =
      remainingRatio *
      initialShelfDays;


      shouldWrite =
      fabs(
        newRemainingDays -
        oldRemainingDays
      ) >= 1.0

      ||

      newConsumed >=
      1.0;
    }


    if (
      shouldWrite
    )
    {
      String consumedPath =
      "lots/"
      +
      lotId
      +
      "/consumedRatio";


      String updatedPath =
      "lots/"
      +
      lotId
      +
      "/updatedAt";


      patch[
        consumedPath.c_str()
      ] =
      newConsumed;


      patch[
        updatedPath.c_str()
      ] =
      nowISO;


      updateCount++;
    }
  }


// ==========================================================
// LED THEO LOT XAU NHAT
// ==========================================================

  updateStorageIndicator(
    minimumRemainingRatio
  );


  Serial.println();

  Serial.print(
    "SO LO in_stock = "
  );


  Serial.println(
    inStockCount
  );


// ==========================================================
// KHONG CAN UPDATE
// ==========================================================

  if (
    updateCount ==
    0
  )
  {
    Serial.println(
      "KHONG CO LOT CAN PATCH."
    );


    return;
  }


// ==========================================================
// GUI MULTI-PATH UPDATE
// ==========================================================

  String patchJson;


  serializeJson(
    patchDoc,
    patchJson
  );


  Serial.println();

  Serial.println(
    "PATCH LOTS..."
  );


  if (
    firebasePATCH(
      "/",
      patchJson
    )
  )
  {
    Serial.println(
      "UPDATE LOTS OK!"
    );
  }
  else
  {
    Serial.println(
      "UPDATE LOTS FAILED!"
    );
  }
}


// ============================================================
// 31. DONG BO FIREBASE
// ============================================================

void syncFirebase()
{
  connectWiFi();


  if (
    !timeValid()
  )
  {
    syncNTP();
  }


  float temperature =
  getAverageTemperature();


  float humidity =
  getAverageHumidity();


  if (
    isnan(temperature) ||

    isnan(humidity)
  )
  {
    Serial.println(
      "CHUA CO DU LIEU DHT22!"
    );

    return;
  }


  Serial.println();

  Serial.println(
    "===================================="
  );

  Serial.println(
    "          FIREBASE SYNC"
  );

  Serial.println(
    "===================================="
  );


  Serial.print(
    "Temperature = "
  );


  Serial.print(
    temperature,
    2
  );


  Serial.println(
    " C"
  );


  Serial.print(
    "Humidity = "
  );


  Serial.print(
    humidity,
    2
  );


  Serial.println(
    "%"
  );


// ==========================================================
// GUI SENSOR
// ==========================================================

  if (
    updateStationSensor(
      temperature,
      humidity
    )
  )
  {
    Serial.println(
      "STATION UPDATE OK!"
    );
  }
  else
  {
    Serial.println(
      "STATION UPDATE FAILED!"
    );
  }


// ==========================================================
// UPDATE LOTS
// ==========================================================

  updateLots(
    temperature
  );
}


// ============================================================
// 32. SETUP
// ============================================================

void setup()
{
  Serial.begin(
    115200
  );


  delay(
    1000
  );


  Serial.println();

  Serial.println(
    "===================================="
  );

  Serial.println(
    "        FRUITTRACE ESP32"
  );

  Serial.println(
    "===================================="
  );


// ==========================================================
// DHT22
// ==========================================================

  dht.begin();


// ==========================================================
// LED
// ==========================================================

  pinMode(
    LED_RED_PIN,
    OUTPUT
  );


  pinMode(
    LED_GREEN_PIN,
    OUTPUT
  );


  pinMode(
    LED_YELLOW_PIN,
    OUTPUT
  );


  allLEDOff();


// ==========================================================
// BUZZER
// ==========================================================

  pinMode(
    BUZZER_PIN,
    OUTPUT
  );


  writeBuzzer(
    false
  );


// ==========================================================
// TEST LED
// ==========================================================

  testLED();


// ==========================================================
// WIFI
// ==========================================================

  connectWiFi();


// ==========================================================
// NTP
// ==========================================================

  syncNTP();


// ==========================================================
// TAO STATION
// ==========================================================

  ensureStation();


// ==========================================================
// BU THOI GIAN SAU RESTART
// ==========================================================

  float lastTemperature =
  getLastStationTemperature();


  if (
    !isnan(
      lastTemperature
    )
  )
  {
    Serial.println();

    Serial.print(
      "Nhiet do cu Firebase = "
    );


    Serial.println(
      lastTemperature,
      1
    );


    Serial.println(
      "Bu thoi gian sau restart..."
    );


    updateLots(
      lastTemperature
    );
  }


// ==========================================================
// CHO DHT22 KHOI DONG
// ==========================================================

  delay(
    2000
  );


// ==========================================================
// DOC CAM BIEN LAN DAU
// ==========================================================

  readDHT22();


// ==========================================================
// GUI FIREBASE NGAY
// ==========================================================

  syncFirebase();


// ==========================================================
// TIMER
// ==========================================================

  lastSensorRead =
  millis();


  lastFirebaseUpdate =
  millis();


  Serial.println();

  Serial.println(
    "===================================="
  );

  Serial.println(
    "ESP32 READY!"
  );


  if (DEMO_MODE)
  {
    Serial.println(
      "DEMO MODE: 30 GIAY / LAN"
    );
  }
  else
  {
    Serial.println(
      "NORMAL MODE: 15 PHUT / LAN"
    );
  }


  Serial.println(
    "===================================="
  );
}


// ============================================================
// 33. LOOP
// ============================================================

void loop()
{
  unsigned long now =
  millis();


// ==========================================================
// DOC DHT22 MOI 30 GIAY
// ==========================================================

  if (
    now -
    lastSensorRead >=
    SENSOR_INTERVAL
  )
  {
    lastSensorRead =
    now;


    readDHT22();
  }


// ==========================================================
// FIREBASE
// ==========================================================

  if (
    now -
    lastFirebaseUpdate >=
    FIREBASE_INTERVAL
  )
  {
    lastFirebaseUpdate =
    now;


    syncFirebase();
  }


  delay(
    10
  );
}