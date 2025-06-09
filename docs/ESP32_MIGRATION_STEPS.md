# ESP32 Master Migration Steps

## SUMMARY OF CHANGES

### **FILES TO DELETE (7 files):**
- `PalletizerServer.cpp/h` 
- `PalletizerScriptParser.cpp/h`
- `PalletizerRuntime.cpp/h` 
- `PalletizerMaster.cpp/h`
- `PalletizerProtocol.cpp/h`
- `DebugManager.cpp/h`
- `DebugConfig.h`

### **FILES TO CREATE (8 files):**
- `ESP32Master.ino` - Main simplified code
- `HttpServer.cpp/h` - Simple HTTP server for laptop communication
- `UartRelay.cpp/h` - UART communication with slaves
- `StatusIndicator.cpp/h` - LED status management
- `ESP32_Master_README.md` - Documentation

### **FILES UNCHANGED:**
- All ESP32 Slave files (no changes needed)

## QUICK SETUP

1. **Create new ESP32 project folder:**
   ```bash
   mkdir ESP32Master
   cd ESP32Master
   ```

2. **Copy all 8 files from artifacts** to the folder

3. **Open ESP32Master.ino** in Arduino IDE

4. **Configure WiFi settings:**
   ```cpp
   #define WIFI_SSID "your_wifi_name"
   #define WIFI_PASSWORD "your_wifi_password"
   ```

5. **Upload to ESP32**

6. **Check Serial Monitor** for IP address:
   ```
   STA Mode - Connected to WiFi. IP address: 192.168.1.100
   ```

7. **Update laptop server config** with ESP32 IP:
   ```typescript
   // src/lib/config.ts
   esp32: {
     host: '192.168.1.100',  // Use IP from serial monitor
     port: '80',
   }
   ```

8. **Test connection:**
   ```bash
   # From browser:
   http://192.168.1.100/ping
   http://192.168.1.100/status
   ```

## MEMORY COMPARISON

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| **Flash Usage** | ~180KB | ~45KB | **135KB (75%)** |
| **RAM Usage** | ~120KB | ~50KB | **70KB (58%)** |
| **Free Heap** | ~200KB | ~270KB | **70KB more** |

## ARCHITECTURE CHANGE

### **Before:**
```
Web Browser ← ESP32 Master (Web Server + Parser + Runtime + File System)
                    ↓ UART
              ESP32 Slaves
```

### **After:**  
```
Web Browser ← Next.js Server ← HTTP → ESP32 Master (HTTP Bridge) ← UART → ESP32 Slaves
```

## COMMUNICATION FLOW

1. **Web UI** sends command to **Next.js API**
2. **Next.js Server** parses script & sends HTTP to **ESP32 Master**
3. **ESP32 Master** relays command via UART to **ESP32 Slaves**  
4. **ESP32 Slaves** respond via UART to **ESP32 Master**
5. **ESP32 Master** stores response for status polling
6. **Next.js Server** polls ESP32 status for updates

## TESTING SEQUENCE

1. **ESP32 Master Status:**
   ```bash
   curl http://192.168.1.100/status
   ```

2. **Send Test Command:**
   ```bash
   curl -X POST http://192.168.1.100/execute \
     -H "Content-Type: application/json" \
     -d '{"command": "x;1;100"}'
   ```

3. **Check Laptop Server:**
   ```bash
   npm run dev  # Start Next.js server
   # Open http://localhost:3000
   ```

4. **Verify End-to-End:**
   - Load script in web interface
   - Click PLAY
   - Check debug terminal for communication flow

## TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| **WiFi won't connect** | Check SSID/password, ensure 2.4GHz network |
| **HTTP timeout** | Verify ESP32 IP, check network connectivity |
| **UART issues** | Verify RX/TX pins, check slaves are powered |
| **Memory crashes** | Monitor serial output, restart if needed |
| **Commands not working** | Check debug terminal in web interface |

## SUCCESS INDICATORS

✅ **ESP32 Status LED:** Green solid (READY)  
✅ **Serial Monitor:** Shows HTTP server started  
✅ **Web Interface:** Shows "Connected" status  
✅ **Debug Terminal:** Shows ESP32 communication  
✅ **Slaves Respond:** Movement commands work

## ROLLBACK PLAN

If migration fails, keep backup of original firmware files and can restore previous version.