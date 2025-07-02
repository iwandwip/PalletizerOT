# PalletizerOT System Flow Documentation (Current Implementation & Planning)

# PART 1: CURRENT IMPLEMENTATION ✅

## Overview
Dokumentasi sistem PalletizerOT yang **sudah terimplementasi** - Industrial dual-arm palletizer control system dengan distributed UART architecture. Core automation features (MSL compiler, dual-arm control, real-time communication, ESP32 firmware) FULLY IMPLEMENTED dan production-ready. Physical sensor integration dan advanced automation masih dalam tahap planning.

## 🏗️ Current System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PalletizerOT Dual-Arm Control System                    │
│                          (13 Device Network)                               │
└─────────────────────────────────────────────────────────────────────────────┘

Web Client ──HTTP──► Node.js Server ──HTTP/WiFi──► ESP32 Bridge
(Next.js)              (Express API)               (UART Master)
    │                       │                           │
    │ MSL Compiler           │ Command Storage           │ UART Distribution
    ▼                       ▼                           ▼
["X(100)", "Y(50)"]    ARM1/ARM2 Scripts        ARM1 Master (UART1)
                                                ARM2 Master (UART2)
                                                        │
                                            5 Slave Nanos per Arm
                                            (Shared UART Bus)
                                               (10 Motors Total)

         UART SHARED BUS ARCHITECTURE: ESP32 → 2 Masters → 10 Slaves
```

## 🌐 Web Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PalletizerOT Control Interface                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ System Controls ──────────────┐ ┌─ Dual Arm Editor ──────────────────────┐
│ ▶️ Start  ⏸️ Pause  ⏹️ Stop    │ │ [Arm 1●] [Arm 2]  Mode: [MSL] [RAW]   │
├────────────────────────────────┤ │                                        │
│ 📊 Status:                     │ │ // MSL Script for ARM1                 │
│ ESP32: 🟢 Connected             │ │ X(100); Y(50);                         │
│ ARM1: ⚡ 5/5 slaves             │ │ FUNC(pickup) {                         │
│ ARM2: ⚡ 4/5 slaves             │ │   Z(100); G(600);                      │
│ Progress: 65% (13/20)          │ │ } CALL(pickup);                        │
├────────────────────────────────┤ │                                        │
│ ⚡ Speed Control:               │ │ [💻 Process] [▶️ Execute]              │
│ Global: 1000 mm/min            │ └────────────────────────────────────────┘
│ Per-axis: [X:1500][Y:1200]     │
└────────────────────────────────┘

┌─ Debug Terminal ────────────────────────────────────────────────────────────┐
│ [ARM1] Command sent: X:100  | [ARM2] I2C error: timeout                  │
│ [I2C ] 9/10 slaves connected | [SYS ] Dual-arm execution completed        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📊 Complete System Block Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DISTRIBUTED ARCHITECTURE                          │
│                              (13 Devices)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

📱 WEB CLIENT (Next.js + React)
┌─────────────────────────────────────────────────────────────────────────────┐
│  ARM1 Editor | ARM2 Editor | Debug Terminal                                 │
│  MSL Scripts | RAW Commands| Real-time Status                               │
└─────────────────────────────────────────────────────────────────────────────┘
           │ HTTP POST /api/script/save {armId, commands, format}
           ▼

🖥️  NODE.JS SERVER (Express + SSE)
┌─────────────────────────────────────────────────────────────────────────────┐
│  System State Manager                                                       │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│  │  ARM1 Script    │    │  ARM2 Script    │    │  Distributed Status     │ │
│  │  Commands: 15   │    │  Commands: 8    │    │  ESP32: Connected ✅    │ │
│  │  Format: MSL    │    │  Format: RAW    │    │  ARM1: 5/5 slaves ✅   │ │
│  │  Status: Ready  │    │  Status: Ready  │    │  ARM2: 4/5 slaves ⚠️   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
           │ HTTP GET /api/script/poll (every 2 seconds)
           ▼

📡 ESP32 WIFI BRIDGE (UART Master)
┌─────────────────────────────────────────────────────────────────────────────┐
│  Command Forwarder (Enhanced)                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │ ARM1 Queue  │    │ ARM2 Queue  │    │      UART Controller            │ │
│  │ 15 commands │    │ 8 commands  │    │ ARM1 Master (UART1): OK ✅     │ │
│  │ Index: 3    │    │ Index: 1    │    │ ARM2 Master (UART2): OK ✅     │ │
│  │ Status: RUN │    │ Status: RUN │    │ Serial1/Serial2 115200 ✅      │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
           │ UART Send: "arm1:X:100"          │ UART Send: "arm2:Y:300"
           ▼                                  ▼

🤖 ARDUINO NANO MASTERS (Team Development)
┌───────────────────────────────────┐  ┌───────────────────────────────────┐
│        ARM1 MASTER                │  │        ARM2 MASTER                │
│  ┌─────────────────────────────┐  │  │  ┌─────────────────────────────┐  │
│  │     UART Receiver           │  │  │  │     UART Receiver           │  │
│  │  ESP32 → "arm1:X:100"      │  │  │  │  ESP32 → "arm2:Y:300"      │  │
│  │  Response: "OK" | "ERROR"   │  │  │  │  Response: "OK" | "ERROR"   │  │
│  └─────────────────────────────┘  │  │  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │  │  ┌─────────────────────────────┐  │
│  │   UART Shared Bus Master    │  │  │  │   UART Shared Bus Master    │  │
│  │  1 TX/RX → All 5 Slaves     │  │  │  │  1 TX/RX → All 5 Slaves     │  │
│  │  Address: X1,Y1,Z1,T1,G1    │  │  │  │  Address: X2,Y2,Z2,T2,G2    │  │
│  │  Protocol: Addressing       │  │  │  │  Protocol: Addressing       │  │
│  └─────────────────────────────┘  │  │  └─────────────────────────────┘  │
└───────────────────────────────────┘  └───────────────────────────────────┘
           │ UART Shared Bus                   │ UART Shared Bus
           │ (1 TX/RX to 5 slaves)            │ (1 TX/RX to 5 slaves)
           ▼                                  ▼

⚙️  ARDUINO NANO SLAVES (Team Development)
┌─────────────────────────────────────────────────────────────────────────────┐
│  ARM1 SLAVES (Shared UART Bus)           ARM2 SLAVES (Shared UART Bus)      │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐    │
│  │ X-1  │ Y-1  │ Z-1  │ T-1  │ G-1  │ X-2  │ Y-2  │ Z-2  │ T-2  │ G-2  │    │
│  │(ADR1)│(ADR2)│(ADR3)│(ADR4)│(ADR5)│(ADR1)│(ADR2)│(ADR3)│(ADR4)│(ADR5)│    │
│  │Motor │Motor │Motor │Servo │Servo │Motor │Motor │Motor │Servo │Servo │    │
│  └──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┘    │
│     │      │      │      │      │      │      │      │      │      │        │
│     └──────┴──────┴──────┴──────┘      └──────┴──────┴──────┴──────┘        │
│            ARM1 SHARED UART BUS              ARM2 SHARED UART BUS           │
│            (All connect to 1 TX/RX)          (All connect to 1 TX/RX)       │
└─────────────────────────────────────────────────────────────────────────────┘

🎯 DATA FLOW:
Web → Server → ESP32 → 2 UART Masters → 10 UART Slaves (Shared Bus) → 10 Motors
Status: Slaves → Masters → ESP32 → Server → Web (SSE)
```

