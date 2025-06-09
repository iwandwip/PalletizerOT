# ESP32 Palletizer System - Complete Usage Guide

## 🚀 Quick Start Overview

Panduan lengkap untuk setup dan penggunaan sistem Palletizer dari nol hingga operasional.

---

## 📋 Pre-Requirements Checklist

### **Hardware Requirements:**
```
HARDWARE CHECKLIST

□ 1× Laptop/PC (Windows/Mac/Linux)
□ 1× ESP32 Development Board
□ 5× Arduino Uno
□ 5× Stepper Motors + Drivers (A4988/DRV8825)
□ 5× Limit Switches
□ 1× WiFi Router (2.4GHz support)
□ Power Supplies:
  □ 12V DC (for motors) - High current
  □ 5V DC (for Arduinos)
  □ USB cables for programming
□ Jumper wires & breadboard/PCB
□ Electromagnetic brake (for T-axis)
```

### **Software Requirements:**
```
SOFTWARE CHECKLIST

□ Node.js (v18 or higher)
□ Arduino IDE (v2.0 or higher)
□ ESP32 Board Package
□ AccelStepper Library
□ Git (optional, for version control)
□ Web Browser (Chrome/Firefox recommended)
```

---

## 🔧 Setup Process Flow

```
SETUP FLOW DIAGRAM

START
  │
  ▼
┌─────────────────┐
│ 1. HARDWARE     │
│    ASSEMBLY     │ ──► Connect ESP32, Arduinos, Motors, Sensors
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ 2. SOFTWARE     │
│    INSTALLATION │ ──► Install Node.js, Arduino IDE, Libraries
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ 3. NETWORK      │
│    CONFIGURATION│ ──► Setup WiFi, Configure IP addresses
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ 4. FIRMWARE     │
│    UPLOAD       │ ──► Upload code to ESP32 and Arduinos
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ 5. LAPTOP       │
│    SERVER SETUP │ ──► Install dependencies, configure, start server
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ 6. TESTING &    │
│    CALIBRATION  │ ──► Test connectivity, calibrate motors
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ 7. OPERATION    │
│    READY        │ ──► System ready for production use
└─────────────────┘
```

---

## 🔌 Step 1: Hardware Assembly

### **ESP32 Master Connections:**
```
ESP32 MASTER WIRING

     ESP32 DevKit
    ┌─────────────┐
    │           27│───────┐ Green LED + 220Ω resistor ──► GND
    │           14│───────┤ Yellow LED + 220Ω resistor ──► GND  
    │           13│───────┘ Red LED + 220Ω resistor ──► GND
    │             │
    │           17│────────────────────────────────────┐ (TX to Arduinos)
    │           16│──────────────────────────────────┐ │ (RX from Arduinos)
    │             │                                  │ │
    │          GND│──────────── Common Ground ───────┼─┼─── All Arduinos GND
    │          VCC│──────────── 5V Power ────────────┘ │
    └─────────────┘                                    │
                                                       │
    UART CONNECTION TO ARDUINOS:                       │
    ESP32 TX (Pin 17) ──► Arduino RX (Pin 8) ─────────┘
    ESP32 RX (Pin 16) ◄── Arduino TX (Pin 9) ◄─────────┐
                                                       │
    Note: Connect all Arduino TX pins together to ESP32 RX Pin 16
          Connect ESP32 TX Pin 17 to all Arduino RX pins
```

### **Arduino Uno Slave Connections (for each):**
```
ARDUINO UNO WIRING (repeat for each of 5 Arduinos)

     Arduino Uno
    ┌─────────────┐
    │          10 │────────► STEP pin of stepper driver
    │          11 │────────► DIR pin of stepper driver  
    │          12 │────────► ENABLE pin of stepper driver
    │           7 │────────► Brake control (T-axis only)
    │             │
    │           6 │◄───────── Limit switch (other end to GND)
    │             │
    │           9 │────────► ESP32 RX (Pin 16) - connect all together
    │           8 │◄───────── ESP32 TX (Pin 17) - connect all together
    │             │
    │         GND │────────── Common ground
    │         VCC │────────── 5V power supply
    └─────────────┘

STEPPER DRIVER CONNECTIONS (A4988/DRV8825):
    
    Driver Board
   ┌─────────────┐
   │ STEP     ┌──┤◄── Arduino Pin 10
   │ DIR      │  │◄── Arduino Pin 11  
   │ ENABLE   │  │◄── Arduino Pin 12
   │          │  │
   │ VDD      │  │◄── 5V (Arduino VCC)
   │ GND      │  │◄── GND
   │ VMOT     │  │◄── 12V Motor power
   │          │  │
   │ 1A    ┌──┼──┤───► Motor coil A+
   │ 1B    │  │  │───► Motor coil A-
   │ 2A    │  │  │───► Motor coil B+
   │ 2B    └──┘  │───► Motor coil B-
   └─────────────┘
```

