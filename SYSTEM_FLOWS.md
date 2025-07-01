# PalletizerOT System Flow Documentation

## 🏗️ System Architecture

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

### ✅ **Completed (Production Ready)**
1. **Dual Arm Support**: Independent ARM1/ARM2 script execution
2. **MSL Compiler**: Full TypeScript compiler in web client
3. **UART Shared Bus Architecture**: ESP32 dual master with 13-device network
4. **Real-time Debugging**: SSE terminal with distributed status
5. **Clean Web Interface**: Active components only, deprecated removed

### 🎯 **Performance Metrics**
- **Total Devices**: 13 (1 ESP32 + 2 Masters + 10 Slaves)
- **Parallel Execution**: Up to 10 motors simultaneously
- **UART Speed**: 115200 baud reliable communication
- **Shared Bus**: 5 slaves per master on single TX/RX
- **Web Compilation**: <50ms for complex MSL scripts
- **Real-time Updates**: <100ms SSE latency

---

*PalletizerOT Distributed Dual-Arm Control System*  
*Architecture: ESP32 → 2 UART Masters → 10 UART Slaves (Shared Bus)*  
*Last updated: 2025-01-01*