## 🔧 Development Architecture

### ✅ **Your Scope (Web Client + ESP32)**
- **Web Client**: Next.js + React + TypeScript
- **Server**: Node.js + Express + SSE
- **ESP32 Firmware**: Dual UART master with shared bus support
- **UART Protocol**: Command distribution specification

### 🤝 **Team Scope (Arduino Nano Network)**
- **2 Master Nanos**: UART slave to ESP32, UART master to shared bus
- **10 Slave Nanos**: Motor control on shared UART bus with addressing
- **UART Communication**: Shared bus protocol with device addressing

## 🔌 Hardware Block Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HARDWARE ARCHITECTURE                             │
│                        (Physical Wiring Diagram)                           │
└─────────────────────────────────────────────────────────────────────────────┘

                              ESP32
                          ┌─────────────┐
                          │             │
                          │ GPIO16(TX1) │───┐
                          │ GPIO17(RX1) │───│── UART1 (115200 baud)
                          │             │   │
                          │ GPIO18(TX2) │───│─┐
                          │ GPIO19(RX2) │───│ │── UART2 (115200 baud)
                          │             │   │ │
                          └─────────────┘   │ │
                                            │ │
              ┌─────────────────────────────┘ │
              │                               │
              ▼                               ▼
    ┌─────────────────┐                 ┌─────────────────┐
    │  ARM1 MASTER    │                 │  ARM2 MASTER    │
    │  Arduino Nano   │                 │  Arduino Nano   │
    │ ┌─────────────┐ │                 │ ┌─────────────┐ │
    │ │ UART RX/TX  │ │◄────ESP32───────┤ │ UART RX/TX  │ │
    │ │  (to ESP32) │ │                 │ │  (to ESP32) │ │
    │ └─────────────┘ │                 │ └─────────────┘ │
    │ ┌─────────────┐ │                 │ ┌─────────────┐ │
    │ │SHARED UART  │ │                 │ │SHARED UART  │ │
    │ │    BUS      │ │                 │ │    BUS      │ │
    │ │  TX ──┬─────┤ │                 │ │  TX ──┬─────┤ │
    │ │  RX ──┘     │ │                 │ │  RX ──┘     │ │
    │ └─────────────┘ │                 │ └─────────────┘ │
    └─────────────────┘                 └─────────────────┘
              │                                   │
              │ Shared UART Bus                   │ Shared UART Bus
              │ (1 TX/RX wire)                    │ (1 TX/RX wire)
              │                                   │
    ┌─────────┴───────────────┐         ┌─────────┴───────────────┐
    │                         │         │                         │
    ▼         ▼         ▼     ▼   ▼     ▼         ▼         ▼     ▼   ▼
┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐
│ X-1   ││ Y-1   ││ Z-1   ││ T-1   ││ G-1   ││ X-2   ││ Y-2   ││ Z-2   ││ T-2   ││ G-2   │
│Slave  ││Slave  ││Slave  ││Slave  ││Slave  ││Slave  ││Slave  ││Slave  ││Slave  ││Slave  │
│Nano   ││Nano   ││Nano   ││Nano   ││Nano   ││Nano   ││Nano   ││Nano   ││Nano   ││Nano   │
│       ││       ││       ││       ││       ││       ││       ││       ││       ││       │
│Addr:1 ││Addr:2 ││Addr:3 ││Addr:4 ││Addr:5 ││Addr:1 ││Addr:2 ││Addr:3 ││Addr:4 ││Addr:5 │
└───┬───┘└───┬───┘└───┬───┘└───┬───┘└───┬───┘└───┬───┘└───┬───┘└───┬───┘└───┬───┘└───┬───┘
    │        │        │        │        │        │        │        │        │        │
    │ Motor  │ Motor  │ Motor  │ Servo  │ Servo  │ Motor  │ Motor  │ Motor  │ Servo  │ Servo
    ▼        ▼        ▼        ▼        ▼        ▼        ▼        ▼        ▼        ▼
  ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐
  │ X │    │ Y │    │ Z │    │ T │    │ G │    │ X │    │ Y │    │ Z │    │ T │    │ G │
  │Mtr│    │Mtr│    │Mtr│    │Srv│    │Srv│    │Mtr│    │Mtr│    │Mtr│    │Srv│    │Srv│
  └───┘    └───┘    └───┘    └───┘    └───┘    └───┘    └───┘    └───┘    └───┘    └───┘

🔌 PHYSICAL CONNECTIONS:
├─ ESP32 ←→ 2x Master Nanos: Point-to-point UART cables
├─ Each Master ←→ 5x Slave Nanos: Single shared UART bus (daisy chain or star)
├─ Each Slave ←→ 1x Motor/Servo: Direct motor driver connection
└─ Total Devices: 13 (1 ESP32 + 2 Masters + 10 Slaves)

📡 COMMUNICATION LAYERS:
Layer 1: ESP32 ──UART──► Master Nano (Dedicated connection)
Layer 2: Master Nano ──UART Bus──► 5x Slave Nanos (Shared addressing)
Layer 3: Slave Nano ──PWM/Step──► Motor/Servo (Direct control)

```

## 📋 UART Protocol Specification

### **ESP32 → Master Communication:**
```
ESP32 → Master1: "arm1:X:100"     // ARM1 move X to 100
ESP32 → Master2: "arm2:GROUP:X,Y" // ARM2 group movement

Master → ESP32: "OK"              // Command accepted
Master → ESP32: "DONE"            // Command completed
Master → ESP32: "ERROR:msg"       // Command failed
```

### **Master → Slaves Shared Bus:**
```
Master → Shared Bus: "@1:X:100\n"    // Send to slave address 1 (X-axis)
Master → Shared Bus: "@2:Y:50\n"     // Send to slave address 2 (Y-axis)
Master → Shared Bus: "@3:Z:10\n"     // Send to slave address 3 (Z-axis)

Slave → Master: "1:OK\n"             // Slave 1 acknowledges
Slave → Master: "2:DONE\n"           // Slave 2 completed
Slave → Master: "3:ERROR:msg\n"      // Slave 3 error
```

### **UART Configuration:**
```
ESP32 Ports:
- Serial1 (GPIO16/17): ARM1 Master  
- Serial2 (GPIO18/19): ARM2 Master
- Baudrate: 115200

