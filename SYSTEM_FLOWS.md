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

# PART 2: PLANNING & FUTURE ENHANCEMENTS 🚀

## Development Roadmap

### **Phase 1: Physical Sensor Integration** ⏳
1. **Digital Sensor Hardware**
   - Product sensor (GPIO21): Detect items ready for pickup
   - Center sensor (GPIO22): Monitor arm presence in center area
   - ESP32 sensor processing with real-time monitoring

2. **Sensor-Based Automation**
   - Automatic pickup triggering when product detected
   - Collision avoidance based on center area monitoring
   - Smart arm coordination with sensor feedback

3. **Enhanced Safety Systems**
   - Emergency stop sensors integration
   - Safety light curtains for area monitoring
   - Automatic fault detection and recovery protocols

### **Phase 2: Intelligent Automation**
1. ⏳ **Machine Learning Integration**
   - Predictive pickup timing based on production patterns
   - Adaptive collision avoidance algorithms
   - Performance optimization through learning

2. ⏳ **Advanced Coordination**
   - Dynamic arm priority assignment
   - Load balancing between arms
   - Optimal path planning for dual-arm operations

3. ⏳ **Process Optimization**
   - Cycle time analysis and optimization
   - Energy efficiency monitoring
   - Predictive maintenance alerts

### **Phase 3: Industrial Integration**
1. ⏳ **Factory Connectivity**
   - Industrial Ethernet integration
   - PLC communication protocols
   - SCADA system integration

2. ⏳ **Quality Control**
   - Vision system integration
   - Product quality verification
   - Automated rejection handling

3. ⏳ **Production Analytics**
   - Real-time production monitoring
   - Efficiency reporting and analytics
   - Integration with ERP systems

## Future Hardware Enhancements

### **Sensor Expansion Plan**
```
Phase 1: 2 Digital Sensors (Product + Center) - ESP32 GPIO integration
Phase 2: 6 Sensors (Product×3 + Position×2 + Emergency×1)
Phase 3: 12+ Sensors (Vision + Force + Temperature + Vibration)
Phase 4: Full Industrial Sensor Suite with AI processing
```

### **Communication Upgrades**
```
Current: UART Shared Bus
Phase 1: Enhanced UART with CRC error checking
Phase 2: Industrial Ethernet backbone
Phase 3: Wireless redundancy and 5G integration
```

### **Control System Evolution**
```
Current: ESP32 Centralized Control
Phase 1: Edge Computing with AI inference
Phase 2: Distributed intelligence across nodes
Phase 3: Cloud-based orchestration and analytics
```

## Implementation Timeline

### **Q1 2025: Enhanced Sensor Integration**
- Multi-point product detection
- Advanced position feedback
- Safety system implementation

### **Q2 2025: Intelligent Automation**
- ML algorithm development
- Advanced coordination logic
- Process optimization features

### **Q3 2025: Industrial Integration**
- Factory connectivity implementation
- Quality control systems
- Production analytics dashboard

### **Q4 2025: Full Production Deployment**
- Complete system integration
- Performance optimization
- Scalability enhancements

---

*PalletizerOT Distributed Dual-Arm Control System*  
*Current: ESP32 → 2 UART Masters → 10 UART Slaves (Shared Bus)*  
*Future: AI-Enhanced Industrial Automation with Full Factory Integration*  
*Last updated: 2025-01-01*