### **Power Distribution:**
```
POWER SUPPLY WIRING

12V HIGH-CURRENT SUPPLY (for motors):
┌─────────────┐
│ 12V PSU     │
│ (≥10A)      │
├─────────────┤
│ +12V ───────┼──┬─► Stepper Driver 1 VMOT
│             │  ├─► Stepper Driver 2 VMOT
│             │  ├─► Stepper Driver 3 VMOT
│             │  ├─► Stepper Driver 4 VMOT
│             │  └─► Stepper Driver 5 VMOT
│             │
│ GND  ───────┼──┬─► All driver GNDs
└─────────────┘  └─► Common ground

5V SUPPLY (for logic):
┌─────────────┐
│ 5V PSU      │
│ (≥3A)       │
├─────────────┤
│ +5V ────────┼──┬─► ESP32 VCC
│             │  ├─► Arduino 1 VCC
│             │  ├─► Arduino 2 VCC
│             │  ├─► Arduino 3 VCC
│             │  ├─► Arduino 4 VCC
│             │  ├─► Arduino 5 VCC
│             │  └─► All driver VDD pins
│             │
│ GND  ───────┼────► Common ground
└─────────────┘
```

---

## 💻 Step 2: Software Installation

### **Laptop Setup:**

#### **Install Node.js:**
```bash
# Download from https://nodejs.org (LTS version)
# Verify installation:
node --version    # Should show v18+ 
npm --version     # Should show v8+
```

#### **Install Git (Optional):**
```bash
# Download from https://git-scm.com
# Or use package manager:

# Windows (Chocolatey):
choco install git

# macOS (Homebrew):
brew install git

# Linux (Ubuntu/Debian):
sudo apt install git
```

### **Arduino IDE Setup:**

#### **Install Arduino IDE:**
```bash
# Download from https://www.arduino.cc/en/software
# Install Arduino IDE 2.0 or higher
```

#### **Add ESP32 Board Package:**
```
1. Open Arduino IDE
2. Go to File → Preferences
3. Add this URL to "Additional Board Manager URLs":
   https://dl.espressif.com/dl/package_esp32_index.json
4. Go to Tools → Board → Board Manager
5. Search "ESP32" and install "ESP32 by Espressif Systems"
```

#### **Install Required Libraries:**
```
1. Go to Tools → Manage Libraries
2. Search and install:
   - "AccelStepper" by Mike McCauley
   - "SoftwareSerial" (usually pre-installed)
```

---

## 🌐 Step 3: Network Configuration

### **WiFi Router Setup:**
```
ROUTER CONFIGURATION

1. Enable 2.4GHz WiFi (ESP32 requirement)
2. Set WiFi password (WPA2/WPA3)
3. Note down:
   - SSID: "YourWiFiName"
   - Password: "YourWiFiPassword"
   - Router IP: Usually 192.168.1.1
4. Optional: Reserve IP for ESP32 (192.168.1.100)
```

### **Network Topology:**
```
NETWORK LAYOUT

Internet ──► Router (192.168.1.1)
             │
             ├─ WiFi ──► Laptop (192.168.1.50 or DHCP)
             │
             └─ WiFi ──► ESP32 Master (192.168.1.100)
                         │
                         └─ UART ──► Arduino Slaves (no IP)
```

---

## 📤 Step 4: Firmware Upload

### **ESP32 Master Upload:**

#### **Configure WiFi Settings:**
```cpp
// In ESP32Master.ino, edit these lines:
#define WIFI_SSID "YourWiFiName"
#define WIFI_PASSWORD "YourWiFiPassword"

// For production, set DEVELOPMENT_MODE to 0 for AP mode
#define DEVELOPMENT_MODE 1  // 1=STA mode, 0=AP mode
```

