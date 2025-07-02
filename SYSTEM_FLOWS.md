# PalletizerOT System Flow Documentation (Current Implementation & Planning)

# PART 1: CURRENT IMPLEMENTATION ✅

## Overview
Dokumentasi sistem PalletizerOT yang **sudah terimplementasi** - Industrial dual-arm palletizer control system dengan distributed UART architecture dan sensor integration untuk automatic operation dengan collision avoidance.

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
                          │ GPIO21(IN)  │───│─│── Product Sensor (Digital)
                          │ GPIO22(IN)  │───│─│── Center Sensor (Digital)
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
├─ ESP32 ←→ Product Sensor: Digital input (GPIO21)
├─ ESP32 ←→ Center Sensor: Digital input (GPIO22)
└─ Total Devices: 15 (1 ESP32 + 2 Masters + 10 Slaves + 2 Sensors)

📡 COMMUNICATION LAYERS:
Layer 1: ESP32 ──UART──► Master Nano (Dedicated connection)
Layer 2: Master Nano ──UART Bus──► 5x Slave Nanos (Shared addressing)
Layer 3: Slave Nano ──PWM/Step──► Motor/Servo (Direct control)
Layer 4: ESP32 ──GPIO──► Digital Sensors (Product & Center detection)

🎯 ESP32 SENSOR FUNCTIONALITY:
Product Sensor (GPIO21) - ESP32 Only:
├─ HIGH: Product detected (ready for pickup)
├─ LOW: No product available
├─ Connection: Direct to ESP32 digital input
└─ Purpose: Automatic pickup trigger detection

Center Sensor (GPIO22) - ESP32 Only:
├─ HIGH: Any arm detected in center area
├─ LOW: Center area clear
├─ Limitation: Cannot distinguish ARM1 vs ARM2
├─ Connection: Direct to ESP32 digital input
└─ Purpose: Collision avoidance and area monitoring

📍 SENSOR SCOPE:
├─ ESP32: Handles both sensors + autonomous logic
├─ Arduino Masters: No sensor connections
├─ Arduino Slaves: No sensor connections
└─ Sensors only report to ESP32 for centralized decision making

💡 SENSOR PROCESSING (ESP32 Only):
├─ Sensor reading: digitalRead(GPIO21) & digitalRead(GPIO22)
├─ Real-time monitoring: Check sensors every update cycle
├─ Status reporting: Send sensor states to web client via server
├─ Automation logic: ESP32 can trigger actions based on sensor states
└─ Integration: Sensors work with existing dual-arm UART system
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

## 🤖 Automation Logic with Sensors

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SENSOR-BASED AUTOMATION                            │
│                           (ESP32 Processing)                               │
└─────────────────────────────────────────────────────────────────────────────┘

🔄 AUTOMATION WORKFLOW:

1. Product Detection Cycle:
   ┌─ Product Sensor (GPIO21) ──► HIGH ──┐
   │                                      │
   │  ┌─ Center Sensor (GPIO22) ──► LOW ──┤
   │  │                                   ▼
   │  │                            ✅ Start Pickup
   │  │                            │
   │  │  ┌─ Center Sensor ──► HIGH ──┤
   │  │  │                           ▼
   │  │  │                    ⚠️ Wait (Collision Risk)
   │  │  │                           │
   │  │  │  ┌─ Center Sensor ──► LOW ──┤
   │  │  │  │                         ▼
   │  │  │  │                  ✅ Resume Pickup
   │  └──┴──┴─────────────────────────┘
   │
   └─ Product Sensor ──► LOW ──► ⏸️ No Action (Wait for Product)

2. Collision Avoidance:
   IF (Center Sensor == HIGH && Any Arm Moving to Center):
       ► Pause current arm movement
       ► Wait for Center Sensor == LOW
       ► Resume movement

3. Smart Coordination:
   ARM1 Priority: Product pickup when detected
   ARM2 Priority: Placement operations
   Center Monitoring: Continuous collision avoidance
```

## 🚀 System Features

### ✅ **Completed (Production Ready)**
1. **Dual Arm Support**: Independent ARM1/ARM2 script execution
2. **MSL Compiler**: Full TypeScript compiler in web client
3. **UART Shared Bus Architecture**: ESP32 dual master with 15-device network
4. **Digital Sensor Integration**: Product detection & center area monitoring
5. **Automation Logic**: Sensor-based collision avoidance and smart coordination
6. **Real-time Debugging**: SSE terminal with distributed status
7. **Clean Web Interface**: Active components only, deprecated removed

### 🎯 **Performance Metrics**
- **Total Devices**: 15 (1 ESP32 + 2 Masters + 10 Slaves + 2 Sensors)
- **Parallel Execution**: Up to 10 motors simultaneously
- **UART Speed**: 115200 baud reliable communication
- **Shared Bus**: 5 slaves per master on single TX/RX
- **Sensor Monitoring**: Real-time digital input polling
- **Automation Response**: <10ms sensor-to-action latency
- **Web Compilation**: <50ms for complex MSL scripts
- **Real-time Updates**: <100ms SSE latency

---

---

# PART 2: PLANNING & FUTURE ENHANCEMENTS 🚀

## Development Roadmap

### **Phase 1: Advanced Sensor Integration**
1. ⏳ **Multi-Point Product Detection**
   - Multiple product sensors for different stations
   - Product type identification with analog sensors
   - Queue management for multiple products

2. ⏳ **Enhanced Position Feedback**
   - Individual arm position sensors
   - Real-time coordinate tracking
   - Precise collision detection with arm identification

3. ⏳ **Safety Systems**
   - Emergency stop sensors
   - Area monitoring with safety light curtains
   - Automatic fault detection and recovery

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
Current: 2 Digital Sensors (Product + Center)
Phase 1: 6 Sensors (Product×3 + Position×2 + Emergency×1)
Phase 2: 12+ Sensors (Vision + Force + Temperature + Vibration)
Phase 3: Full Industrial Sensor Suite
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
*Current: ESP32 + 2 Sensors → 2 UART Masters → 10 UART Slaves (Shared Bus)*  
*Future: AI-Enhanced Industrial Automation with Full Factory Integration*  
*Last updated: 2025-01-01*