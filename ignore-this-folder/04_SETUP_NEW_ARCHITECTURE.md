# Setup Guide - New Server-Based Architecture

## Overview
Arsitektur baru: **Laptop Server → ESP32 Master → Arduino Mega Slave (5 Motors)**

## Hardware Setup

### 1. Arduino Mega Wiring
```
Motor Drivers (A4988/DRV8825):
- Motor X: STEP=Pin 2,  DIR=Pin 3
- Motor Y: STEP=Pin 4,  DIR=Pin 5  
- Motor Z: STEP=Pin 6,  DIR=Pin 7
- Motor T: STEP=Pin 8,  DIR=Pin 9
- Motor G: STEP=Pin 10, DIR=Pin 11

Serial to ESP32:
- RX: Connect to ESP32 TX2 (Pin 17)
- TX: Connect to ESP32 RX2 (Pin 16)
- GND: Common ground
```

### 2. ESP32 Wiring
```
Serial to Arduino Mega:
- TX2 (Pin 17): Connect to Arduino RX
- RX2 (Pin 16): Connect to Arduino TX
- GND: Common ground

WiFi: Connect to same network as laptop
```

## Software Setup

### 1. Arduino Mega Slave Firmware
```bash
# Upload firmware/PalletizerSlave/PalletizerSlave.ino
# Required libraries:
# - AccelStepper
```

### 2. ESP32 Master Firmware
```bash
# Upload firmware/PalletizerMaster/PalletizerMaster.ino
# Required libraries:
# - WiFi (built-in)
# - WebSocketsClient
# - ArduinoJson

# Configuration in PalletizerBridge.cpp:
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverIP = "192.168.1.100"; // Your laptop IP
```

### 3. Laptop Server
```bash
# Install dependencies
npm install

# Start server
npm run dev:server

# The server will run on:
# - HTTP: http://localhost:3001
# - WebSocket: ws://localhost:3001/ws
# - Web Interface: http://localhost:3001
```

## Testing Steps

### 1. Test Arduino Mega Slave
1. Upload PalletizerSlave_New.ino
2. Open Serial Monitor (115200 baud)
3. Send test commands:
   ```
   M X1000 Y2000 S1000 A500
   S (status request)
   H (home all)
   E (emergency stop)
   ```

### 2. Test ESP32 Master
1. Configure WiFi credentials in PalletizerMaster_New.ino
2. Upload firmware
3. Check Serial Monitor for WiFi connection
4. Start laptop server
5. ESP32 Master should connect to WebSocket

### 3. Test Complete System
1. Start laptop server: `npm run dev:server`
2. Open web interface: http://localhost:3001
3. Check connection status (green = connected)
4. Test script execution:
   ```
   X1000 Y2000 F1500
   SYNC
   X0 Y0 F3000
   ```

## API Endpoints

### REST API
- `POST /api/script/execute` - Execute script
- `POST /api/control/play` - Play/Resume
- `POST /api/control/pause` - Pause execution
- `POST /api/control/stop` - Stop and clear queue
- `POST /api/control/home` - Home all axes
- `POST /api/move` - Manual move command
- `GET /api/status` - Get system status

### WebSocket
- Client to Server: Script commands, control
- Server to Client: Status updates, position, errors
- ESP32 to Server: Device registration, status reports

## Communication Protocol

### Server → ESP32
```json
{
  "cmd": "MOVE",
  "data": {
    "X": 1000,
    "Y": 2000,
    "speed": 1500,
    "accel": 500
  }
}
```

### ESP32 → Arduino
```
M X1000 Y2000 S1500 A500
```

### Arduino → ESP32
```
P X1000 Y2000 Z0 T0 G0  (position)
B                        (busy)
D                        (done)
E Error message         (error)
```

## Troubleshooting

### ESP32 Won't Connect
1. Check WiFi credentials
2. Verify laptop IP address
3. Ensure server is running
4. Check firewall settings

### Arduino Not Responding
1. Check serial connections
2. Verify baud rate (115200)
3. Test with Serial Monitor
4. Check power supply

### Commands Not Executing
1. Check WebSocket connection in browser
2. Verify ESP32-Arduino serial link
3. Check debug terminal for errors
4. Test with simple commands first

## Performance Monitoring
- Server CPU/Memory usage
- WebSocket latency
- Command queue length
- Arduino loop frequency

## Future Enhancements
- Multiple palletizer support
- Cloud deployment
- Advanced motion planning
- Real-time trajectory visualization