#### **Upload Process:**
```
UPLOAD STEPS:

1. Connect ESP32 to laptop via USB
2. Open Arduino IDE
3. Select Board: "ESP32 Dev Module"
4. Select Port: (check Device Manager/System Info)
5. Open ESP32Master.ino
6. Click Upload button
7. Wait for "Hard resetting via RTS pin..." message
8. Open Serial Monitor (9600 baud)
9. Look for successful WiFi connection and IP address
```

#### **Expected Serial Output:**
```
ESP32 Palletizer Master Starting...
Connecting to WiFi....
STA Mode - Connected to WiFi. IP address: 192.168.1.100
HTTP server started on port 80
UART relay initialized on pins RX:16 TX:17
Status: READY
ESP32 Master initialization complete
Free heap: 270000 bytes
```

### **Arduino Slaves Upload:**

#### **Configure Each Arduino:**
```cpp
// In PalletizerSlave.ino, change SLAVE_ADDR for each Arduino:

// For X-axis Arduino:
#define SLAVE_ADDR X_AXIS

// For Y-axis Arduino:  
#define SLAVE_ADDR Y_AXIS

// For Z-axis Arduino:
#define SLAVE_ADDR Z_AXIS

// For T-axis Arduino:
#define SLAVE_ADDR T_AXIS

// For Gripper Arduino:
#define SLAVE_ADDR G_AXIS
```

#### **Upload to Each Arduino:**
```
UPLOAD PROCESS (repeat 5 times):

1. Connect Arduino Uno to laptop via USB
2. Open Arduino IDE  
3. Select Board: "Arduino Uno"
4. Select Port: (check Device Manager)
5. Open PalletizerSlave.ino
6. Modify SLAVE_ADDR (X_AXIS, Y_AXIS, Z_AXIS, T_AXIS, G_AXIS)
7. Click Upload
8. Repeat for all 5 Arduinos with different SLAVE_ADDR
```

#### **Expected Arduino Serial Output:**
```
SLAVE X: Sistem diinisialisasi
SLAVE X: Stepper initialized with max speed 200
SLAVE X: Command Example
[CMD_RUN]     : x;1;200
[CMD_ZERO]    : x;2  
[CMD_SETSPEED]: x;6;2000
```

---

## 🖥️ Step 5: Laptop Server Setup

### **Download Project:**
```bash
# Option 1: Download and extract ZIP files from artifacts
# Create project folder:
mkdir palletizer-system
cd palletizer-system

# Extract all files from artifacts to this folder
```

### **Install Dependencies:**
```bash
# Navigate to project folder:
cd palletizer-control

# Install Node.js dependencies:
npm install

# Create storage directories:
mkdir -p storage/scripts
mkdir -p storage/logs  
mkdir -p storage/config
```

### **Configure ESP32 Connection:**
```typescript
// Edit src/lib/config.ts
export const config = {
  esp32: {
    host: '192.168.1.100',  // Use IP from ESP32 serial monitor
    port: '80',
    timeout: 5000,
  }
  // ... rest of config
}
```

### **Start Development Server:**
```bash
# Start in development mode:
npm run dev

# Server will start on http://localhost:3000
# You should see:
# ▲ Next.js 15.3.3
# - Local:        http://localhost:3000
# - ready in 2.1s
```

### **Start Production Server:**
```bash
# Build for production:
npm run build

# Start production server:
npm start

# Or use PM2 for process management:
npm install -g pm2
pm2 start npm --name "palletizer" -- start
```

---

## 🧪 Step 6: Testing & Verification