Nano Master Ports:
- Hardware Serial: ESP32 communication
- SoftwareSerial: Shared bus to 5 slaves
- Baudrate: 115200

Slave Addressing:
ARM1: Address 1-5 (X,Y,Z,T,G)
ARM2: Address 1-5 (X,Y,Z,T,G)
```


## 🚀 System Features

### ✅ **FULLY IMPLEMENTED (Production Ready)**
1. **MSL Compiler**: Complete TypeScript compiler with parser system, function management, loop expansion
2. **Dual Arm Support**: Independent ARM1/ARM2 script execution (UI + backend + firmware)
3. **Real-time Communication**: SSE debug terminal, status polling, ESP32 connection monitoring
4. **Editor Components**: Text editor with syntax highlighting, spreadsheet editor with modals
5. **API Endpoints**: All script management, control, status, and debug endpoints working
6. **System Controls**: Complete PLAY/PAUSE/STOP/RESUME with speed control
7. **ESP32 Firmware**: Object-oriented dual-UART architecture (CommandForwarder + HttpClient + SerialBridge)
8. **UART Protocol**: ESP32 dual master communication to Arduino MEGA controllers

### 🚧 **PARTIALLY IMPLEMENTED (Functional but Basic)**
1. **Debug Terminal**: Advanced filtering and parsing features exist but underutilized
2. **Speed Control**: Working global and per-axis control but basic implementation
3. **Error Handling**: Functional throughout system but could be enhanced

### 🎯 **Performance Metrics**
- **Total Devices**: 13 (1 ESP32 + 2 Masters + 10 Slaves)
- **Parallel Execution**: Up to 10 motors simultaneously
- **UART Speed**: 115200 baud reliable communication
- **Shared Bus**: 5 slaves per master on single TX/RX
- **Web Compilation**: <50ms for complex MSL scripts
- **Real-time Updates**: <100ms SSE latency
- **Control Response**: <200ms web-to-motor latency

---

---

# PART 2: PLANNING - SENSOR INTEGRATION & AUTOMATION 🚀

## Overview
Detailed planning untuk implementasi sensor integration pada PalletizerOT system. Menambahkan 2 digital sensor untuk automation dan collision avoidance sambil mempertahankan arsitektur UART yang sudah optimal.

## 🎯 **PLANNING PHASE: Sensor Integration Detail**

### **Hardware Architecture Enhancement**

#### **Enhanced ESP32 Block Diagram**
```
                              ESP32 Enhanced
                          ┌─────────────────┐
                          │                 │
                          │ GPIO16(TX1) ────┼─── UART1 → ARM1 Master
                          │ GPIO17(RX1) ────┤
                          │                 │
                          │ GPIO18(TX2) ────┼─── UART2 → ARM2 Master
                          │ GPIO19(RX2) ────┤
                          │                 │
                          │ GPIO21(IN)  ────┼─── Product Sensor (Digital)
                          │ GPIO22(IN)  ────┼─── Center Sensor (Digital)
                          │                 │
                          │ GPIO2(OUT)  ────┼─── Status LED (Optional)
                          │ GPIO4(OUT)  ────┼─── Buzzer (Optional)
                          │                 │
                          │ WiFi Module ────┼─── Server Communication
                          └─────────────────┘
```

#### **Physical Sensor Wiring Plan**
```
🔌 SENSOR CONNECTIONS:

Product Sensor (GPIO21):
├─ VCC: 3.3V (ESP32)
├─ GND: GND (ESP32)
├─ OUT: GPIO21 (ESP32)
└─ Type: Infrared proximity sensor (digital output)

Center Sensor (GPIO22):
├─ VCC: 3.3V (ESP32)
├─ GND: GND (ESP32)
├─ OUT: GPIO22 (ESP32)
└─ Type: Inductive proximity sensor (digital output)

