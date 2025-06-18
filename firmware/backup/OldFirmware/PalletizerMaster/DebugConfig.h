#ifndef DEBUG_CONFIG_H
#define DEBUG_CONFIG_H

#define SERIAL_DEBUG 1
#define WEB_DEBUG 0
#define MEMORY_DEBUG 0

#if SERIAL_DEBUG == 1
#define DEBUG_SERIAL_PRINT(x) Serial.print(x)
#define DEBUG_SERIAL_PRINTLN(x) Serial.println(x)
#define DEBUG_SERIAL_PRINTF(...) Serial.printf(__VA_ARGS__)
#else
#define DEBUG_SERIAL_PRINT(x)
#define DEBUG_SERIAL_PRINTLN(x)
#define DEBUG_SERIAL_PRINTF(...)
#endif

#define DEBUG_BUFFER_SIZE 10
#define MAX_FUNCTIONS 5
#define MAX_STATEMENTS 20

#endif