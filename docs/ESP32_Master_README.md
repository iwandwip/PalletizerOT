# ESP32 Master - Simplified Communication Bridge

## Overview
ESP32 Master yang sudah disederhanakan untuk bekerja sebagai communication bridge antara laptop server dan ESP32 slaves. Tidak lagi host web server atau parsing complex.

## Architecture
```
Laptop Server (Next.js) ←→ ESP32 Master ←→ ESP32 Slaves
    HTTP JSON                    UART 9600 baud
```

## Hardware Requirements
- ESP32 DevKit atau equivalent
- UART pins untuk komunikasi dengan slaves
- 3 LED untuk status indicator (optional)

## Pin Configuration
```cpp
#define RX_PIN 16              // UART RX untuk slaves
#define TX_PIN 17              // UART TX untuk slaves  
#define LED_GREEN_PIN 27       // Status LED hijau
#define LED_YELLOW_PIN 14      // Status LED kuning
#define LED_RED_PIN 13         // Status LED merah
```

## File Structure
```
ESP32Master/
├── ESP32Master.ino           // Main file
├── HttpServer.cpp/h          // Simple HTTP server untuk laptop
├── UartRelay.cpp/h           // UART communication dengan slaves
└── StatusIndicator.cpp/h     // LED status management
```

## WiFi Configuration

### Development Mode (STA)
```cpp
#define DEVELOPMENT_MODE 1
#define WIFI_SSID "your_wifi_name"
#define WIFI_PASSWORD "your_wifi_password"
```

### Production Mode (AP)
```cpp
#define DEVELOPMENT_MODE 0
#define WIFI_SSID "Palletizer"
#define WIFI_PASSWORD ""
```

## HTTP Endpoints

### POST /execute
Menerima command dari laptop server:
```json
{
  "command": "x;1;100;d1000",
  "timestamp": 1640995200000
}
```

Response:
```json
{
  "success": true,
  "message": "Command executed",
  "time": 1640995200000
}
```

### GET /status
Memberikan status ESP32:
```json
{
  "state": "IDLE",
  "connected": true,
  "slaves": ["x", "y", "z", "t", "g"],
  "lastUpdate": 1640995200000,
  "freeHeap": 180000,
  "uptime": 60000
}
```

### GET /ping
Heartbeat check:
```json
{
  "status": "ok",
  "time": 1640995200000
}
```

## UART Protocol (ke Slaves)
Protocol sama seperti sebelumnya:

### Movement Commands
```
x;1;100;d1000     // Move X axis to position 100 with 1000ms delay
y;1;50;d500       // Move Y axis to position 50 with 500ms delay
```

### Speed Commands  
```
x;6;500           // Set X axis speed to 500
all;6;200         // Set all axes speed to 200
```

### System Commands
```
x;2               // Zero/home X axis
x;0               // Ping X axis
```

## LED Status Indicators

| LED Pattern | Status | Description |
|------------|--------|-------------|
| Red/Yellow Blink | STARTING | System booting |
| Yellow Blink | CONNECTING | Connecting to WiFi |
| Green Solid | CONNECTED/READY | WiFi connected, ready |
| Yellow Solid | AP_MODE | Running as Access Point |
| Green Blink | RUNNING | Processing commands |
| Red Blink | DISCONNECTED | WiFi disconnected |
| Red Fast Blink | ERROR | System error |

## Memory Usage
- **Before:** ~200KB (dengan web server, parser, file system)
- **After:** ~50KB (hanya HTTP bridge + UART relay)
- **Savings:** ~75% memory reduction

## Installation Steps

1. **Install ESP32 Board Package** dalam Arduino IDE
2. **Install Libraries:**
   - ESP32 Core (built-in)
   - WebServer (built-in)
   
3. **Upload Code:**
   - Buka `ESP32Master.ino` 
   - Set WiFi credentials
   - Upload ke ESP32

4. **Check Serial Monitor:**
   ```
   ESP32 Palletizer Master Starting...
   Connecting to WiFi....
   STA Mode - Connected to WiFi. IP address: 192.168.1.100
   HTTP server started on port 80
   UART relay initialized on pins RX:16 TX:17
   Status: READY
   ESP32 Master initialization complete
   ```

5. **Update Laptop Server Config:**
   Update IP address di `src/lib/config.ts`:
   ```typescript
   esp32: {
     host: '192.168.1.100',  // ESP32 IP dari serial monitor
     port: '80',
   }
   ```

## Testing Connection

### From Browser
```
http://192.168.1.100/ping
http://192.168.1.100/status
```

### From Laptop Server
ESP32 akan automatically menerima commands dari laptop server saat sistem running.

## Troubleshooting

### WiFi Connection Issues
- Check SSID/password di code
- Ensure WiFi network available
- Check serial monitor for connection status

### UART Communication Issues  
- Verify RX/TX pin connections
- Check baud rate (9600)
- Ensure slaves powered dan configured correctly

### HTTP Communication Issues
- Check ESP32 IP address
- Ensure laptop dan ESP32 di network yang sama
- Test with browser first (`/ping` endpoint)

### Memory Issues
- Monitor free heap di serial monitor
- System auto-restart if memory below 10KB
- Check for memory leaks if frequent restarts

## Performance Characteristics

- **HTTP Response Time:** <50ms
- **UART Relay Latency:** <10ms  
- **Memory Usage:** ~50KB stable
- **WiFi Reconnect:** Automatic dengan 5s interval
- **Heartbeat:** Slaves pinged every 5 seconds

## Command Flow Example

1. **Laptop sends:** `POST /execute {"command": "x;1;100"}`
2. **ESP32 receives:** HTTP request  
3. **ESP32 relays:** `x;1;100` via UART ke slave
4. **Slave responds:** `x;POSITION REACHED` via UART
5. **ESP32 stores:** Response untuk status reporting
6. **Laptop polls:** `GET /status` untuk updates

## Firmware Size
- **Sketch:** ~45KB
- **Free Flash:** ~3.2MB remaining  
- **RAM Usage:** ~50KB / 320KB
- **Task Stack:** HTTP=8KB, UART=4KB