### **Connection Testing Flow:**
```
TESTING SEQUENCE

1. ESP32 Connection Test
   │
   ├─► Browser: http://192.168.1.100/ping
   ├─► Expected: {"status":"ok","time":...}
   │
   ├─► Browser: http://192.168.1.100/status  
   ├─► Expected: {"state":"IDLE","connected":true,...}
   │
   └─► If failed: Check WiFi, IP address, firewall

2. Laptop Server Test
   │
   ├─► Browser: http://localhost:3000
   ├─► Expected: Palletizer web interface loads
   │
   ├─► Check debug terminal shows "Connected"
   │
   └─► If failed: Check Node.js, npm install, port 3000

3. Arduino Communication Test
   │
   ├─► Web interface: Send single command "X(10)"
   ├─► Expected: Motor moves, debug shows UART traffic
   │
   ├─► Try each axis: X, Y, Z, T, G
   │
   └─► If failed: Check UART wiring, Arduino uploads

4. End-to-End Test
   │
   ├─► Load simple script:
   │   X(100);
   │   Y(50);
   │   Z(25);
   │
   ├─► Click PLAY
   ├─► Expected: Sequential movement of all axes
   │
   └─► Monitor debug terminal for full flow
```

### **Browser Testing Commands:**
```bash
# Test ESP32 directly:
curl http://192.168.1.100/ping
curl http://192.168.1.100/status

# Test ESP32 command execution:
curl -X POST http://192.168.1.100/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "x;1;10"}'

# Test laptop server:
curl http://localhost:3000/api/system/status
curl -X POST http://localhost:3000/api/esp32/command \
  -H "Content-Type: application/json" \
  -d '{"command": "x;1;100"}'
```

---

## 🎮 Step 7: Daily Operation Guide

### **System Startup Procedure:**
```
DAILY STARTUP FLOW

1. Power On Sequence
   │
   ├─► Turn on 12V motor power supply
   ├─► Turn on 5V logic power supply  
   ├─► Connect ESP32 via USB (or dedicated 5V)
   ├─► Connect all Arduinos via USB (or dedicated 5V)
   │
   └─► Wait 30 seconds for all systems to boot

2. Network Connection
   │
   ├─► Check ESP32 status LEDs:
   │   ├─ Green solid: Connected and ready ✅
   │   ├─ Yellow solid: AP mode (fallback)
   │   ├─ Red blinking: WiFi connection issues ❌
   │   └─ Multi-color: Still booting...
   │
   └─► Note ESP32 IP from serial monitor if needed

3. Start Laptop Server
   │
   ├─► Open terminal in project folder
   ├─► Run: npm run dev (development)
   ├─► Or: npm start (production)
   ├─► Wait for "ready" message
   │
   └─► Open browser: http://localhost:3000

4. Verify System Status
   │
   ├─► Check web interface shows "Connected"
   ├─► Debug terminal shows ESP32 communication
   ├─► Test simple command: X(10)
   │
   └─► System ready for operation ✅
```

### **Web Interface Usage:**
```
WEB INTERFACE WORKFLOW

┌─────────────────────────────────────────────────────────────┐
│                    PALLETIZER CONTROL                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STATUS: [Connected] ●  SYSTEM: [IDLE]    [Theme Toggle]   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                 SYSTEM CONTROLS                             │
│                                                             │
│  [PLAY]  [PAUSE]  [STOP]  [ZERO]                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  SPEED CONTROL          │  COMMAND MANAGEMENT              │
│                         │                                  │
│  Global: [1000] ═══○    │  ┌─────────────────────────────┐ │
│  X: [1000] ═══○ [Set]   │  │ // Modern Script Language   │ │
│  Y: [1000] ═══○ [Set]   │  │ X(100,d1000,200);          │ │
│  Z: [1000] ═══○ [Set]   │  │ Y(50,d500,100);            │ │
│  T: [1000] ═══○ [Set]   │  │ GROUP(Z(25), T(90));       │ │
│  G: [1000] ═══○ [Set]   │  │                            │ │
│                         │  └─────────────────────────────┘ │
│  [Set All Speeds]       │  [Save] [Load] [Upload]         │
│                         │                                  │
├─────────────────────────────────────────────────────────────┤
│                    DEBUG TERMINAL                          │
│                                                             │
│  [Connected] [1000 messages] [ERROR] [WARNING] [INFO]      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 12:34:56.789 [INFO] [SYSTEM] System started           │ │
│  │ 12:34:57.123 [INFO] [ESP32] Command sent: x;1;100     │ │
│  │ 12:34:57.456 [INFO] [MOTOR] X axis moving to 100      │ │
│  │ 12:34:58.789 [INFO] [MOTOR] X position reached        │ │
│  │ █                                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│  [Clear] [Export] [■] [Filter...]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Script Writing Guide:**
```
MODERN SCRIPT LANGUAGE SYNTAX

