#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <WiFi.h>
#include <HTTPClient.h>

class HttpClient {
private:
  String serverHost;
  int serverPort;
  String baseUrl;

public:
  HttpClient(const char* host, int port);
  String get(const String& endpoint);
  String post(const String& endpoint, const String& payload);
  bool isConnected();
};

#endif