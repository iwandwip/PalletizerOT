#ifndef DEBUG_CONFIG_H
#define DEBUG_CONFIG_H

// ==========================================
// DEBUG CONTROL MACROS
// ==========================================
// Set these to 1 to enable, 0 to disable

#define WEB_DEBUG 0     // Debug messages to website (0=OFF, 1=ON)
#define SERIAL_DEBUG 1  // Debug messages to serial monitor (0=OFF, 1=ON)
#define MEMORY_DEBUG 0

// ==========================================
// CONDITIONAL DEBUG BUFFER SIZES
// ==========================================

#if WEB_DEBUG == 1
#define DEBUG_BUFFER_SIZE 100  // Reduced from 1000 for web debug
#define WEB_DEBUG_ENABLED true
#else
#define DEBUG_BUFFER_SIZE 5  // Minimal buffer when web debug off
#define WEB_DEBUG_ENABLED false
#endif

#if SERIAL_DEBUG == 1
#define SERIAL_DEBUG_ENABLED true
#else
#define SERIAL_DEBUG_ENABLED false
#endif

// ==========================================
// MEMORY OPTIMIZATION SETTINGS
// ==========================================

#if WEB_DEBUG == 0
#define MAX_FUNCTIONS 10       // Reduced parser functions
#define MAX_STATEMENTS 20      // Reduced statement array
#define QUEUE_BUFFER_LIMIT 50  // Reduced queue size
#else
#define MAX_FUNCTIONS 20        // Full functionality for debugging
#define MAX_STATEMENTS 50       // Full statement array
#define QUEUE_BUFFER_LIMIT 100  // Full queue size
#endif

// ==========================================
// DEBUG LEVEL CONTROL
// ==========================================

#if WEB_DEBUG == 1 || SERIAL_DEBUG == 1
#define DEBUG_LEVEL_ERROR 1
#define DEBUG_LEVEL_WARNING 1
#define DEBUG_LEVEL_INFO 1
#define DEBUG_LEVEL_DEBUG 1
#else
#define DEBUG_LEVEL_ERROR 1  // Keep errors even in production
#define DEBUG_LEVEL_WARNING 0
#define DEBUG_LEVEL_INFO 0
#define DEBUG_LEVEL_DEBUG 0
#endif

// ==========================================
// HELPER MACROS
// ==========================================

#define DEBUG_SERIAL_PRINT(x) \
  do { \
    if (SERIAL_DEBUG_ENABLED) Serial.print(x); \
  } while (0)
#define DEBUG_SERIAL_PRINTLN(x) \
  do { \
    if (SERIAL_DEBUG_ENABLED) Serial.println(x); \
  } while (0)
#define DEBUG_SERIAL_PRINTF(...) \
  do { \
    if (SERIAL_DEBUG_ENABLED) Serial.printf(__VA_ARGS__); \
  } while (0)

#endif