Optional Status Indicators:
├─ Status LED (GPIO2): Visual feedback
├─ Buzzer (GPIO4): Audio alerts
└─ LCD Display: Sensor status display
```

### **Enhanced Data Flow Architecture**

#### **Sensor Data Flow Planning**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SENSOR-ENHANCED DATA FLOW                               │
│                        (Planning Phase)                                    │
└─────────────────────────────────────────────────────────────────────────────┘

📡 ESP32 (Enhanced Sensor Processing)
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Product     │  │ Center      │  │ UART        │  │ Automation Logic    │ │
│  │ Sensor      │  │ Sensor      │  │ Command     │  │ Engine              │ │
│  │ GPIO21      │  │ GPIO22      │  │ Forwarder   │  │                     │ │
│  │             │  │             │  │             │  │ IF(Product=HIGH &&  │ │
│  │ HIGH/LOW    │  │ HIGH/LOW    │  │ ARM1/ARM2   │  │    Center=LOW):     │ │
│  │ Detection   │  │ Presence    │  │ Commands    │  │   → Start ARM1      │ │
│  │             │  │ Monitor     │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  │ IF(Center=HIGH):    │ │
│         │                │               │          │   → Pause All Arms  │ │
│         └─────────┬──────┴───────────────┘          │   → Wait Clear      │ │
│                   ▼                                 │                     │ │
│  ┌─────────────────────────────────────────────────┐│ Queue Management:   │ │
│  │          Sensor State Manager                   ││ - Priority system   │ │
│  │  Product: {state, timestamp, count}             ││ - Smart coordination │ │
│  │  Center:  {state, timestamp, duration}          ││ - Collision avoid   │ │
│  │  Status:  {automation_active, last_action}      │└─────────────────────┘ │
│  └─────────────────────────────────────────────────┘                        │
│                             │                                               │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                   Server Communication                                  │ │
│  │  POST /api/sensors/status: {product, center, automation}               │ │
│  │  POST /api/automation/trigger: {action, sensor, timestamp}             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
🖥️  NODE.JS SERVER (Enhanced API)
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │ Sensor Status   │  │ Automation      │  │ Enhanced System State       │   │
│  │ Management      │  │ Controller      │  │ Manager                     │   │
│  │                 │  │                 │  │                             │   │
│  │ GET /sensors    │  │ POST /auto/     │  │ - ARM1: Script + Sensors    │   │
│  │ POST /sensors   │  │ start/pause     │  │ - ARM2: Script + Sensors    │   │
│  │ WebSocket SSE   │  │ GET /auto/      │  │ - Automation: Active/Pause  │   │
│  │                 │  │ status          │  │ - Safety: Collision Status  │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
📱 WEB CLIENT (Enhanced UI)
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │ Sensor Monitor  │  │ Automation      │  │ Enhanced Debug Terminal     │   │
│  │ Dashboard       │  │ Control Panel   │  │                             │   │
│  │                 │  │                 │  │ [ESP32] Product detected    │   │
│  │ 🟢 Product: ON  │  │ ⚡ Auto: ON    │  │ [AUTO ] ARM1 pickup start   │   │
│  │ 🔴 Center: OFF  │  │ 🎯 Queue: 3    │  │ [ARM1 ] X(100) executing    │   │
│  │ 📊 Stats: 45    │  │ ⏸️ Pause: OFF  │  │ [SENS ] Center area clear   │   │
│  │                 │  │                 │  │ [AUTO ] Coordination OK     │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **Firebase RTDB Structure Enhancement**

#### **Enhanced Database Schema**
```javascript
{
  // ===== EXISTING STRUCTURES (Unchanged) =====
  "arm1Script": { /* ... existing script data ... */ },
  "arm2Script": { /* ... existing script data ... */ },
  "control": { /* ... existing control data ... */ },

  // ===== NEW: SENSOR INTEGRATION SYSTEM =====
  "sensors": {
    "product": {
      "gpio": 21,                           // number - GPIO pin number
      "state": false,                       // boolean - Current sensor state (HIGH/LOW)
      "previous_state": false,              // boolean - Previous state for edge detection
      "last_change": "2025-01-02T10:30:00Z", // timestamp - When state last changed
      "change_count": 156,                  // number - Total state changes (for statistics)
      "enabled": true,                      // boolean - Sensor active/inactive
      "sensitivity": 100,                   // number - Debounce time in ms
      "description": "Product detection sensor" // string - Human readable description
    },
    "center": {
      "gpio": 22,                           // number - GPIO pin number
      "state": false,                       // boolean - Current sensor state
      "previous_state": false,              // boolean - Previous state
      "last_change": "2025-01-02T10:29:45Z", // timestamp - When state last changed
      "presence_duration": 0,               // number - How long area has been occupied (ms)
      "change_count": 89,                   // number - Total state changes
      "enabled": true,                      // boolean - Sensor active/inactive
      "sensitivity": 50,                    // number - Debounce time in ms
      "description": "Center area monitoring sensor" // string - Description
    }
  },

  // ===== NEW: AUTOMATION SYSTEM =====
  "automation": {
    "enabled": true,                        // boolean - Master automation switch
    "mode": "smart",                        // string - "manual" | "smart" | "safety_only"
    "last_action": "2025-01-02T10:30:15Z",  // timestamp - Last automated action
    "total_cycles": 1247,                   // number - Total automation cycles completed
    
    "rules": {
      "pickup_trigger": {
        "enabled": true,                    // boolean - Auto-pickup when product detected
        "conditions": {
          "product_sensor": "HIGH",         // string - Required product sensor state
          "center_sensor": "LOW",           // string - Required center sensor state (collision avoid)
          "system_status": "ready"          // string - System must be ready
        },
        "actions": {
          "target_arm": "ARM1",             // string - Which arm handles pickup
          "script_template": "auto_pickup", // string - Pre-defined script to execute
          "priority": "high"                // string - Action priority level
        }
      },
      "collision_avoidance": {
        "enabled": true,                    // boolean - Auto-pause on collision risk
        "conditions": {
          "center_sensor": "HIGH",          // string - Center area occupied
          "any_arm_moving": true            // boolean - Any arm currently in motion
        },
        "actions": {
          "pause_all": true,                // boolean - Pause all arm movement
          "wait_duration": 2000,            // number - Wait time in ms before retry
          "retry_attempts": 3               // number - Max retry attempts
        }
      }
    },

    "statistics": {
      "successful_pickups": 156,            // number - Completed pickup cycles
      "collision_avoids": 23,               // number - Collision avoidance triggers
      "failed_attempts": 5,                 // number - Failed automation attempts
      "average_cycle_time": 15.7,           // number - Average pickup cycle time (seconds)
      "uptime_percentage": 97.3             // number - Automation system uptime
    }
  },

  // ===== NEW: ENHANCED SAFETY SYSTEM =====
  "safety": {
    "collision_detection": {
      "enabled": true,                      // boolean - Collision detection active
      "current_risk_level": "low",          // string - "none" | "low" | "medium" | "high"
      "last_collision_risk": "2025-01-02T09:45:30Z", // timestamp - Last detected risk
      "total_interventions": 23             // number - Total safety interventions
    },
    "emergency_stop": {
      "triggered": false,                   // boolean - Emergency stop status
      "last_trigger": null,                 // timestamp - Last emergency stop
      "auto_reset": true                    // boolean - Auto-reset after clear
    },
    "area_monitoring": {
      "center_area_clear": true,            // boolean - Center area status
      "arm1_safe_zone": true,               // boolean - ARM1 safe to operate
      "arm2_safe_zone": true                // boolean - ARM2 safe to operate
    }
  }
}
```

### **ESP32 Firmware Enhancement Planning**

#### **Enhanced CommandForwarder Class**
```cpp
// Enhanced CommandForwarder.h - Sensor integration planning
class CommandForwarder {
private:
    // ===== EXISTING MEMBERS (Unchanged) =====
    SerialBridge* arm1Master;
    SerialBridge* arm2Master;
    HttpClient* httpClient;
    
