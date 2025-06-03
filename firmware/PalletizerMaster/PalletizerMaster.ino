#define ENABLE_MODULE_SERIAL_ENHANCED
#define ENABLE_MODULE_DIGITAL_OUTPUT

#include "PalletizerMaster.h"
#include "PalletizerServer.h"
#include "DebugManager.h"
#include "LittleFS.h"
#include "ESPmDNS.h"

#define RX_PIN 16
#define TX_PIN 17
#define INDICATOR_PIN 26

#define WIFI_MODE PalletizerServer::MODE_STA
#define WIFI_SSID "silenceAndSleep"
#define WIFI_PASSWORD "11111111"

PalletizerMaster master(RX_PIN, TX_PIN, INDICATOR_PIN);
PalletizerServer server(&master, WIFI_MODE, WIFI_SSID, WIFI_PASSWORD);

void onSlaveData(const String& data) {
  DEBUG_MGR.info("SLAVE_DATA", data);
}

void setup() {
  Serial.begin(9600);
  Serial.println("\nPalletizer System Starting...");

  disableLoopWDT();
  disableCore0WDT();
  disableCore1WDT();

  if (!LittleFS.begin(true)) {
    Serial.println("Error mounting LittleFS! System will continue without file storage.");
  } else {
    Serial.println("LittleFS mounted successfully");
  }

  master.setSlaveDataCallback(onSlaveData);

  master.begin();
  server.begin();

  DEBUG_MGR.begin(&Serial, &server);
  DEBUG_MGR.info("SYSTEM", "Debug Manager initialized");

  DEBUG_MGR.info("SYSTEM", "Palletizer System Ready");
  DEBUG_MGR.info("SYSTEM", "Access at: http://palletizer.local");
}

void loop() {
  master.update();
}