Basic Movement:
X(position);              // Move X to position
X(position,delay);        // Move X with delay  
X(pos,delay,param3);      // Move X with extra parameters

Speed Control:
SPEED;500;                // Set all axes speed to 500
SPEED;x;300;              // Set X axis speed to 300

System Commands:
ZERO;                     // Home all axes
PLAY; PAUSE; STOP;        // System control

Simultaneous Movement:
GROUP(X(100), Y(50), Z(25)); // Move all at same time

Functions:
FUNC(MY_SEQUENCE) {
  X(100,d1000);
  Y(50,d500);
  GROUP(Z(25), T(90));
}

CALL(MY_SEQUENCE);        // Execute function

Synchronization:
SET(1);                   // Set sync signal HIGH
SET(0);                   // Set sync signal LOW  
WAIT;                     // Wait for external signal
```

### **Common Operation Workflows:**

#### **Workflow 1: Simple Movement Test**
```
SIMPLE MOVEMENT WORKFLOW

1. Write Script:
   ┌─────────────────┐
   │ X(100);         │
   │ Y(50);          │
   │ Z(25);          │
   └─────────────────┘

2. Click [Save] to store script

3. Click [PLAY] to execute

4. Monitor debug terminal:
   ├─ "Command sent: x;1;100"
   ├─ "X axis moving to 100"  
   ├─ "X position reached"
   ├─ "Command sent: y;1;50"
   └─ "Sequence completed"

5. Check physical movement matches commands
```

#### **Workflow 2: Complex Multi-Axis Coordination**
```
COMPLEX WORKFLOW

1. Write Advanced Script:
   ┌────────────────────────────┐
   │ FUNC(PICK_SEQUENCE) {      │
   │   GROUP(X(100), Y(50));    │
   │   Z(10,d1000);             │
   │   SET(1);                  │
   │   G(50);                   │
   │   SET(0);                  │
   │ }                          │
   │                            │
   │ FUNC(PLACE_SEQUENCE) {     │
   │   Z(80,d500);              │
   │   GROUP(X(400), Y(150));   │
   │   Z(100,d1000);            │
   │   G(0);                    │
   │ }                          │
   │                            │
   │ ZERO;                      │
   │ SPEED;200;                 │
   │ CALL(PICK_SEQUENCE);       │
   │ CALL(PLACE_SEQUENCE);      │
   └────────────────────────────┘

2. Click [Save] and verify parsing

3. Set appropriate speeds for each axis

4. Click [PLAY] for full automation

5. Monitor execution progress in debug terminal
```

#### **Workflow 3: Troubleshooting Issues**
```
TROUBLESHOOTING WORKFLOW

Issue: Motor not moving
├─► Check debug terminal for commands sent
├─► Verify ESP32 connection status  
├─► Test individual axis: X(10)
├─► Check power supplies (12V motors, 5V logic)
├─► Verify UART connections
└─► Check Arduino serial monitors

Issue: WiFi connection lost
├─► Check ESP32 status LED (should be green)
├─► Restart ESP32 if red/blinking
├─► Verify WiFi credentials in code
├─► Check router 2.4GHz availability
└─► Use manual IP if DHCP fails

Issue: Web interface not responding  
├─► Check laptop server running (npm run dev)
├─► Verify port 3000 not blocked
├─► Clear browser cache/try incognito
├─► Check firewall settings
└─► Restart Node.js server

Issue: Commands not executing
├─► Check script syntax in debug terminal
├─► Verify ESP32 IP configuration
├─► Test ESP32 endpoints directly
├─► Check Arduino individual responses
└─► Reset system and retry
```

---

## 🛡️ Safety & Emergency Procedures

### **Emergency Stop Procedure:**
```
EMERGENCY STOP SEQUENCE

IMMEDIATE ACTIONS:
1. Click [STOP] button in web interface
2. Turn off 12V motor power supply  
3. Press RESET on ESP32 if needed
4. Manually disconnect motors if necessary