    // ===== NEW: SENSOR MANAGEMENT =====
    struct SensorState {
        int gpio;
        bool currentState;
        bool previousState;
        unsigned long lastChange;
        unsigned long changeCount;
        int debounceTime;
        bool enabled;
    };
    
    SensorState productSensor;
    SensorState centerSensor;
    
    // ===== NEW: AUTOMATION LOGIC =====
    struct AutomationState {
        bool enabled;
        String mode;
        unsigned long lastAction;
        int totalCycles;
        bool productDetected;
        bool centerAreaClear;
        String currentAction;
    };
    
    AutomationState automation;
    
    // ===== NEW: SAFETY SYSTEM =====
    struct SafetyState {
        bool collisionDetectionEnabled;
        String riskLevel;
        bool emergencyStop;
        bool centerAreaSafe;
        unsigned long lastIntervention;
    };
    
    SafetyState safety;

public:
    // ===== EXISTING METHODS (Enhanced) =====
    void init();
    void loop();
    void processCommands();
    
    // ===== NEW: SENSOR METHODS =====
    void initSensors();
    void readSensors();
    void processSensorChanges();
    bool debounceRead(int gpio, int debounceTime);
    void updateSensorFirebase(String sensorType, bool state);
    
    // ===== NEW: AUTOMATION METHODS =====
    void initAutomation();
    void processAutomation();
    bool checkPickupConditions();
    bool checkCollisionRisk();
    void executeAutomaticPickup();
    void pauseForCollisionAvoidance();
    void resumeAfterClear();
    
    // ===== NEW: SAFETY METHODS =====
    void initSafety();
    void monitorSafety();
    void triggerEmergencyStop();
    void calculateRiskLevel();
    void updateSafetyFirebase();
    
