#include "HttpClient.h"
#include "HTTPClient.h"

HttpClient::HttpClient(const char* host, int port) {
  serverHost = String(host);
  serverPort = port;
  baseUrl = "http://" + serverHost + ":" + String(serverPort);
}

String HttpClient::get(const String& endpoint) {
  if (WiFi.status() != WL_CONNECTED) {
    return "";
  }

  HTTPClient http;
  String url = baseUrl + endpoint;

  http.begin(url);
  http.setTimeout(10000);

  int httpCode = http.GET();
  String response = "";

  if (httpCode == HTTP_CODE_OK) {
    response = http.getString();
  } else {
    Serial.println("HTTP GET failed: " + String(httpCode));
  }

  http.end();
  return response;
}

String HttpClient::post(const String& endpoint, const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    return "";
  }

  HTTPClient http;
  String url = baseUrl + endpoint;

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  int httpCode = http.POST(payload);
  String response = "";

  if (httpCode == HTTP_CODE_OK) {
    response = http.getString();
  } else {
    Serial.println("HTTP POST failed: " + String(httpCode));
  }

  http.end();
  return response;
}

bool HttpClient::isConnected() {
  return WiFi.status() == WL_CONNECTED;
}