SYSTEM RECOVERY:
1. Check for mechanical obstructions
2. Verify limit switches not triggered
3. Restart power supplies in sequence
4. Re-home all axes with ZERO command
5. Test simple movements before resuming
```

### **Daily Shutdown Procedure:**
```
SHUTDOWN SEQUENCE

1. Complete current operations
2. Click [STOP] in web interface  
3. Run ZERO command to home all axes
4. Close laptop server (Ctrl+C)
5. Turn off motor power (12V)
6. Turn off logic power (5V)  
7. Disconnect USB cables
8. Power down laptop and router if needed
```

---

## 📊 Monitoring & Maintenance

### **Performance Monitoring:**
```
DAILY CHECKS

System Health:
□ ESP32 green LED status
□ Web interface shows "Connected"
□ All motor movements smooth
□ No error messages in debug terminal

Weekly Maintenance:
□ Check mechanical connections
□ Verify limit switch operation
□ Clean stepper motor areas
□ Backup script files
□ Check power supply voltages

Monthly Maintenance:  
□ Update firmware if available
□ Review debug logs for patterns
□ Calibrate motor positions
□ Test emergency stop procedures
□ Document any modifications
```

### **Log Analysis:**
```
DEBUG TERMINAL PATTERNS

Normal Operation:
✅ "Command sent: x;1;100"
✅ "X axis moving to 100"  
✅ "X position reached"
✅ "Sequence completed"

Warning Signs:
⚠️  "Connection timeout"
⚠️  "Arduino not responding"
⚠️  "Limit switch triggered"
⚠️  "Motor stall detected"

Critical Errors:
❌ "Emergency stop activated"
❌ "Power supply failure"
❌ "Communication lost"
❌ "System error - restart required"
```

---

## 🎯 Success Indicators

### **System Ready Checklist:**
```
OPERATIONAL READINESS

Visual Indicators:
□ ESP32 green LED solid
□ Web interface shows "Connected"
□ Debug terminal shows active communication
□ All motor drivers powered (LED indicators)

Functional Tests:
□ Simple movement: X(10) works
□ All axes respond: X, Y, Z, T, G
□ Speed changes take effect
□ ZERO command homes all axes
□ Emergency STOP works immediately

Performance Metrics:
□ Command latency < 100ms
□ Position accuracy ± 0.1mm
□ No error messages in 5-minute test
□ WiFi connection stable
□ Memory usage stable on ESP32
```

### **Production Ready:**
```
PRODUCTION READINESS CRITERIA

System Integration:
✅ All hardware connected and tested
✅ Firmware uploaded and configured  
✅ Network connectivity verified
✅ Laptop server operational
✅ Safety procedures documented

Operational Testing:
✅ Complete script execution successful
✅ Multi-axis coordination working
✅ Error handling tested
✅ Emergency procedures verified
✅ Performance meets requirements

Documentation:
✅ User training completed
✅ Maintenance procedures documented
✅ Troubleshooting guide available
✅ Contact information for support
✅ Backup procedures established

SYSTEM STATUS: READY FOR PRODUCTION ✅
```

---

## 📞 Support & Troubleshooting Contacts

### **Technical Support Levels:**
```
SUPPORT ESCALATION

Level 1 - User Issues:
├─► Check this usage guide
├─► Review troubleshooting section  
├─► Check debug terminal messages
└─► Test basic connectivity

Level 2 - Hardware Issues:
├─► Verify power supplies
├─► Check wiring connections
├─► Test individual components
└─► Replace faulty hardware

Level 3 - Software Issues:
├─► Check firmware versions
├─► Review configuration files
├─► Analyze debug logs
└─► Update/reinstall software

Level 4 - System Integration:
├─► Network configuration
├─► Performance optimization
├─► Custom modifications
└─► Advanced troubleshooting
```

### **Documentation References:**
- **Hardware Assembly:** Section 1 of this guide
- **Software Installation:** Section 2 of this guide  
- **Network Configuration:** Section 3 of this guide
- **Firmware Upload:** Section 4 of this guide
- **System Architecture:** SYSTEM_ARCHITECTURE.md
- **Code Documentation:** Individual file headers

---

## 🎉 Congratulations!

Your ESP32 Palletizer System is now ready for operation! 

Follow the daily operation procedures for consistent performance and refer to the troubleshooting sections for any issues that arise.

**System Status: OPERATIONAL** ✅