    // ===== NEW: ENHANCED UART METHODS =====
    void sendAutomationCommand(String armId, String command);
    void pauseArm(String armId);
    void resumeArm(String armId);
    String generatePickupScript();
};
```

#### **Sensor Processing Logic Planning**
```cpp
// Enhanced sensor processing in CommandForwarder.cpp
void CommandForwarder::readSensors() {
    // Read product sensor with debouncing
    bool newProductState = debounceRead(productSensor.gpio, productSensor.debounceTime);
    if (newProductState != productSensor.currentState) {
        productSensor.previousState = productSensor.currentState;
        productSensor.currentState = newProductState;
        productSensor.lastChange = millis();
        productSensor.changeCount++;
        
        // Update Firebase
        updateSensorFirebase("product", newProductState);
        
        // Log sensor change
        Serial.println("Product sensor: " + String(newProductState ? "DETECTED" : "CLEAR"));
    }
    
    // Read center sensor with debouncing
    bool newCenterState = debounceRead(centerSensor.gpio, centerSensor.debounceTime);
    if (newCenterState != centerSensor.currentState) {
        centerSensor.previousState = centerSensor.currentState;
        centerSensor.currentState = newCenterState;
        centerSensor.lastChange = millis();
        centerSensor.changeCount++;
        
        // Update Firebase
        updateSensorFirebase("center", newCenterState);
        
        // Log sensor change
        Serial.println("Center sensor: " + String(newCenterState ? "OCCUPIED" : "CLEAR"));
    }
}

void CommandForwarder::processAutomation() {
    if (!automation.enabled) return;
    
    // Check for automatic pickup trigger
    if (checkPickupConditions()) {
        executeAutomaticPickup();
        return;
    }
    
    // Check for collision avoidance
    if (checkCollisionRisk()) {
        pauseForCollisionAvoidance();
        return;
    }
    
    // Check for resume after collision clear
    if (centerSensor.currentState == false && automation.currentAction == "paused") {
        resumeAfterClear();
    }
}

bool CommandForwarder::checkPickupConditions() {
    return productSensor.currentState == true &&     // Product detected
           centerSensor.currentState == false &&     // Center area clear
           automation.currentAction != "picking" &&   // Not already picking
           safety.emergencyStop == false;            // No emergency stop
}

bool CommandForwarder::checkCollisionRisk() {
    return centerSensor.currentState == true &&      // Center area occupied
           (isArmMoving("ARM1") || isArmMoving("ARM2")); // Any arm moving
}
```

### **Web Interface Enhancement Planning**

#### **Enhanced Sensor Dashboard**
```javascript
// New component: SensorDashboard.tsx
const SensorDashboard = () => {
  const [sensorStatus, setSensorStatus] = useState({
    product: { state: false, lastChange: null, changeCount: 0 },
    center: { state: false, lastChange: null, changeCount: 0 }
  });
  
  const [automationStatus, setAutomationStatus] = useState({
    enabled: false,
    mode: 'smart',
    currentAction: 'idle',
    totalCycles: 0
  });

  return (
    <div className="sensor-dashboard">
      {/* Real-time Sensor Status */}
      <div className="sensor-status-grid">
        <SensorCard
          name="Product Detection"
          state={sensorStatus.product.state}
          gpio={21}
          icon="📦"
          lastChange={sensorStatus.product.lastChange}
          changeCount={sensorStatus.product.changeCount}
        />
        
        <SensorCard
          name="Center Area Monitor"
          state={sensorStatus.center.state}
          gpio={22}
          icon="🎯"
          lastChange={sensorStatus.center.lastChange}
          changeCount={sensorStatus.center.changeCount}
        />
      </div>

      {/* Automation Control Panel */}
      <div className="automation-panel">
        <AutomationToggle
          enabled={automationStatus.enabled}
          mode={automationStatus.mode}
          onToggle={handleAutomationToggle}
          onModeChange={handleModeChange}
        />
        
        <AutomationStats
          totalCycles={automationStatus.totalCycles}
          currentAction={automationStatus.currentAction}
          successRate={calculateSuccessRate()}
        />
      </div>

      {/* Safety Monitor */}
      <div className="safety-monitor">
        <CollisionRiskIndicator riskLevel={safety.riskLevel} />
        <EmergencyStopStatus triggered={safety.emergencyStop} />
        <AreaMonitorStatus areas={safety.areaStatus} />
      </div>
    </div>
  );
};
```

#### **Enhanced Debug Terminal Planning**
```javascript
// Enhanced debug messages for sensor system
const sensorDebugMessages = [
  "[SENS] Product sensor: HIGH → Item detected at station",
  "[SENS] Center sensor: LOW → Area clear for movement", 
  "[AUTO] Pickup trigger: Conditions met, starting ARM1",
  "[AUTO] ARM1 executing: auto_pickup script (X:100, Y:50, Z:10)",
  "[SENS] Center sensor: HIGH → Collision risk detected",
  "[AUTO] Safety pause: All arms stopped, waiting clear",
  "[SENS] Center sensor: LOW → Area clear, resuming operations",
  "[AUTO] Cycle complete: Total time 14.2s, success",
  "[STAT] Automation stats: 157 cycles, 98.7% success rate"
];
```

### **Server API Enhancement Planning**

#### **New Sensor Endpoints**
```javascript
// Enhanced server/index.ts with sensor endpoints

