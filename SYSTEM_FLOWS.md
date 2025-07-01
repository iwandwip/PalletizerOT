# PalletizerOT System Flow Documentation

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PalletizerOT Dual-Arm Control System                    │
│                          (13 Device Network)                               │
└─────────────────────────────────────────────────────────────────────────────┘

Web Client ──HTTP──► Node.js Server ──HTTP/WiFi──► ESP32 Bridge
(Next.js)              (Express API)                (I2C Master)
    │                       │                           │
    │ MSL Compiler           │ Command Storage           │ I2C Distribution
    ▼                       ▼                           ▼
["X(100)", "Y(50)"]    ARM1/ARM2 Scripts         ARM1 Master (0x10)
                                                 ARM2 Master (0x20)
                                                        │
                                               5 Slave Nanos per Arm
                                               (10 Motors Total)

         DISTRIBUTED ARCHITECTURE: ESP32 → 2 Masters → 10 Slaves
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

📡 ESP32 WIFI BRIDGE (I2C Master)
┌─────────────────────────────────────────────────────────────────────────────┐
│  Command Forwarder (Enhanced)                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │ ARM1 Queue  │    │ ARM2 Queue  │    │      I2C Controller             │ │
│  │ 15 commands │    │ 8 commands  │    │ ARM1 Master (0x10): OK ✅      │ │
│  │ Index: 3    │    │ Index: 1    │    │ ARM2 Master (0x20): OK ✅      │ │
│  │ Status: RUN │    │ Status: RUN │    │ Wire.begin() 100kHz ✅         │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
           │ I2C Send: "arm1:X:100"           │ I2C Send: "arm2:Y:300"
           ▼                                  ▼

🤖 ARDUINO NANO MASTERS (Team Development)
┌───────────────────────────────────┐  ┌───────────────────────────────────┐
│        ARM1 MASTER (0x10)         │  │        ARM2 MASTER (0x20)         │
│  ┌─────────────────────────────┐  │  │  ┌─────────────────────────────┐  │
│  │     I2C Slave Receiver      │  │  │  │     I2C Slave Receiver      │  │
│  │  ESP32 → "arm1:X:100"      │  │  │  │  ESP32 → "arm2:Y:300"      │  │
│  │  Response: "OK" | "ERROR"   │  │  │  │  Response: "OK" | "ERROR"   │  │
│  └─────────────────────────────┘  │  │  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │  │  ┌─────────────────────────────┐  │
│  │    I2C Master Distributor   │  │  │  │    I2C Master Distributor   │  │
│  │  X → Slave 0x11             │  │  │  │  Y → Slave 0x22             │  │
│  │  Y → Slave 0x12             │  │  │  │  X → Slave 0x21             │  │
│  │  Z → Slave 0x13             │  │  │  │  Z → Slave 0x23             │  │
│  │  T → Slave 0x14             │  │  │  │  T → Slave 0x24             │  │
│  │  G → Slave 0x15             │  │  │  │  G → Slave 0x25             │  │
│  └─────────────────────────────┘  │  │  └─────────────────────────────┘  │
└───────────────────────────────────┘  └───────────────────────────────────┘
           │ I2C to 5 Slaves                    │ I2C to 5 Slaves
           ▼                                    ▼

⚙️  ARDUINO NANO SLAVES (Team Development)
┌─────────────────────────────────────────────────────────────────────────────┐
│  ARM1 SLAVES                              ARM2 SLAVES                       │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐    │
│  │ X-1  │ Y-1  │ Z-1  │ T-1  │ G-1  │ X-2  │ Y-2  │ Z-2  │ T-2  │ G-2  │    │
│  │(0x11)│(0x12)│(0x13)│(0x14)│(0x15)│(0x21)│(0x22)│(0x23)│(0x24)│(0x25)│    │
│  │Motor │Motor │Motor │Servo │Servo │Motor │Motor │Motor │Servo │Servo │    │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

🎯 DATA FLOW:
Web → Server → ESP32 → 2 Masters → 10 Slaves → 10 Motors
Status: Slaves → Masters → ESP32 → Server → Web (SSE)
```

## 🔧 Development Architecture

### ✅ **Your Scope (Web Client + ESP32)**
- **Web Client**: Next.js + React + TypeScript
- **Server**: Node.js + Express + SSE
- **ESP32 Firmware**: I2C master with dual-arm support
- **I2C Protocol**: Command distribution specification

### 🤝 **Team Scope (Arduino Nano Network)**
- **2 Master Nanos**: I2C slave to ESP32, I2C master to slaves
- **10 Slave Nanos**: Motor control with AccelStepper
- **I2C Communication**: Master-slave protocol implementation

## 📋 I2C Protocol Specification

### **Command Format:**
```
ESP32 → Master: "arm1:X:100"     // ARM1 move X to 100
ESP32 → Master: "arm2:GROUP:X,Y" // ARM2 group movement

Master → ESP32: "OK"             // Command accepted
Master → ESP32: "DONE"           // Command completed
Master → ESP32: "ERROR:msg"      // Command failed
```

### **I2C Addresses:**
```
ARM1 Master: 0x10
ARM1 Slaves: 0x11 (X), 0x12 (Y), 0x13 (Z), 0x14 (T), 0x15 (G)

ARM2 Master: 0x20  
ARM2 Slaves: 0x21 (X), 0x22 (Y), 0x23 (Z), 0x24 (T), 0x25 (G)
```

## 🚀 System Features

### ✅ **Completed (Production Ready)**
1. **Dual Arm Support**: Independent ARM1/ARM2 script execution
2. **MSL Compiler**: Full TypeScript compiler in web client
3. **I2C Architecture**: ESP32 dual master with 13-device network
4. **Real-time Debugging**: SSE terminal with distributed status
5. **Clean Web Interface**: Active components only, deprecated removed

### 🎯 **Performance Metrics**
- **Total Devices**: 13 (1 ESP32 + 2 Masters + 10 Slaves)
- **Parallel Execution**: Up to 10 motors simultaneously
- **I2C Speed**: 100kHz reliable communication
- **Web Compilation**: <50ms for complex MSL scripts
- **Real-time Updates**: <100ms SSE latency

---

*PalletizerOT Distributed Dual-Arm Control System*  
*Architecture: ESP32 → 2 Arduino Nano Masters → 10 Arduino Nano Slaves*  
*Last updated: 2025-01-01*