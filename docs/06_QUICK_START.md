# Quick Start Guide - New Architecture

## 🚀 Ready to Test!

### 1. Start Server
```bash
npm run dev:server
```
Server akan berjalan di:
- **HTTP**: http://localhost:3001
- **WebSocket**: ws://localhost:3001/ws

### 2. Test Server API
Buka browser ke http://localhost:3001 atau test dengan curl:
```bash
# Test status endpoint
curl http://localhost:3001/api/status

# Test script parsing
curl -X POST -H "Content-Type: application/json" \
  -d '{"script":"X1000 Y2000\nSYNC\nX0 Y0"}' \
  http://localhost:3001/api/script/parse
```

### 3. Test Arduino Mega Slave
Upload `firmware/PalletizerSlave/PalletizerSlave.ino` dan test via Serial Monitor (115200 baud):
```
M X1000 Y2000 S1000 A500
S
H
```

### 4. Test ESP32 Master
1. Edit `firmware/PalletizerMaster/PalletizerBridge.cpp`:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* serverIP = "192.168.1.100"; // Your laptop IP
   ```
2. Upload firmware
3. Check Serial Monitor untuk koneksi WiFi dan WebSocket

### 5. Test Complete System
1. Server running ✅
2. Arduino responding ✅
3. ESP32 connected ✅
4. Web interface: http://localhost:3001
5. Test script execution di browser

## 📋 Test Commands

### Simple Movement
```
X1000 Y2000 F1500
SYNC
X0 Y0 F3000
```

### Group Movement
```
GROUP X1000 Y2000 Z500
SYNC
GROUP X0 Y0 Z0
```

### Function & Loop
```
FUNC pickup
  Z-100
  G1
  Z100
ENDFUNC

LOOP 3
  CALL pickup
  X100
ENDLOOP
```

## 🔧 Troubleshooting

### Server Won't Start
- Check if port 3001 is available
- Try different port: `PORT=3002 npm run dev:server`

### ESP32 Won't Connect
- Check WiFi credentials
- Verify laptop IP address
- Ensure server is running

### Arduino Not Responding
- Check baud rate (115200)
- Verify serial connections
- Test power supply

## 📊 What You Should See

### Server Console
```
🚀 Palletizer Server running on port 3001
📡 WebSocket endpoint: ws://localhost:3001/ws
🌐 Web interface: http://localhost:3001
```

### ESP32 Master Serial Monitor
```
PalletizerBridge Starting...
WiFi connected
IP: 192.168.1.xxx
WebSocket connected
Ready!
```

### Arduino Slave Serial Monitor
```
SLAVE_READY
```

### Web Interface
- **Connection Status**: Server Connected, ESP32 Connected
- **Script Editor**: Syntax highlighting, auto-compile
- **Debug Terminal**: Real-time messages
- **Control Buttons**: PLAY/PAUSE/STOP/HOME active

Sistem baru siap digunakan! 🎉