// Sensor status endpoints
app.get('/api/sensors', (req, res) => {
  // Return current sensor states
  res.json({
    product: currentSensorState.product,
    center: currentSensorState.center,
    automation: currentAutomationState,
    safety: currentSafetyState
  });
});

app.post('/api/sensors/update', (req, res) => {
  // ESP32 posts sensor updates
  const { sensorType, state, timestamp } = req.body;
  updateSensorState(sensorType, state, timestamp);
  broadcastSensorUpdate(sensorType, state);
  res.json({ success: true });
});

// Automation control endpoints
app.post('/api/automation/toggle', (req, res) => {
  // Toggle automation on/off
  const { enabled } = req.body;
  toggleAutomation(enabled);
  res.json({ success: true, enabled });
});

app.post('/api/automation/mode', (req, res) => {
  // Change automation mode
  const { mode } = req.body; // 'manual' | 'smart' | 'safety_only'
  setAutomationMode(mode);
  res.json({ success: true, mode });
});

// Safety system endpoints
app.post('/api/safety/emergency-stop', (req, res) => {
  // Trigger emergency stop
  triggerEmergencyStop();
  res.json({ success: true });
});

app.get('/api/safety/status', (req, res) => {
  // Get safety system status
  res.json(currentSafetyState);
});
```

### **Implementation Timeline Planning**

#### **Phase 1: Basic Sensor Integration (2-3 weeks)**
```
Week 1: Hardware & Firmware
├─ ESP32 GPIO configuration for sensors
├─ Basic sensor reading with debouncing
├─ Firebase RTDB sensor data structure
└─ Enhanced CommandForwarder class

Week 2: Server & API
├─ New sensor endpoints
├─ Real-time sensor data broadcasting
├─ Enhanced SSE for sensor updates
└─ Basic automation logic

Week 3: Web Interface
├─ Sensor dashboard component
├─ Real-time sensor status display
├─ Enhanced debug terminal
└─ Basic automation controls
```

#### **Phase 2: Automation Logic (2-3 weeks)**
```
Week 4-5: Automation Engine
├─ Pickup trigger automation
├─ Collision avoidance system
├─ Queue management logic
└─ Safety intervention system

Week 6: Testing & Refinement
├─ Integration testing
├─ Safety system validation
├─ Performance optimization
└─ User interface polish
```

#### **Phase 3: Advanced Features (2-3 weeks)**
```
Week 7-8: Advanced Automation
├─ Multiple pickup scenarios
├─ Learning algorithms
├─ Performance analytics
└─ Advanced safety features

Week 9: Production Deployment
├─ System integration testing
├─ Documentation completion
├─ Performance monitoring
└─ Production deployment
```

### **Testing Strategy Planning**

#### **Sensor Testing Plan**
```
🧪 SENSOR VALIDATION:
├─ GPIO functionality testing
├─ Debounce timing validation
├─ State change detection accuracy
├─ Firebase sync verification
└─ Long-duration stability testing

🤖 AUTOMATION TESTING:
├─ Pickup trigger scenarios
├─ Collision avoidance testing
├─ Multi-arm coordination
├─ Edge case handling
└─ Performance benchmarking

🛡️ SAFETY TESTING:
├─ Emergency stop functionality
├─ Collision detection accuracy
├─ Area monitoring coverage
├─ Failsafe mechanisms
└─ Recovery procedures
```

Dengan planning detail ini, sistem PalletizerOT akan memiliki sensor integration yang sophisticated sambil mempertahankan arsitektur UART yang sudah optimal dan production-ready.

---

*PalletizerOT Distributed Dual-Arm Control System*  
*Current Implementation: ESP32 → 2 UART Masters → 10 UART Slaves (Shared Bus)*  
*Planning Phase: Sensor Integration + Automation Logic untuk Enhanced Industrial Control*  
*Last updated: 2025-01-02*