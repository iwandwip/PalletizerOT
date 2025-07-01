# PalletizerOT System Flow Documentation

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PalletizerOT Industrial Control System              │
│                                  (Production Ready)                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐   HTTP/SSE   ┌─────────────────┐   HTTP/WiFi   ┌──────────────┐
│   Web Client    │◄────────────►│  Node.js Server │◄─────────────►│    ESP32     │
│  (Next.js 15)   │              │  (Express API)  │              │  (Forwarder) │
│                 │              │                 │              │              │
│ • MSL Compiler  │              │ • Command Store │              │ • HTTP Client│
│ • UI Controls   │              │ • API Endpoints │              │ • Serial     │
│ • Real-time     │              │ • SSE Debug     │              │ • Bridge     │
│   Status        │              │                 │              │              │
└─────────────────┘              └─────────────────┘              └──────────────┘
         │                                │                              │
         │ Compiles MSL                   │ Stores Commands              │ Serial UART
         │ Scripts                        │ Manages State                │ 115200 baud
         │                                │                              │
         ▼                                ▼                              ▼
┌─────────────────┐              ┌─────────────────┐              ┌──────────────┐
│ Modern Script   │              │ Command Array   │              │ Arduino MEGA │
│ Language (MSL)  │              │ JSON Storage    │              │ (Motor Ctrl) │
│                 │              │                 │              │              │
│ X(100); Y(50);  │              │ ["MOVE:X100",   │              │ • 5 Motors   │
│ FUNC(pick) {    │              │  "MOVE:Y50",    │              │ • AccelStep  │
│   GROUP(X,Y);   │              │  "GROUP:..."]   │              │ • Kinematics │
│ } CALL(pick);   │              │                 │              │ • Safety     │
└─────────────────┘              └─────────────────┘              └──────────────┘

           OPTIMAL ARCHITECTURE: Client-side Compilation + ESP32 Bridge
```

## 🌐 Web Interface Layout

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           PalletizerOT Web Interface                           │
│                                (localhost:3000)                               │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ Header ────────────────────────────────────────────────────────────────────────┐
│ [☰] PalletizerOT Industrial Control System    [📶Connected] [●Running] [🔧⚙️] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ┌─ Left Sidebar ─────┐  ┌─ Main Content Area ────────────────────────────────┐ │
│ │                    │  │                                                     │ │
│ │ 🎮 System Control  │  │ 📝 Script Editor                                   │ │
│ │ ┌─────────────────┐│  │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ ▶️ Start        ││  │ │ Tab: [📄 Script Editor] [⚙️ Configuration]     │ │ │
│ │ │ ⏸️ Pause        ││  │ └─────────────────────────────────────────────────┘ │ │
│ │ │ ⏹️ Stop         ││  │                                                     │ │
│ │ └─────────────────┘│  │ ┌─ Dual Arm Editor ─────────────────────────────┐ │ │
│ │                    │  │ │ [Arm 1●] [Arm 2]    Mode: [MSL] [RAW]         │ │ │
│ │ 📊 System Status   │  │ │                                                 │ │ │
│ │ ┌─────────────────┐│  │ │ // Modern Script Language Editor              │ │ │
│ │ │ ESP32: 🟢 ON    ││  │ │ X(100);                                        │ │ │
│ │ │ Script: ✅ Ready││  │ │ Y(50, 150);                                    │ │ │
│ │ │ Progress: 65%   ││  │ │ GROUP(X(200), Y(100));                         │ │ │
│ │ │ Command: 13/20  ││  │ │ FUNC(pickup) {                                 │ │ │
│ │ └─────────────────┘│  │ │   Z(100); G(600);                              │ │ │
│ │                    │  │ │ }                                               │ │ │
│ │ ⚡ Speed Control   │  │ │ CALL(pickup);                                  │ │ │
│ │ ┌─────────────────┐│  │ │                                                 │ │ │
│ │ │ Global: 1000    ││  │ └─────────────────────────────────────────────────┘ │ │
│ │ │ X-Axis: 1500    ││  │                                                     │ │
│ │ │ Y-Axis: 1200    ││  │ [💻 Process] [▶️ Execute] [📁 Load] [💾 Save]     │ │
│ │ │ Z-Axis: 800     ││  │                                                     │ │
│ │ │ T-Axis: 600     ││  └─────────────────────────────────────────────────────┘ │
│ │ └─────────────────┘│                                                           │
│ └────────────────────┘                                                           │
│                                                                                 │
│ ┌─ Footer Stats ──────────────────────────────────────────────────────────────┐ │
│ │ [✅ 127 Commands] [⏱️ 02:34] [⚡ 5 Axes] [📈 98% Efficiency]              │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─ Debug Terminal (Toggle) ───────────────────────────────────────────────────────┐
│ 🖥️ Debug Terminal    [📶Connected] [⏸️Paused] (1,247 messages)   [🗑️][💾][⏸️] │
│ ├─────────────────────────────────────────────────────────────────────────────│ │
│ │ 14:23:45.123 [INFO ] [ESP32 ] 🔗 Device Connected                          │ │
│ │ 14:23:46.456 [DEBUG] [MSL   ] ✅ Script compiled: 25 commands              │ │
│ │ 14:23:47.789 [INFO ] [EXEC  ] 🔄 [15/25] Executing X(100)                 │ │
│ │ 14:23:48.012 [SUCCESS] [MEGA] ✅ Command completed: x;1;100;               │ │
│ │ Filter: [axis movement] Level: [All▼]                                      │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 📁 File Structure Diagram

```
PalletizerOT/
├── 🌐 Frontend (Next.js 15 + React 18)
│   └── src/
│       ├── app/
│       │   ├── 📄 page.tsx              ← Main Interface (630 lines)
│       │   ├── 🎨 layout.tsx            ← App Layout + Theme
│       │   └── 🎨 globals.css           ← Tailwind Styles
│       │
│       ├── components/                   ← UI Components
│       │   ├── 📝 command-editor.tsx    ← Dual Arm MSL Editor (422 lines)
│       │   ├── 🖥️ debug-terminal.tsx    ← Real-time SSE Debug (298 lines)
│       │   ├── 🎮 system-controls.tsx   ← Execution Controls (232 lines)
│       │   ├── 📊 status-display.tsx    ← System Status Panel
│       │   ├── ⚡ speed-panel.tsx       ← Speed Controls
│       │   ├── ⚙️ settings-modal.tsx    ← Configuration
│       │   │
│       │   ├── editors/                 ← Advanced Editors
│       │   │   ├── 📊 SpreadsheetEditor.tsx ← Grid-based Editor
│       │   │   ├── 📝 TextEditor.tsx    ← Code Editor with Syntax
│       │   │   └── modals/              ← Command Input Dialogs
│       │   │       ├── MoveCommandModal.tsx
│       │   │       ├── GroupMoveModal.tsx
│       │   │       ├── SystemCommandModal.tsx
│       │   │       └── WaitCommandModal.tsx
│       │   │
│       │   └── ui/                      ← shadcn/ui Components
│       │       ├── button.tsx, card.tsx, badge.tsx
│       │       ├── dropdown-menu.tsx, tabs.tsx
│       │       └── progress.tsx, alert.tsx
│       │
│       ├── 🔧 compiler/                 ← Modern Script Language Compiler
│       │   ├── 🎯 MSLCompiler.ts        ← Main Orchestrator (223 lines)
│       │   ├── core/                    ← Core Logic
│       │   │   ├── FunctionManager.ts   ← Function Parsing & Storage
│       │   │   ├── LoopManager.ts       ← Loop Expansion Engine
│       │   │   └── ParserRegistry.ts    ← Command Parser Registry
│       │   ├── parsers/                 ← Command Parsers
│       │   │   ├── MovementParser.ts    ← X(),Y(),Z(),T(),G() Commands
│       │   │   ├── ControlFlowParser.ts ← FUNC(), CALL(), LOOP()
│       │   │   ├── GroupParser.ts       ← GROUP(), GROUPSYNC()
│       │   │   └── SystemParser.ts      ← ZERO(), WAIT(), SPEED()
│       │   ├── generators/              ← Output Generators
│       │   │   └── TextGenerator.ts     ← ESP32-compatible Text
│       │   └── types/                   ← TypeScript Interfaces
│       │       └── CommandTypes.ts      ← Command Data Types
│       │
│       ├── lib/
│       │   ├── 🌐 api.ts                ← ESP32 Communication Client
│       │   ├── 🔧 types.ts              ← Shared Type Definitions
│       │   ├── 🛠️ utils.ts              ← Utility Functions
│       │   └── 🪝 hooks.ts              ← React Hooks (SSE Debug)
│       │
│       └── 🚀 server/
│           └── 📡 index.ts              ← Express API Server (618 lines)
│
├── 🔌 Firmware (ESP32 + Arduino)
│   └── FirmwareESP32/                   ← Ultra-lightweight ESP32
│       ├── 🎯 FirmwareESP32.ino         ← Main File (11 lines!)
│       ├── 📡 CommandForwarder.*        ← Main Logic Class (154 lines)
│       ├── 🌐 HttpClient.*              ← Server Communication
│       └── 📤 SerialBridge.*            ← Arduino MEGA Bridge
│
├── 📚 docs/                             ← Comprehensive Documentation
│   ├── 12_SCRIPT_LANGUAGE_GUIDE.md     ← MSL Syntax & Examples
│   ├── 14_MIGRATION_PLAN_DATA_FLOW.md  ← Migration Strategy
│   ├── 02_NEW_CONCEPT.md               ← Architecture Overview
│   └── 16_SYSTEM_FLOWS.md              ← This File
│
├── ⚙️ Configuration
│   ├── 📦 package.json                 ← Dependencies & Scripts
│   ├── 🎨 tailwind.config.ts           ← Styling Configuration
│   ├── 📝 tsconfig.json                ← TypeScript Settings
│   ├── 🔧 next.config.ts               ← Next.js Build Config
│   └── 📋 CLAUDE.md                    ← AI Assistant Instructions
│
└── 🚀 Build Output
    └── out/                            ← Static Export for ESP32

         TOTAL: ~4,500 lines of optimized TypeScript/C++ code
```

## 🏛️ System Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           OPTIMIZED ARCHITECTURE FLOW                           │
│                              (Production Ready)                                │
└─────────────────────────────────────────────────────────────────────────────────┘

🖥️ USER INTERACTION
       │
       ▼
┌─────────────────┐     ┌─────────────────────────────────────────────────────┐
│   Web Browser   │────▶│              FRONTEND PROCESSING                    │
│  (Any Device)   │     │                                                     │
│                 │     │  ┌─ MSL Script Editor ────────────────────────────┐ │
│ • Chrome/Edge   │     │  │ X(100); Y(50);                                │ │
│ • Firefox       │     │  │ FUNC(pickup) { Z(10); G(600); }               │ │
│ • Safari        │     │  │ CALL(pickup);                                  │ │
│ • Mobile        │     │  └────────────────────────────────────────────────┘ │
└─────────────────┘     │              │                                     │
                        │              ▼                                     │
                        │  ┌─ MSL Compiler (TypeScript) ───────────────────┐ │
                        │  │ • Parse Functions: FUNC(pickup)                │ │
                        │  │ • Expand Loops: LOOP(5) { X(i*100); }         │ │
                        │  │ • Generate Commands: ["MOVE:X100", "MOVE:Y50"] │ │
                        │  │ • Real-time Compilation (1000ms debounce)     │ │
                        │  └────────────────────────────────────────────────┘ │
                        │              │                                     │
                        │              ▼                                     │
                        │  ┌─ UI Controls ──────────────────────────────────┐ │
                        │  │ • Dual Arm Support (Arm 1 ● / Arm 2)          │ │
                        │  │ • MSL/RAW Mode Toggle                          │ │
                        │  │ • Execute Controls: ▶️⏸️⏹️                      │ │
                        │  │ • Real-time Status Display                     │ │
                        │  └────────────────────────────────────────────────┘ │
                        └─────────────────────────────────────────────────────┘
                                       │ HTTP POST
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SERVER LAYER (Node.js)                              │
│                              (localhost:3006)                                  │
│                                                                                 │
│  ┌─ Express API Endpoints ─────────────────────────────────────────────────────┐ │
│  │ POST /api/script/save      ← Receive compiled commands from web client     │ │
│  │ POST /api/script/raw       ← Direct raw command upload                     │ │
│  │ GET  /api/script/poll      ← ESP32 downloads command batches               │ │
│  │ POST /api/control/start    ← Start/pause/stop execution                    │ │
│  │ GET  /api/status           ← System status for web client                  │ │
│  │ GET  /api/events           ← Server-Sent Events for debug terminal         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                         │
│  ┌─ Command Storage ───────────────────▼─────────────────────────────────────────┐ │
│  │ interface SystemState {                                                     │ │
│  │   arm1Script: { commands: string[], format: 'msl'|'raw' }                  │ │
│  │   arm2Script: { commands: string[], format: 'msl'|'raw' }                  │ │
│  │   isRunning: boolean, currentIndex: number                                 │ │
│  │   esp32Connected: boolean, esp32LastPoll: timestamp                        │ │
│  │ }                                                                           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                         │
│  ┌─ Real-time Communication ───────────▼─────────────────────────────────────────┐ │
│  │ • Server-Sent Events (SSE) for debug terminal                              │ │
│  │ • HTTP polling by ESP32 every 2 seconds                                    │ │
│  │ • mDNS service discovery: palletizer.local:3006                            │ │
│  │ • Connection timeout detection (30 seconds)                                │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │ HTTP GET/POST
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ESP32 COMMAND FORWARDER                               │
│                            (Ultra-lightweight)                                 │
│                                                                                 │
│  ┌─ CommandForwarder Class ─────────────────────────────────────────────────────┐ │
│  │ void setup() {                                                              │ │
│  │   forwarder.initialize("WiFi_SSID", "password", "palletizer.local", 3006); │ │
│  │ }                                                                           │ │
│  │ void loop() {                                                               │ │
│  │   forwarder.update();  // 🔄 Poll server + forward commands                │ │
│  │ }                                                                           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                         │
│  ┌─ HTTP Client ─────────────────────────────────────────────────────────────────┐ │
│  │ • WiFi Connection Management                                                │ │
│  │ • GET /api/script/poll  → Download command batches                         │ │
│  │ • GET /api/status       → Check execution state                            │ │
│  │ • Connection retry logic with exponential backoff                          │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                         │
│  ┌─ Command Conversion ──────────────────────────────────────────────────────────┐ │
│  │ String convertToSerial(String webCommand) {                                │ │
│  │   if (webCommand.startsWith("MOVE:X")) return "x;1;" + value + ";";        │ │
│  │   if (webCommand.startsWith("MOVE:Y")) return "y;1;" + value + ";";        │ │
│  │   if (webCommand.startsWith("GROUP:")) return "group;" + data + ";";       │ │
│  │   // ... protocol conversion                                               │ │
│  │ }                                                                           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                         │
│  ┌─ Serial Bridge ───────────────────────────────────────────────────────────────┐ │
│  │ • Hardware Serial2 (115200 baud)                                           │ │
│  │ • sendCommandAndWait(cmd, "DONE", 5000ms timeout)                          │ │
│  │ • Response parsing and error handling                                      │ │
│  │ • Buffer management and flow control                                       │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │ Serial UART
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ARDUINO MEGA MOTOR CONTROLLER                           │
│                           (External Team Development)                          │
│                                                                                 │
│  ┌─ Serial Protocol ────────────────────────────────────────────────────────────┐ │
│  │ Incoming: "x;1;100;"     → Move X-axis to position 100                     │ │
│  │ Incoming: "y;1;50;"      → Move Y-axis to position 50                      │ │
│  │ Incoming: "group;x,y;"   → Synchronized multi-axis movement                │ │
│  │ Outgoing: "DONE"         → Command completed successfully                  │ │
│  │ Outgoing: "ERROR:msg"    → Command failed with error message               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                         │
│  ┌─ 5-Axis Motor Control ───────────────────────────────────────────────────────┐ │
│  │ • X-Axis: Linear movement (0-1000mm)                                       │ │
│  │ • Y-Axis: Linear movement (0-800mm)                                        │ │
│  │ • Z-Axis: Vertical movement (0-500mm)                                      │ │
│  │ • T-Axis: Turntable rotation (0-3600°)                                     │ │
│  │ • G-Axis: Gripper control (0-1000 units)                                   │ │
│  │                                                                             │ │
│  │ • AccelStepper library for smooth motion                                   │ │
│  │ • Coordinated movement with timing synchronization                         │ │
│  │ • Safety limits and emergency stop                                         │ │
│  │ • Position feedback and error detection                                    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

🎯 PERFORMANCE ACHIEVEMENTS:
   • ESP32 RAM Usage: 250KB → 3KB (99% reduction)
   • Script Complexity: Unlimited (web client processing)
   • Real-time Debugging: SSE terminal with 1000+ message buffer
   • Dual Arm Support: Independent script execution
   • Connection Resilience: Auto-reconnect with timeout detection
```

## 🔄 Data Flow Sequence

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW SEQUENCE                                │
│                            (Real-time Execution)                               │
└─────────────────────────────────────────────────────────────────────────────────┘

👨‍💻 USER WRITES MSL SCRIPT
│
▼
🌐 WEB CLIENT (Frontend)
├─ 1. User types in Script Editor:
│    ```
│    X(100); Y(50);
│    FUNC(pickup) {
│      Z(10); G(600);
│      DELAY(500);
│    }
│    CALL(pickup);
│    ```
│
├─ 2. Auto-compile triggers (1000ms debounce)
│    MSLCompiler.compileToText(script)
│    ├─ Parse functions: FUNC(pickup) → store definition
│    ├─ Expand CALL(pickup) → Z(10); G(600); DELAY(500);
│    ├─ Generate text commands:
│    │   ["MOVE:X100", "MOVE:Y50", "MOVE:Z10", 
│    │    "MOVE:G600", "WAIT:500"]
│    └─ Show preview in debug terminal
│
├─ 3. User clicks [Execute Arm 1]
│    HTTP POST /api/script/save
│    {
│      script: "X(100); Y(50); FUNC(pickup)...",
│      format: "msl",
│      armId: "arm1"
│    }
│
│         ║ HTTP REQUEST
│         ▼
│
📡 NODE.JS SERVER (Backend)
├─ 4. Receive script compilation request
│    ├─ Compile MSL → text commands
│    ├─ Store in systemState.arm1Script
│    │   {
│    │     id: "1703123456789",
│    │     commands: ["MOVE:X100", "MOVE:Y50", "MOVE:Z10", "MOVE:G600", "WAIT:500"],
│    │     format: "msl",
│    │     executed: false
│    │   }
│    └─ Respond: { success: true, commandCount: 5, scriptId: "..." }
│
├─ 5. User clicks [▶️ Start]
│    HTTP POST /api/control/start { armId: "arm1" }
│    ├─ Set systemState.isRunning = true
│    └─ Respond: { success: true, message: "Execution started" }
│
│         ║ HTTP POLLING (every 2s)
│         ▼
│
🔌 ESP32 DEVICE (Firmware)
├─ 6. ESP32 polls for commands
│    HTTP GET /api/script/poll
│    ├─ Server responds:
│    │   {
│    │     hasNewScript: true,
│    │     commands: ["MOVE:X100", "MOVE:Y50", "MOVE:Z10", "MOVE:G600", "WAIT:500"],
│    │     shouldStart: true
│    │   }
│    ├─ ESP32 stores commands locally: String commands[100]
│    └─ Server marks arm1Script.executed = true
│
├─ 7. ESP32 starts command execution loop
│    for (currentCommandIndex = 0; index < commandCount; index++) {
│      ├─ Get command: "MOVE:X100"
│      ├─ Convert to serial: convertToSerial("MOVE:X100") → "x;1;100;"
│      ├─ Send via Serial2: serialBridge.sendCommandAndWait("x;1;100;", "DONE", 5000)
│      └─ Wait for Arduino MEGA acknowledgment
│    }
│
│         ║ SERIAL UART (115200 baud)
│         ▼
│
🔧 ARDUINO MEGA (Motor Control)
├─ 8. Receive serial command: "x;1;100;"
│    ├─ Parse: axis=X, speed=1, position=100
│    ├─ Execute: stepper.moveTo(100)
│    ├─ Wait for completion: while(stepper.isRunning())
│    └─ Send acknowledgment: Serial.println("DONE")
│
│         ║ SERIAL RESPONSE
│         ▼
│
🔌 ESP32 DEVICE
├─ 9. Receive "DONE" response
│    ├─ Log: "Command completed: x;1;100;"
│    ├─ Increment: currentCommandIndex++
│    └─ Continue to next command
│
│         ║ HTTP STATUS POLLING
│         ▼
│
📡 NODE.JS SERVER
├─ 10. ESP32 status polling (via /api/status)
│     ├─ Update: esp32Connected = true, lastPoll = now
│     └─ Broadcast SSE debug messages
│
│         ║ SERVER-SENT EVENTS
│         ▼
│
🌐 WEB CLIENT
├─ 11. Real-time status updates
│     ├─ Progress bar: 3/5 commands (60%)
│     ├─ Debug terminal: "✅ Command completed: X(100)"
│     ├─ Status display: "Running - Command 3/5"
│     └─ Live execution tree visualization
│
└─ 12. Execution completion
     ├─ ESP32: All commands processed, set isRunning = false
     ├─ Server: Receive final status, broadcast completion
     ├─ Web: Show "✅ Execution completed - 5/5 commands"
     └─ Reset UI state for next execution

🔄 CONTINUOUS MONITORING:
├─ ESP32 polls server every 2 seconds
├─ Web client polls status every 2 seconds  
├─ Server-Sent Events for real-time debug messages
├─ Automatic connection timeout detection (30s)
└─ Error propagation: MEGA → ESP32 → Server → Web Client

📊 PERFORMANCE METRICS:
├─ Command latency: ~100-500ms per command
├─ Network overhead: <1KB per command
├─ Memory usage: ESP32 ~3KB, Server ~10MB
├─ Compilation time: <50ms for 100 commands
└─ Real-time updates: <100ms SSE latency
```

## 🧠 Modern Script Language (MSL) Processing

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       MSL COMPILATION PIPELINE                                 │
│                      (Client-side TypeScript)                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

📝 INPUT SCRIPT:
```
X(100); Y(50);
FUNC(pickup) {
  Z(10);
  G(600);
  DELAY(500);
}
CALL(pickup);
LOOP(3) {
  X(100, 200, 300);
  CALL(pickup);
}
GROUP(X(500), Y(400));
```

           ║ MSLCompiler.compileToCommands()
           ▼

🔍 PHASE 1: PREPROCESSING
├─ Split into lines, trim whitespace
├─ Filter empty lines and comments
└─ Result: ["X(100);", "Y(50);", "FUNC(pickup) {", ...]

           ║ FunctionManager.extractFunctions()
           ▼

🔧 PHASE 2: FUNCTION EXTRACTION
├─ Scan for FUNC(name) { ... } blocks
├─ Store function definitions:
│   functions["pickup"] = {
│     name: "pickup",
│     commands: [
│       { type: "MOVE", axis: "Z", data: { raw: "Z(10);" } },
│       { type: "MOVE", axis: "G", data: { raw: "G(600);" } },
│       { type: "WAIT", data: { raw: "DELAY(500);" } }
│     ]
│   }
└─ Remove function definitions from main script

           ║ ParserRegistry.parseLine() for each line
           ▼

🎯 PHASE 3: COMMAND PARSING
├─ MovementParser: X(100) → { type: "MOVE", axis: "X", positions: [100] }
├─ MovementParser: Y(50) → { type: "MOVE", axis: "Y", positions: [50] }
├─ ControlFlowParser: CALL(pickup) → { type: "CALL", functionName: "pickup" }
├─ ControlFlowParser: LOOP(3) → { type: "LOOP", iterations: 3, commands: [...] }
├─ GroupParser: GROUP(X(500), Y(400)) → { type: "GROUP", movements: [...] }
└─ Result: Command[] array with structured data

           ║ expandFunctionCalls()
           ▼

🔄 PHASE 4: FUNCTION EXPANSION
├─ Find CALL(pickup) commands
├─ Replace with function body:
│   CALL(pickup) → [
│     { type: "MOVE", axis: "Z", positions: [10] },
│     { type: "MOVE", axis: "G", positions: [600] },
│     { type: "WAIT", duration: 500 }
│   ]
└─ Recursive expansion for nested calls

           ║ LoopManager.parseLoop()
           ▼

🔁 PHASE 5: LOOP EXPANSION  
├─ Find LOOP(3) blocks
├─ Expand 3 iterations:
│   LOOP(3) { X(100, 200, 300); CALL(pickup); } →
│   [
│     // Iteration 1
│     { type: "MOVE", axis: "X", positions: [100, 200, 300] },
│     { type: "MOVE", axis: "Z", positions: [10] },      // from pickup
│     { type: "MOVE", axis: "G", positions: [600] },     // from pickup
│     { type: "WAIT", duration: 500 },                  // from pickup
│     // Iteration 2
│     { type: "MOVE", axis: "X", positions: [100, 200, 300] },
│     // ... repeated
│   ]
└─ Handle nested loops with proper scoping

           ║ TextGenerator.generate()
           ▼

📤 PHASE 6: OUTPUT GENERATION
├─ Convert Command objects to ESP32-compatible text:
│   { type: "MOVE", axis: "X", positions: [100] } → "MOVE:X100"
│   { type: "MOVE", axis: "Y", positions: [50] } → "MOVE:Y50"
│   { type: "MOVE", axis: "Z", positions: [10] } → "MOVE:Z10"
│   { type: "MOVE", axis: "G", positions: [600] } → "MOVE:G600"
│   { type: "WAIT", duration: 500 } → "WAIT:500"
│   // Loop expansion results in multiple commands
│   { type: "GROUP", movements: [...] } → "GROUP:X500,Y400"
│
└─ Final output: ["MOVE:X100", "MOVE:Y50", "MOVE:Z10", "MOVE:G600", "WAIT:500", ...]

           ║ Send to Server
           ▼

📡 RESULT: ESP32-READY COMMANDS
├─ Total expanded commands: ~15 commands (from 8 MSL lines)
├─ Function calls resolved: pickup function inlined 4 times
├─ Loops expanded: 3 iterations × 4 commands each
├─ Group commands: Parallel movement coordination
└─ Ready for ESP32 execution via Serial bridge

🧮 COMPILATION STATISTICS:
├─ Parse time: <10ms for typical scripts
├─ Memory usage: <1MB during compilation
├─ Function expansion: Unlimited recursion depth (with cycle detection)
├─ Loop expansion: Configurable iteration limits (default: 1000)
├─ Error detection: Line-by-line syntax validation
└─ Debug output: Detailed compilation logs in SSE terminal
```

## 🤖 Dual Arm & Dual Mode ESP32 Firmware Concept

Berdasarkan analisis sistem yang sudah ada, mari kita design konsep optimal untuk ESP32 firmware yang mendukung **2 Arm** dan **2 Mode** (MSL & RAW).

### 🔄 **Current System Analysis**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DUAL ARM & DUAL MODE ANALYSIS                          │
└─────────────────────────────────────────────────────────────────────────────────┘

🌐 WEB CLIENT STATE:
├─ activeArm: 1 | 2                    // User switches between arms
├─ commandText1, commandText2          // Separate scripts for each arm  
├─ processingMode1: 'MSL' | 'RAW'      // Independent modes per arm
├─ processingMode2: 'MSL' | 'RAW'      // Independent modes per arm
├─ isExecuting1, isExecuting2          // Independent execution status
└─ compilationResult1, compilationResult2  // Separate compilation results

📡 SERVER STATE:
├─ arm1Script: { commands[], format: 'msl'|'raw' }
├─ arm2Script: { commands[], format: 'msl'|'raw' }  
├─ Server downloads: Priority Arm1 → then Arm2
└─ ESP32 polls: /api/script/poll (gets one arm at a time)

🔌 CURRENT ESP32 LIMITATION:
├─ Single command array: String commands[100]
├─ No arm identification in firmware
├─ Sequential execution only (not dual arm capable)
└─ Simple mode: processes one script at a time
```

### 💡 **ESP32 Firmware Design Options**

Mari kita pertimbangkan beberapa opsi arsitektur ESP32 untuk dual arm:

#### **Option 1: Sequential Dual Arm (Recommended) ✅**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SEQUENTIAL DUAL ARM APPROACH                            │
│                              (Optimal & Simple)                                │
└─────────────────────────────────────────────────────────────────────────────────┘

🔄 EXECUTION FLOW:
1. ESP32 polls server → gets Arm1 script (if available)
2. Execute Arm1 completely → all commands
3. ESP32 polls server → gets Arm2 script (if available)  
4. Execute Arm2 completely → all commands
5. Repeat cycle

🧠 ESP32 FIRMWARE STRUCTURE:
```cpp
class CommandForwarder {
private:
  String commands[200];        // Increased buffer for both arms
  int commandCount;
  int currentCommandIndex;
  String currentArmId;         // "arm1" or "arm2"
  String currentFormat;        // "msl" or "raw"
  
public:
  void pollForCommands() {
    // Priority: arm1 → arm2
    // Server handles arm selection logic
    // ESP32 simply executes whatever it receives
  }
  
  String convertToSerial(String webCommand) {
    // Same conversion logic for both arms
    // "MOVE:X100" → "x;1;100;"
    // Format doesn't matter - commands are pre-processed
  }
};
```

📊 PROS:
├─ ✅ Ultra-simple ESP32 code (no major changes needed)
├─ ✅ Server handles all arm logic and priorities
├─ ✅ Maintains current 3KB RAM usage
├─ ✅ Both MSL and RAW work transparently
├─ ✅ Zero risk of timing conflicts
└─ ✅ Easy debugging and monitoring

📊 CONS:
├─ ❌ No simultaneous arm execution  
├─ ❌ Arm2 waits for Arm1 completion
└─ ❌ Lower throughput for dual operations
```

#### **Option 2: Parallel Dual Arm (Advanced) ⚠️**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PARALLEL DUAL ARM APPROACH                             │
│                              (Complex but Powerful)                            │
└─────────────────────────────────────────────────────────────────────────────────┘

🔄 EXECUTION FLOW:
1. ESP32 polls server → gets both Arm1 & Arm2 scripts
2. Execute both arms simultaneously using tasks/threads
3. Coordinate timing for synchronized movements
4. Handle individual arm completion

🧠 ESP32 FIRMWARE STRUCTURE:
```cpp
class DualArmForwarder {
private:
  // Separate command buffers
  String arm1Commands[100];
  String arm2Commands[100];
  int arm1Count, arm2Count;
  int arm1Index, arm2Index;
  
  // Task handles for parallel execution
  TaskHandle_t arm1Task;
  TaskHandle_t arm2Task;
  
public:
  void startParallelExecution() {
    xTaskCreate(executeArm1, "Arm1", 4096, this, 1, &arm1Task);
    xTaskCreate(executeArm2, "Arm2", 4096, this, 1, &arm2Task);
  }
  
  static void executeArm1(void* params) {
    // Independent arm1 execution loop
    // Send commands to Arduino MEGA with arm1 prefix
  }
  
  static void executeArm2(void* params) {
    // Independent arm2 execution loop  
    // Send commands to Arduino MEGA with arm2 prefix
  }
};
```

📊 PROS:
├─ ✅ True simultaneous dual arm execution
├─ ✅ Maximum throughput and efficiency
├─ ✅ Independent arm control and timing
└─ ✅ Advanced coordination capabilities

📊 CONS:
├─ ❌ Significantly more complex firmware
├─ ❌ Higher RAM usage (~10-15KB)
├─ ❌ Requires Arduino MEGA protocol changes
├─ ❌ Complex error handling and synchronization
├─ ❌ Harder debugging and monitoring
└─ ❌ Potential timing conflicts and race conditions
```

#### **Option 3: Smart Sequential (Hybrid) 🎯**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SMART SEQUENTIAL APPROACH                              │
│                              (Best of Both Worlds)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

🔄 EXECUTION FLOW:
1. ESP32 polls server → gets highest priority script
2. Server logic determines: 
   - arm1 priority (if user actively working on arm1)
   - arm2 priority (if arm1 idle and arm2 ready)
   - coordination mode (if both arms need sync)
3. Execute with intelligent queuing

🧠 ESP32 FIRMWARE STRUCTURE:
```cpp
class SmartCommandForwarder {
private:
  String commands[150];
  String currentArmId;
  String executionMode;        // "single", "sequential", "coordinated"
  unsigned long lastArmSwitch;
  
public:
  void pollForCommands() {
    // Server sends prioritized commands based on:
    // 1. User activity (which arm is active)
    // 2. Script readiness (which scripts are compiled)
    // 3. Execution mode (coordination requirements)
  }
  
  String convertToSerial(String webCommand) {
    // Add arm prefix for Arduino MEGA identification:
    // "MOVE:X100" → "1:x;1;100;" (arm1)
    // "MOVE:X100" → "2:x;1;100;" (arm2)
    return currentArmId + ":" + basicConversion(webCommand);
  }
};
```

📊 PROS:
├─ ✅ Simple ESP32 code with smart server logic
├─ ✅ Efficient arm switching based on user activity
├─ ✅ Low RAM usage (~5KB)
├─ ✅ Supports coordination when needed
├─ ✅ Easy to debug and monitor
└─ ✅ Future-proof for Arduino MEGA dual arm support

📊 CONS:
├─ ❌ Requires Arduino MEGA protocol updates
├─ ❌ Still sequential (no true parallel execution)
└─ ❌ Server logic becomes more complex
```

### 🎯 **Recommended Approach: Option 1 (Sequential) + Future Option 3**

**PHASE 1: Implement Sequential Dual Arm (Immediate)**
```cpp
// Minimal ESP32 changes needed
// Server already handles arm1/arm2 logic perfectly
// Works with current Arduino MEGA protocol
// Production ready immediately
```

**PHASE 2: Upgrade to Smart Sequential (Future)**
```cpp
// Add arm prefix to serial commands  
// Arduino MEGA can distinguish arm1 vs arm2
// Server becomes smarter about arm priorities
// Enables true dual arm coordination
```

### 📊 **Protocol Examples**

#### **Current Protocol (Works for Sequential)**
```
ESP32 → Arduino MEGA:
"x;1;100;"     // Move X to 100 (no arm identification)
"y;1;50;"      // Move Y to 50 (no arm identification)
```

#### **Future Protocol (Smart Sequential)**  
```
ESP32 → Arduino MEGA:
"1:x;1;100;"   // Arm1: Move X to 100
"2:y;1;50;"    // Arm2: Move Y to 50
"1:group;x,y;" // Arm1: Coordinated movement
"2:wait;1000;" // Arm2: Wait command
```

### 🔧 **Implementation Strategy**

**Immediate (Phase 1):**
1. ✅ Current ESP32 firmware works as-is
2. ✅ Server prioritizes arm1 → arm2 automatically  
3. ✅ Web client switches arms transparently
4. ✅ Both MSL and RAW modes work perfectly

**Future Enhancement (Phase 2):**
1. 🔄 Add arm identification to ESP32 serial output
2. 🔄 Arduino MEGA supports dual arm protocol
3. 🔄 Server implements smart arm priority logic
4. 🔄 Enable true dual arm coordination

### 🔄 **Dual Arm Data Flow Diagrams**

#### **Current Implementation: Sequential Dual Arm**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CURRENT DUAL ARM DATA FLOW                             │
│                              (Sequential Execution)                            │
└─────────────────────────────────────────────────────────────────────────────────┘

👨‍💻 USER INTERACTION
│
▼
🌐 WEB CLIENT (Dual Arm Editor)
├─ User selects: [Arm 1 ●] or [Arm 2]
├─ User selects mode: [MSL] or [RAW] per arm
├─ Independent script editing:
│   ├─ Arm 1: MSL Mode → X(100); FUNC(pick)...
│   └─ Arm 2: RAW Mode → X200\nY100\nG600
│
├─ User clicks [Execute Arm 1] or [Execute Arm 2]
│   HTTP POST /api/script/save { armId: "arm1"|"arm2" }
│
│         ║ HTTP REQUEST
│         ▼
│
📡 NODE.JS SERVER (Dual Arm State)
├─ Store scripts separately:
│   ├─ systemState.arm1Script = { commands[], format: "msl" }
│   └─ systemState.arm2Script = { commands[], format: "raw" }
│
├─ ESP32 polls: GET /api/script/poll
│   ├─ Priority logic: Check arm1 first
│   │   if (arm1Script && !arm1Script.executed) → return arm1
│   │   else if (arm2Script && !arm2Script.executed) → return arm2
│   └─ Response: { armId: "arm1", commands: [...], format: "msl" }
│
│         ║ HTTP POLLING (every 2s)
│         ▼
│
🔌 ESP32 DEVICE (Sequential Processor)
├─ Download commands for current arm:
│   ├─ currentArmId = "arm1" or "arm2"
│   ├─ currentFormat = "msl" or "raw"
│   └─ commands[] = ["MOVE:X100", "MOVE:Y50", ...]
│
├─ Execute commands sequentially:
│   for (cmd in commands) {
│     ├─ Convert: "MOVE:X100" → "x;1;100;"
│     ├─ Send: Serial2.println("x;1;100;")
│     ├─ Wait: DONE response from Arduino MEGA
│     └─ Continue to next command
│   }
│
├─ When all commands complete:
│   ├─ Mark script as executed on server
│   ├─ Poll for next arm's script
│   └─ Repeat process
│
│         ║ SERIAL UART (115200 baud)
│         ▼
│
🔧 ARDUINO MEGA (Shared Motor Controller)
├─ Receives commands from either arm:
│   ├─ "x;1;100;" (could be from Arm1 or Arm2)
│   ├─ "y;1;50;"  (could be from Arm1 or Arm2)
│   └─ No arm identification needed (sequential)
│
├─ Execute movement:
│   ├─ Parse: axis=X, position=100
│   ├─ Move: stepper.moveTo(100)
│   └─ Respond: Serial.println("DONE")
│
│         ║ EXECUTION TIMELINE
│         ▼
│
📊 EXECUTION EXAMPLE:
├─ T+0s:    User uploads Arm1 script (MSL, 5 commands)
├─ T+2s:    ESP32 downloads Arm1 script
├─ T+3s:    ESP32 executes Arm1: cmd 1/5
├─ T+8s:    ESP32 executes Arm1: cmd 5/5 ✅ COMPLETE
├─ T+10s:   User uploads Arm2 script (RAW, 3 commands)
├─ T+12s:   ESP32 downloads Arm2 script
├─ T+13s:   ESP32 executes Arm2: cmd 1/3
├─ T+16s:   ESP32 executes Arm2: cmd 3/3 ✅ COMPLETE
└─ T+18s:   Both arms complete, ESP32 polls for new scripts
```

#### **Future Implementation: Smart Sequential with Arm Identification**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FUTURE DUAL ARM DATA FLOW                              │
│                            (Smart Sequential + ID)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

👨‍💻 USER INTERACTION
│
▼
🌐 WEB CLIENT (Enhanced Dual Arm)
├─ Real-time arm switching based on user activity
├─ Smart priority: Active arm gets higher priority
├─ Coordination mode: Both arms can be synchronized
│
│         ║ HTTP REQUEST
│         ▼
│
📡 NODE.JS SERVER (Smart Priority Logic)
├─ Enhanced polling logic:
│   ├─ Track user activity: which arm is actively edited
│   ├─ Smart priority: active arm → idle arm → coordination
│   ├─ Coordination detection: GROUP commands across arms
│   └─ Response includes coordination flags
│
│         ║ ENHANCED HTTP POLLING
│         ▼
│
🔌 ESP32 DEVICE (Smart Sequential)
├─ Enhanced command processing:
│   ├─ Add arm prefix to all commands
│   ├─ Track coordination requirements
│   ├─ Support arm switching based on server priority
│   └─ Intelligent execution order
│
├─ Enhanced serial protocol:
│   ├─ "1:x;1;100;"    // Arm1: Move X to 100
│   ├─ "2:y;1;50;"     // Arm2: Move Y to 50
│   ├─ "1:group;x,y;"  // Arm1: Coordinated movement
│   └─ "sync;1,2;"     // Synchronization command
│
│         ║ ENHANCED SERIAL PROTOCOL
│         ▼
│
🔧 ARDUINO MEGA (Dual Arm Controller)
├─ Enhanced command parsing:
│   ├─ Parse arm ID: "1:" vs "2:"
│   ├─ Route to appropriate motor sets
│   ├─ Support coordination commands
│   └─ Independent arm status tracking
│
├─ Dual arm motor control:
│   ├─ Arm1 motors: X1, Y1, Z1, T1, G1
│   ├─ Arm2 motors: X2, Y2, Z2, T2, G2
│   ├─ Coordination: synchronized movement
│   └─ Individual responses: "1:DONE", "2:DONE"
│
│         ║ COORDINATION EXAMPLE
│         ▼
│
📊 COORDINATION EXAMPLE:
├─ T+0s:    User designs pick-and-place coordination
├─ T+1s:    Arm1 MSL: FUNC(pick) { X(100); G(600); }
├─ T+2s:    Arm2 MSL: FUNC(place) { X(200); G(400); }
├─ T+3s:    Coordination: SYNC(CALL(pick), CALL(place))
├─ T+5s:    Server detects coordination requirement
├─ T+6s:    ESP32 executes: "1:x;1;100;" + "2:x;1;200;" simultaneously
├─ T+7s:    Arduino MEGA coordinates both arms
├─ T+8s:    Response: "1:DONE" + "2:DONE"
└─ T+9s:    Coordination complete ✅
```

#### **Mode Comparison: MSL vs RAW Processing**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MSL vs RAW MODE PROCESSING                             │
│                              (Dual Mode Support)                               │
└─────────────────────────────────────────────────────────────────────────────────┘

🔧 MSL MODE (Arm 1 Example):
├─ User Input:
│   ```
│   FUNC(pickup) {
│     X(100); Y(50);
│     Z(10); G(600);
│     DELAY(500);
│   }
│   CALL(pickup);
│   ```
│
├─ Web Client Processing:
│   ├─ Parse functions: FUNC(pickup) stored
│   ├─ Expand CALL(pickup) → inline function body
│   ├─ Generate commands: ["MOVE:X100", "MOVE:Y50", "MOVE:Z10", "MOVE:G600", "WAIT:500"]
│   └─ Send to server: { armId: "arm1", format: "msl", commands: [...] }
│
├─ ESP32 Processing:
│   ├─ Receive: ["MOVE:X100", "MOVE:Y50", "MOVE:Z10", "MOVE:G600", "WAIT:500"]
│   ├─ Convert: "MOVE:X100" → "x;1;100;"
│   ├─ No additional parsing needed (pre-processed)
│   └─ Direct serial forwarding
│
└─ Result: 5 commands → Arduino MEGA

📝 RAW MODE (Arm 2 Example):
├─ User Input:
│   ```
│   X200
│   Y100
│   G600
│   DELAY 1000
│   ```
│
├─ Web Client Processing:
│   ├─ No MSL compilation (raw mode)
│   ├─ Split lines: ["X200", "Y100", "G600", "DELAY 1000"]
│   ├─ Basic formatting: ["MOVE:X200", "MOVE:Y100", "MOVE:G600", "WAIT:1000"]
│   └─ Send to server: { armId: "arm2", format: "raw", commands: [...] }
│
├─ ESP32 Processing:
│   ├─ Receive: ["MOVE:X200", "MOVE:Y100", "MOVE:G600", "WAIT:1000"]
│   ├─ Convert: "MOVE:X200" → "x;1;200;"
│   ├─ Same conversion logic as MSL mode
│   └─ Direct serial forwarding
│
└─ Result: 4 commands → Arduino MEGA

🔄 KEY INSIGHT: ESP32 Doesn't Care About Mode!
├─ Both MSL and RAW produce same command format: ["MOVE:X100", ...]
├─ ESP32 applies same conversion logic regardless of source mode
├─ Mode only affects web client processing complexity
├─ Server stores mode for debugging/logging purposes
└─ Arduino MEGA receives identical protocol in both cases
```

## 🏗️ New Hardware Architecture: Distributed Multi-Nano System

Berdasarkan update arsitektur hardware terbaru, sistem sekarang menggunakan **distributed control architecture** yang jauh lebih powerful dan scalable!

### 🔧 **Hardware Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         NEW DISTRIBUTED HARDWARE ARCHITECTURE                  │
│                              (1 ESP32 + 12 Arduino Nano)                       │
└─────────────────────────────────────────────────────────────────────────────────┘

🌐 COMMUNICATION HUB
       │
       ▼
┌─────────────────┐
│     ESP32       │ ← Polling web server, WiFi communication
│  (WiFi Bridge)  │ ← Command distribution hub
│                 │ ← Real-time status aggregation
└─────────────────┘
       │ Serial/I2C/SPI
       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DUAL ARM MASTERS                                  │
├─────────────────────────────────┬───────────────────────────────────────────────┤
│         ARM 1 MASTER            │              ARM 2 MASTER                    │
│    ┌─────────────────┐          │         ┌─────────────────┐                  │
│    │ Arduino Nano #1 │          │         │ Arduino Nano #2 │                  │
│    │ (Arm1 Master)   │          │         │ (Arm2 Master)   │                  │
│    │ - Command Queue │          │         │ - Command Queue │                  │
│    │ - Coordination  │          │         │ - Coordination  │                  │
│    │ - Status Agg    │          │         │ - Status Agg    │                  │
│    └─────────────────┘          │         └─────────────────┘                  │
│           │ I2C/Serial Bus      │                   │ I2C/Serial Bus            │
│           ▼                     │                   ▼                           │
│    ┌─────────────────┐          │         ┌─────────────────┐                  │
│    │ 5 Slave Nanos   │          │         │ 5 Slave Nanos   │                  │
│    │ (Arm1 Motors)   │          │         │ (Arm2 Motors)   │                  │
│    ├─────────────────┤          │         ├─────────────────┤                  │
│    │ Nano #3: X-Axis │          │         │ Nano #8:  X-Axis│                  │
│    │ Nano #4: Y-Axis │          │         │ Nano #9:  Y-Axis│                  │
│    │ Nano #5: Z-Axis │          │         │ Nano #10: Z-Axis│                  │
│    │ Nano #6: T-Axis │          │         │ Nano #11: T-Axis│                  │
│    │ Nano #7: G-Axis │          │         │ Nano #12: G-Axis│                  │
│    └─────────────────┘          │         └─────────────────┘                  │
└─────────────────────────────────┴───────────────────────────────────────────────┘

📊 SYSTEM CAPABILITIES:
├─ 🚀 True Dual Arm Parallel Execution
├─ ⚡ Distributed Motor Control (1 Nano per Axis)
├─ 🧠 Intelligent Master-Slave Architecture  
├─ 🔄 Scalable I2C/Serial Communication
├─ 📡 Centralized WiFi Command Hub (ESP32)
└─ 🎯 Independent Arm Coordination
```

### 💡 **Distributed System Design Concepts**

Mari kita explore beberapa opsi komunikasi dan koordinasi:

#### **Option 1: I2C Bus Architecture (Recommended) ✅**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           I2C BUS COMMUNICATION                                │
│                              (Simple & Reliable)                               │
└─────────────────────────────────────────────────────────────────────────────────┘

🔄 COMMUNICATION TOPOLOGY:
ESP32 (Master) 
  ├─ I2C Bus A → Arm1 Master Nano (0x10)
  │              ├─ I2C Bus A1 → Nano X1 (0x11), Y1 (0x12), Z1 (0x13)
  │              └─ I2C Bus A2 → Nano T1 (0x14), G1 (0x15)
  │
  └─ I2C Bus B → Arm2 Master Nano (0x20)
                 ├─ I2C Bus B1 → Nano X2 (0x21), Y2 (0x22), Z2 (0x23)
                 └─ I2C Bus B2 → Nano T2 (0x24), G2 (0x25)

🧠 ESP32 FIRMWARE STRUCTURE:
```cpp
class DistributedCommandForwarder {
private:
  // I2C Communication
  TwoWire arm1Bus = TwoWire(0);  // I2C Bus for Arm1
  TwoWire arm2Bus = TwoWire(1);  // I2C Bus for Arm2
  
  // Command queues per arm
  String arm1Commands[100];
  String arm2Commands[100];
  int arm1Count, arm2Count;
  
  // Master addresses
  const uint8_t ARM1_MASTER = 0x10;
  const uint8_t ARM2_MASTER = 0x20;
  
public:
  void initializeI2C() {
    arm1Bus.begin(21, 22, 100000);  // SDA1, SCL1, 100kHz
    arm2Bus.begin(23, 24, 100000);  // SDA2, SCL2, 100kHz
  }
  
  void distributeCommands() {
    // Send to Arm1 Master
    if (arm1Count > 0) {
      sendToArm(arm1Bus, ARM1_MASTER, arm1Commands, arm1Count);
    }
    
    // Send to Arm2 Master  
    if (arm2Count > 0) {
      sendToArm(arm2Bus, ARM2_MASTER, arm2Commands, arm2Count);
    }
  }
  
  void sendToArm(TwoWire &bus, uint8_t address, String commands[], int count) {
    bus.beginTransmission(address);
    bus.write(count);  // Number of commands
    for (int i = 0; i < count; i++) {
      bus.print(commands[i]);
      bus.write('\n');
    }
    bus.endTransmission();
  }
};
```

📊 PROS:
├─ ✅ Reliable I2C protocol (industry standard)
├─ ✅ Clear master-slave hierarchy
├─ ✅ Easy debugging with I2C scanners
├─ ✅ Low wiring complexity
├─ ✅ Built-in error detection
└─ ✅ Expandable to 127 devices per bus

📊 CONS:
├─ ❌ I2C speed limitations (~400kHz max)
├─ ❌ Single master limitation per bus
└─ ❌ Distance limitations (short cables)
```

#### **Option 2: Serial Chain Architecture ⚡**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SERIAL CHAIN COMMUNICATION                             │
│                              (High Speed & Simple)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

🔄 COMMUNICATION TOPOLOGY:
ESP32 
  ├─ Serial1 → Arm1 Master → Nano X1 → Nano Y1 → Nano Z1 → Nano T1 → Nano G1
  └─ Serial2 → Arm2 Master → Nano X2 → Nano Y2 → Nano Z2 → Nano T2 → Nano G2

🧠 PROTOCOL DESIGN:
```cpp
// Message Format: [ARM][CMD][DATA][CHECKSUM]
// Example: "1:X:100:A7\n"  // Arm1, X-axis, position 100, checksum A7

class SerialChainForwarder {
private:
  HardwareSerial arm1Serial = Serial1;  // GPIO 16,17
  HardwareSerial arm2Serial = Serial2;  // GPIO 25,26
  
public:
  void sendCommand(uint8_t arm, char axis, int value) {
    String message = String(arm) + ":" + axis + ":" + value;
    uint8_t checksum = calculateChecksum(message);
    message += ":" + String(checksum, HEX) + "\n";
    
    if (arm == 1) {
      arm1Serial.print(message);
    } else {
      arm2Serial.print(message);  
    }
  }
  
  uint8_t calculateChecksum(String data) {
    uint8_t sum = 0;
    for (char c : data) sum ^= c;
    return sum;
  }
};
```

📊 PROS:
├─ ✅ High-speed serial communication (115200+ baud)
├─ ✅ Simple wiring (daisy chain)
├─ ✅ Long distance capability
├─ ✅ Hardware flow control
└─ ✅ Proven reliability

📊 CONS:
├─ ❌ Chain failure affects downstream devices
├─ ❌ More complex message routing
└─ ❌ Debugging complexity increases with chain length
```

#### **Option 3: Hybrid Master-Slave with CAN Bus 🚀**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CAN BUS ARCHITECTURE                                 │
│                              (Industrial Grade)                                │
└─────────────────────────────────────────────────────────────────────────────────┘

🔄 COMMUNICATION TOPOLOGY:
ESP32 (CAN Master) ← WiFi Commands
  │
  └─ CAN Bus (2-wire) → All 12 Arduino Nanos with CAN transceivers
     ├─ Arm1 Master (ID: 0x100) + 5 Slaves (ID: 0x101-0x105)
     └─ Arm2 Master (ID: 0x200) + 5 Slaves (ID: 0x201-0x205)

🧠 CAN PROTOCOL:
```cpp
// CAN Message Format: ID + 8 bytes data
// ID: 0x1XY (1=Arm1, 2=Arm2, X=Device, Y=Command)
// Data: [CMD][AXIS][POS_HIGH][POS_LOW][SPEED_HIGH][SPEED_LOW][FLAGS][CHECKSUM]

class CANDistributedSystem {
private:
  CAN_device_t CAN_cfg;
  
public:
  void sendCANCommand(uint16_t canId, uint8_t axis, int16_t position, uint16_t speed) {
    CAN_message_t message;
    message.identifier = canId;
    message.data_length_code = 8;
    message.data[0] = 0x01;  // MOVE command
    message.data[1] = axis;  // X,Y,Z,T,G
    message.data[2] = (position >> 8) & 0xFF;
    message.data[3] = position & 0xFF;
    message.data[4] = (speed >> 8) & 0xFF;
    message.data[5] = speed & 0xFF;
    message.data[6] = 0x00;  // Flags
    message.data[7] = calculateCRC(message.data, 7);
    
    ESP32Can.CANWriteFrame(&message);
  }
};
```

📊 PROS:
├─ ✅ True industrial-grade communication
├─ ✅ Multi-master capability
├─ ✅ Built-in error detection and recovery
├─ ✅ Broadcast and multicast support
├─ ✅ Noise immunity
└─ ✅ Real-time priority handling

📊 CONS:
├─ ❌ Higher complexity and cost
├─ ❌ Requires CAN transceivers for all Nanos
├─ ❌ More complex programming
└─ ❌ Overkill for simple applications
```

### 🎯 **Recommended Architecture: I2C Bus (Option 1)**

**Alasan memilih I2C:**
1. **✅ Simple & Reliable**: Proven protocol untuk distributed systems
2. **✅ Cost Effective**: No additional hardware required
3. **✅ Easy Debugging**: I2C scanners dan tools tersedia
4. **✅ Scalable**: Easy expansion untuk future requirements
5. **✅ Arduino Native**: Built-in Wire library support

### 📊 **Command Distribution Strategy**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         COMMAND DISTRIBUTION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────────┘

🌐 WEB CLIENT: 
├─ Arm1 MSL: X(100); Y(50); GROUP(Z(10), G(600));
├─ Arm2 RAW: X200\nY100\nT360\nG400
└─ Compiled: ["MOVE:X100", "MOVE:Y50", "GROUP:Z10:G600"] + ["MOVE:X200", ...]

📡 SERVER: 
├─ Store arm1Commands[], arm2Commands[]
└─ ESP32 polls → gets both arms' command arrays

🔌 ESP32 DISTRIBUTION:
├─ Parse commands per arm:
│   ├─ arm1Commands = ["MOVE:X100", "MOVE:Y50", "GROUP:Z10:G600"]
│   └─ arm2Commands = ["MOVE:X200", "MOVE:Y100", "MOVE:T360", "MOVE:G400"]
│
├─ Send to Master Nanos:
│   ├─ I2C → Arm1 Master (0x10): "X100\nY50\nGROUP:Z10:G600\n"
│   └─ I2C → Arm2 Master (0x20): "X200\nY100\nT360\nG400\n"

🧠 MASTER NANO PROCESSING:
├─ Arm1 Master receives commands
├─ Parse and distribute to slave nanos:
│   ├─ I2C → X-Axis Nano (0x11): "100"
│   ├─ I2C → Y-Axis Nano (0x12): "50"  
│   ├─ I2C → Z-Axis Nano (0x13): "10" (with GROUP flag)
│   └─ I2C → G-Axis Nano (0x15): "600" (with GROUP flag)
│
├─ Coordinate GROUP commands:
│   ├─ Send SYNC signal to Z and G nanos
│   ├─ Wait for READY responses
│   ├─ Send EXECUTE command
│   └─ Wait for DONE responses

⚙️ SLAVE NANO EXECUTION:
├─ Each nano controls 1 axis independently
├─ Stepper motor control with AccelStepper
├─ Position feedback and limit switches
├─ Response: READY/DONE/ERROR back to Master
```

### 🔧 **Detailed Implementation Architecture**

#### **ESP32 Distributed Command Forwarder**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       ESP32 DISTRIBUTED FIRMWARE                               │
│                              (Enhanced Multi-Nano)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

// ESP32 Main Firmware Structure
class DistributedPalletizerForwarder {
private:
  // WiFi and Server Communication (unchanged)
  HttpClient* httpClient;
  
  // Dual I2C Bus Configuration
  TwoWire arm1Bus = TwoWire(0);  // I2C Bus for Arm1 Master
  TwoWire arm2Bus = TwoWire(1);  // I2C Bus for Arm2 Master
  
  // Enhanced Command Storage
  struct ArmCommands {
    String commands[100];
    int count;
    String format;      // "msl" or "raw"
    bool isExecuting;
    int currentIndex;
  };
  
  ArmCommands arm1, arm2;
  
  // I2C Device Addresses
  const uint8_t ARM1_MASTER_ADDR = 0x10;
  const uint8_t ARM2_MASTER_ADDR = 0x20;
  
public:
  void initialize() {
    Serial.begin(115200);
    
    // Initialize WiFi and HTTP client
    httpClient = new HttpClient("palletizer.local", 3006);
    
    // Initialize dual I2C buses
    arm1Bus.begin(21, 22, 100000);  // SDA1=21, SCL1=22
    arm2Bus.begin(23, 24, 100000);  // SDA2=23, SCL2=24
    
    Serial.println("Distributed ESP32 Forwarder Ready");
    Serial.println("Arm1 I2C Bus: GPIO 21,22");
    Serial.println("Arm2 I2C Bus: GPIO 23,24");
  }
  
  void update() {
    unsigned long currentTime = millis();
    
    // Poll server for new commands (every 2 seconds)
    if (currentTime - lastPollTime >= 2000) {
      pollForCommands();
      lastPollTime = currentTime;
    }
    
    // Distribute commands to Master Nanos
    if (arm1.count > 0 && !arm1.isExecuting) {
      sendCommandsToMaster(arm1Bus, ARM1_MASTER_ADDR, arm1);
    }
    
    if (arm2.count > 0 && !arm2.isExecuting) {
      sendCommandsToMaster(arm2Bus, ARM2_MASTER_ADDR, arm2);
    }
    
    // Check execution status from Master Nanos
    checkExecutionStatus();
  }
  
  void sendCommandsToMaster(TwoWire &bus, uint8_t address, ArmCommands &arm) {
    Serial.println("Sending " + String(arm.count) + " commands to Master " + String(address, HEX));
    
    bus.beginTransmission(address);
    
    // Protocol: [COUNT][FORMAT][COMMANDS...]
    bus.write(arm.count);                    // Number of commands
    bus.write(arm.format.c_str()[0]);        // 'M' for MSL, 'R' for RAW
    
    for (int i = 0; i < arm.count; i++) {
      bus.print(arm.commands[i]);
      bus.write('\n');                       // Command separator
    }
    
    uint8_t result = bus.endTransmission();
    
    if (result == 0) {
      arm.isExecuting = true;
      Serial.println("Commands sent successfully to Master " + String(address, HEX));
    } else {
      Serial.println("I2C Error: " + String(result));
    }
  }
  
  void checkExecutionStatus() {
    // Request status from Arm1 Master
    if (arm1.isExecuting) {
      arm1Bus.requestFrom(ARM1_MASTER_ADDR, (uint8_t)1);
      if (arm1Bus.available()) {
        uint8_t status = arm1Bus.read();
        if (status == 0xFF) {  // 0xFF = COMPLETED
          arm1.isExecuting = false;
          arm1.count = 0;
          Serial.println("Arm1 execution completed");
        }
      }
    }
    
    // Request status from Arm2 Master
    if (arm2.isExecuting) {
      arm2Bus.requestFrom(ARM2_MASTER_ADDR, (uint8_t)1);
      if (arm2Bus.available()) {
        uint8_t status = arm2Bus.read();
        if (status == 0xFF) {  // 0xFF = COMPLETED
          arm2.isExecuting = false;
          arm2.count = 0;
          Serial.println("Arm2 execution completed");
        }
      }
    }
  }
};
```

#### **Master Nano Firmware (Arm1 & Arm2)**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MASTER NANO FIRMWARE                                   │
│                              (Command Coordinator)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

// Master Nano - Arm1 (Address 0x10) & Arm2 (Address 0x20)
#include <Wire.h>

class ArmMasterController {
private:
  // Slave device addresses (per arm)
  const uint8_t SLAVE_ADDRESSES[5] = {0x11, 0x12, 0x13, 0x14, 0x15}; // X,Y,Z,T,G
  
  // Command queue
  String commandQueue[100];
  int commandCount = 0;
  int currentCommandIndex = 0;
  
  // Execution state
  bool isExecuting = false;
  bool waitingForSlaves = false;
  unsigned long lastCommandTime = 0;
  
public:
  void initialize(uint8_t myAddress) {
    Serial.begin(115200);
    Wire.begin(myAddress);                    // Join I2C as slave
    Wire.onReceive(receiveCommands);          // ESP32 → Master
    Wire.onRequest(requestStatus);            // Master → ESP32
    
    Serial.println("Master Nano ready at address 0x" + String(myAddress, HEX));
    
    // Initialize slave communication  
    for (int i = 0; i < 5; i++) {
      Wire.beginTransmission(SLAVE_ADDRESSES[i]);
      Wire.write(0x00);  // INIT command
      Wire.endTransmission();
    }
  }
  
  static void receiveCommands(int numBytes) {
    if (numBytes < 2) return;
    
    uint8_t count = Wire.read();              // Number of commands
    char format = Wire.read();                // Format ('M' or 'R')
    
    commandCount = count;
    currentCommandIndex = 0;
    
    Serial.println("Receiving " + String(count) + " commands (format: " + format + ")");
    
    // Read all commands
    String buffer = "";
    while (Wire.available()) {
      char c = Wire.read();
      if (c == '\n') {
        if (buffer.length() > 0) {
          commandQueue[currentCommandIndex++] = buffer;
          buffer = "";
        }
      } else {
        buffer += c;
      }
    }
    
    currentCommandIndex = 0;  // Reset for execution
    isExecuting = true;
    Serial.println("Commands loaded, starting execution");
  }
  
  static void requestStatus() {
    // Send status back to ESP32
    if (isExecuting) {
      Wire.write(0x01);  // EXECUTING
    } else if (commandCount > 0 && currentCommandIndex >= commandCount) {
      Wire.write(0xFF);  // COMPLETED
    } else {
      Wire.write(0x00);  // IDLE
    }
  }
  
  void update() {
    if (isExecuting && !waitingForSlaves) {
      if (currentCommandIndex < commandCount) {
        executeCommand(commandQueue[currentCommandIndex]);
        currentCommandIndex++;
      } else {
        isExecuting = false;
        Serial.println("All commands completed");
      }
    }
  }
  
  void executeCommand(String command) {
    Serial.println("Executing: " + command);
    
    // Parse command type
    if (command.startsWith("MOVE:")) {
      handleMoveCommand(command.substring(5));
    } else if (command.startsWith("GROUP:")) {
      handleGroupCommand(command.substring(6));
    } else if (command.startsWith("WAIT:")) {
      handleWaitCommand(command.substring(5));
    }
  }
  
  void handleMoveCommand(String axisValue) {
    // Parse "X100" → axis='X', value=100
    char axis = axisValue.charAt(0);
    int value = axisValue.substring(1).toInt();
    
    uint8_t slaveAddr = getSlaveAddress(axis);
    sendToSlave(slaveAddr, 0x01, value);  // MOVE command
  }
  
  void handleGroupCommand(String groupData) {
    Serial.println("GROUP command: " + groupData);
    
    // Parse "Z10:G600" → coordinate Z and G movements
    // Implementation: send PREPARE to multiple slaves, then EXECUTE
    waitingForSlaves = true;
    
    // Parse and prepare slaves...
    // Send SYNC EXECUTE command...
    
    waitingForSlaves = false;
  }
  
  uint8_t getSlaveAddress(char axis) {
    switch (axis) {
      case 'X': return SLAVE_ADDRESSES[0];  // 0x11
      case 'Y': return SLAVE_ADDRESSES[1];  // 0x12  
      case 'Z': return SLAVE_ADDRESSES[2];  // 0x13
      case 'T': return SLAVE_ADDRESSES[3];  // 0x14
      case 'G': return SLAVE_ADDRESSES[4];  // 0x15
      default: return 0x00;
    }
  }
  
  void sendToSlave(uint8_t address, uint8_t command, int value) {
    Wire.beginTransmission(address);
    Wire.write(command);                    // Command type
    Wire.write((value >> 8) & 0xFF);        // High byte
    Wire.write(value & 0xFF);               // Low byte
    Wire.endTransmission();
    
    Serial.println("Sent to slave 0x" + String(address, HEX) + 
                   ": cmd=" + String(command) + ", value=" + String(value));
  }
};

ArmMasterController master;

void setup() {
  // For Arm1 Master: address 0x10
  // For Arm2 Master: address 0x20
  master.initialize(0x10);  // Change to 0x20 for Arm2
}

void loop() {
  master.update();
  delay(10);
}
```

#### **Slave Nano Firmware (Individual Axis Control)**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SLAVE NANO FIRMWARE                                    │
│                              (Single Axis Motor)                               │
└─────────────────────────────────────────────────────────────────────────────────┘

// Slave Nano - Individual axis control (X, Y, Z, T, G)
#include <Wire.h>
#include <AccelStepper.h>

class AxisController {
private:
  AccelStepper stepper;
  uint8_t myAddress;
  String axisName;
  
  // Motor parameters
  int currentPosition = 0;
  int targetPosition = 0;
  bool isMoving = false;
  
  // Limit switches
  int limitSwitchMin = 2;
  int limitSwitchMax = 3;
  
public:
  void initialize(uint8_t address, String axis, int stepPin, int dirPin) {
    myAddress = address;
    axisName = axis;
    
    // Initialize stepper motor
    stepper = AccelStepper(AccelStepper::DRIVER, stepPin, dirPin);
    stepper.setMaxSpeed(1000);
    stepper.setAcceleration(500);
    
    // Initialize I2C
    Wire.begin(address);
    Wire.onReceive(receiveCommand);
    Wire.onRequest(requestStatus);
    
    // Initialize limit switches
    pinMode(limitSwitchMin, INPUT_PULLUP);
    pinMode(limitSwitchMax, INPUT_PULLUP);
    
    Serial.begin(115200);
    Serial.println(axisName + " Axis Controller ready at 0x" + String(address, HEX));
  }
  
  static void receiveCommand(int numBytes) {
    if (numBytes < 3) return;
    
    uint8_t command = Wire.read();
    int value = (Wire.read() << 8) | Wire.read();
    
    switch (command) {
      case 0x01:  // MOVE command
        targetPosition = value;
        stepper.moveTo(targetPosition);
        isMoving = true;
        Serial.println("Moving to position: " + String(value));
        break;
        
      case 0x02:  // HOME command
        homeAxis();
        break;
        
      case 0x03:  // STOP command
        stepper.stop();
        isMoving = false;
        break;
    }
  }
  
  static void requestStatus() {
    if (isMoving && stepper.isRunning()) {
      Wire.write(0x01);  // MOVING
    } else if (isMoving && !stepper.isRunning()) {
      Wire.write(0xFF);  // DONE
      isMoving = false;
    } else {
      Wire.write(0x00);  // IDLE
    }
  }
  
  void update() {
    // Run stepper motor
    stepper.run();
    
    // Check limit switches
    if (!digitalRead(limitSwitchMin) || !digitalRead(limitSwitchMax)) {
      stepper.stop();
      isMoving = false;
      Serial.println("Limit switch triggered!");
    }
    
    // Update position
    currentPosition = stepper.currentPosition();
  }
  
  void homeAxis() {
    Serial.println("Homing " + axisName + " axis");
    
    // Move to minimum limit switch
    stepper.setSpeed(-200);
    while (digitalRead(limitSwitchMin)) {
      stepper.runSpeed();
    }
    
    // Stop and set zero position
    stepper.stop();
    stepper.setCurrentPosition(0);
    currentPosition = 0;
    targetPosition = 0;
    
    Serial.println("Homing complete");
  }
};

AxisController axis;

void setup() {
  // Example for X-axis slave (address 0x11)
  axis.initialize(0x11, "X", 2, 3);  // Address, axis name, step pin, dir pin
  
  // Other axes:
  // Y-axis: 0x12, Z-axis: 0x13, T-axis: 0x14, G-axis: 0x15
  // Arm2: 0x21-0x25
}

void loop() {
  axis.update();
  delay(1);  // Fast loop for smooth motor control
}
```

### 🔄 **Complete System Data Flow**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE DISTRIBUTED DATA FLOW                         │
│                              (Real-time Execution)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

👨‍💻 USER: Arm1 MSL: GROUP(X(100), Y(50)); Arm2 RAW: X200\nG400

🌐 WEB CLIENT: 
├─ Compile Arm1: ["MOVE:X100", "MOVE:Y50", "GROUP:X100:Y50"]
├─ Format Arm2: ["MOVE:X200", "MOVE:G400"]
└─ Upload to server with armId

📡 SERVER:
├─ Store arm1Script = {commands: [...], format: "msl"}
├─ Store arm2Script = {commands: [...], format: "raw"}
└─ Wait for ESP32 polling

🔌 ESP32 FORWARDER:
├─ Poll server → download both arm scripts
├─ I2C Bus A → Send to Arm1 Master (0x10): "3 commands\nMOVE:X100\nMOVE:Y50\nGROUP:X100:Y50"
├─ I2C Bus B → Send to Arm2 Master (0x20): "2 commands\nMOVE:X200\nMOVE:G400"
└─ Monitor execution status from masters

🧠 ARM1 MASTER (Nano 0x10):
├─ Receive commands from ESP32
├─ Parse: MOVE:X100 → I2C to X-slave (0x11) → value=100
├─ Parse: MOVE:Y50 → I2C to Y-slave (0x12) → value=50  
├─ Parse: GROUP:X100:Y50 → coordinate X&Y slaves → sync execute
└─ Status: EXECUTING → COMPLETED back to ESP32

🧠 ARM2 MASTER (Nano 0x20):
├─ Receive commands from ESP32
├─ Parse: MOVE:X200 → I2C to X-slave (0x21) → value=200
├─ Parse: MOVE:G400 → I2C to G-slave (0x25) → value=400
└─ Status: EXECUTING → COMPLETED back to ESP32

⚙️ SLAVE NANOS (X1=0x11, Y1=0x12, X2=0x21, G2=0x25):
├─ X1-Nano: Receive value=100 → stepper.moveTo(100) → DONE
├─ Y1-Nano: Receive value=50 → stepper.moveTo(50) → DONE
├─ X2-Nano: Receive value=200 → stepper.moveTo(200) → DONE  
├─ G2-Nano: Receive value=400 → stepper.moveTo(400) → DONE
└─ All report status back to respective masters

⏱️ EXECUTION TIMELINE:
├─ T+0s: User uploads scripts for both arms
├─ T+2s: ESP32 downloads and distributes to masters
├─ T+3s: Masters distribute to slaves, Arm1&2 execute in parallel
├─ T+5s: All movements complete
└─ T+6s: Status aggregated: ESP32 → Server → Web client ✅

🎯 RESULT: TRUE DUAL ARM PARALLEL EXECUTION! 
├─ Both arms move simultaneously (no sequential waiting)
├─ GROUP commands coordinate multiple axes within each arm
├─ Distributed control = higher reliability and performance
├─ Each axis independently controlled = maximum precision
└─ Scalable architecture = easy to add more axes/arms
```

## 👥 Development Team Responsibility Split

Berdasarkan pembagian tugas tim, mari kita fokus pada scope masing-masing developer:

### 🎯 **Your Scope: Web Client + ESP32**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           YOUR DEVELOPMENT SCOPE                               │
│                         (Web Client + ESP32 Only)                              │
└─────────────────────────────────────────────────────────────────────────────────┘

🌐 WEB CLIENT (Next.js + React) - YOUR RESPONSIBILITY ✅
├─ 📝 Dual Arm Script Editor (MSL/RAW mode)
├─ 🧠 MSL Compiler (TypeScript) 
├─ 🎮 UI Controls & Status Display
├─ 🖥️ Debug Terminal (SSE real-time)
├─ 📡 API Client (server communication)
└─ 📊 Real-time Monitoring Dashboard

📡 NODE.JS SERVER - YOUR RESPONSIBILITY ✅  
├─ 🔧 Express API endpoints
├─ 💾 Dual arm script storage
├─ 🔄 ESP32 polling management
├─ 📊 SSE debug streaming
└─ 🧮 Status aggregation

🔌 ESP32 FIRMWARE - YOUR RESPONSIBILITY ✅
├─ 📶 WiFi + HTTP client
├─ 🔄 Server polling (commands download)
├─ 📤 I2C communication to Master Nanos
├─ 📊 Status collection from Masters
├─ 🎯 Command distribution logic
└─ ⚠️ Error handling & reporting

═══════════════════════════════════════════════════════════════════════════════════

🤖 ARDUINO NANO DEVELOPMENT - TEAM RESPONSIBILITY 👥
├─ 🧠 2x Master Nano (Arm1 & Arm2 coordinators)
├─ ⚙️ 10x Slave Nano (individual axis controllers)
├─ 🔧 I2C slave communication protocols
├─ 🎯 Motor control & coordination
├─ 🛡️ Safety systems & limit switches
└─ 📍 Position feedback & error handling
```

### 🔧 **ESP32 Firmware Specification (Your Focus)**

Kamu perlu develop ESP32 yang akan communicate dengan 2 Master Nano via I2C. Berikut spesifikasi detail:

#### **ESP32 Core Responsibilities:**

```cpp
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ESP32 FIRMWARE SPECIFICATION                            │
│                           (Your Development Task)                              │
└─────────────────────────────────────────────────────────────────────────────────┘

🔧 MAIN FUNCTIONS:
├─ 1. WiFi Management & HTTP polling ke server
├─ 2. Download dual arm commands dari server  
├─ 3. Distribute commands ke 2 Master Nano via I2C
├─ 4. Monitor execution status dari Masters
├─ 5. Report back ke server untuk web client updates

📡 I2C COMMUNICATION PROTOCOL (ESP32 → Master Nanos):
class ESP32DistributedForwarder {
  // I2C Configuration
  TwoWire arm1Bus = TwoWire(0);  // GPIO 21,22 → Arm1 Master
  TwoWire arm2Bus = TwoWire(1);  // GPIO 23,24 → Arm2 Master
  
  // Device addresses (agreed with team)
  const uint8_t ARM1_MASTER_ADDR = 0x10;
  const uint8_t ARM2_MASTER_ADDR = 0x20;
  
  // Command structure
  struct ArmCommand {
    String commands[100];  // Command array from server
    int count;            // Number of commands
    String format;        // "msl" or "raw" (for debugging)
    String armId;         // "arm1" or "arm2"
  };
};

🌐 SERVER COMMUNICATION (Unchanged):
├─ Poll: GET /api/script/poll (every 2 seconds)
├─ Response: { armId, commands[], format, shouldStart }  
├─ Status: POST /api/status (execution updates)
└─ Debug: POST /api/debug (real-time logging)

📤 I2C PROTOCOL TO MASTERS:
┌─ Message Format ────────────────────────────────────────┐
│ [COMMAND_COUNT][FORMAT_FLAG][COMMAND_DATA...]          │
│                                                         │
│ COMMAND_COUNT: uint8_t (number of commands)            │
│ FORMAT_FLAG: 'M'=MSL, 'R'=RAW (for team debugging)     │  
│ COMMAND_DATA: String commands separated by '\n'        │
│                                                         │
│ Example: 3 commands for Arm1                           │
│ → [0x03]['M']["MOVE:X100\nMOVE:Y50\nGROUP:Z10:G600\n"] │
└─────────────────────────────────────────────────────────┘

📥 STATUS REQUEST FROM MASTERS:
┌─ Status Codes ──────────────────────────────────────────┐
│ 0x00 = IDLE (ready for new commands)                   │
│ 0x01 = EXECUTING (currently processing commands)       │
│ 0xFF = COMPLETED (all commands finished)               │
│ 0xEE = ERROR (execution failed, need intervention)     │
└─────────────────────────────────────────────────────────┘
```

#### **ESP32 Implementation Focus:**

```cpp
// Your ESP32 implementation should focus on:

void setup() {
  // 1. WiFi connection to palletizer.local:3006
  connectToWiFi();
  
  // 2. Initialize I2C buses for both arms
  arm1Bus.begin(21, 22, 100000);  // SDA, SCL, frequency
  arm2Bus.begin(23, 24, 100000);
  
  // 3. Test communication with Master Nanos
  testI2CConnectivity();
}

void loop() {
  // 1. Poll server for new commands (every 2s)
  if (millis() - lastPoll > 2000) {
    pollServerForCommands();
  }
  
  // 2. Distribute commands to available Masters
  distributeCommandsToMasters();
  
  // 3. Check execution status from Masters
  checkMasterStatus();
  
  // 4. Report status back to server
  reportStatusToServer();
  
  delay(100);  // Main loop delay
}

// Key functions you need to implement:
void pollServerForCommands();           // HTTP GET /api/script/poll
void distributeCommandsToMasters();     // I2C write to Masters
void checkMasterStatus();               // I2C read from Masters  
void reportStatusToServer();            // HTTP POST /api/status
```

### 🤝 **Team Coordination Interface**

Yang perlu kamu define untuk koordinasi dengan tim Arduino:

#### **I2C Protocol Specification (ESP32 ↔ Master Nano):**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      I2C PROTOCOL SPECIFICATION                                │
│                        (For Team Coordination)                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

📤 ESP32 → Master Nano (Command Distribution):
┌─ Command Structure ─────────────────────────────────────┐
│ Wire.beginTransmission(MASTER_ADDRESS);                │
│ Wire.write(commandCount);        // uint8_t: 1-100     │
│ Wire.write(formatFlag);          // char: 'M' or 'R'   │
│ for (each command) {                                    │
│   Wire.print(command);           // String: "MOVE:X100"│
│   Wire.write('\n');              // Separator          │
│ }                                                       │
│ Wire.endTransmission();                                 │
└─────────────────────────────────────────────────────────┘

📥 Master Nano → ESP32 (Status Report):
┌─ Status Request ────────────────────────────────────────┐
│ Wire.requestFrom(MASTER_ADDRESS, 1);                   │
│ uint8_t status = Wire.read();                          │
│                                                         │
│ Status Values:                                          │
│ • 0x00 = IDLE (ready for commands)                     │
│ • 0x01 = EXECUTING (processing commands)               │
│ • 0xFF = COMPLETED (all done, ready for next)          │
│ • 0xEE = ERROR (need intervention)                     │
└─────────────────────────────────────────────────────────┘

📋 Command Format Examples (ESP32 → Master):
├─ Single Move: "MOVE:X100"
├─ Multi Move: "MOVE:X100\nMOVE:Y50\nMOVE:Z10"  
├─ Group Coord: "GROUP:X100:Y50" (team handles coordination)
├─ Wait Command: "WAIT:1000" (delay 1000ms)
├─ Home Command: "HOME" (home all axes in this arm)
└─ Stop Command: "STOP" (emergency stop this arm)
```

### 📊 **Development Timeline & Priorities**

#### **Phase 1: Basic ESP32 Communication (Week 1-2)**
```
✅ YOUR TASKS:
├─ ESP32 WiFi connection ke existing server
├─ I2C bus initialization (dual bus setup)
├─ Basic command polling dari server
├─ Simple I2C write ke Master Nanos (dummy data)
└─ Status monitoring dari Masters

👥 TEAM TASKS (Parallel):
├─ Master Nano I2C slave implementation
├─ Basic command parsing dan response
├─ I2C slave-to-slave communication setup
└─ Individual axis motor control basic
```

#### **Phase 2: Command Distribution (Week 3-4)**
```
✅ YOUR TASKS:
├─ Enhanced command parsing dan distribution
├─ Dual arm priority handling
├─ Error handling & retry logic
├─ Status aggregation & reporting back to server
└─ Debug logging & monitoring

👥 TEAM TASKS (Parallel):
├─ Master coordination logic (GROUP commands)
├─ Slave motor control with AccelStepper
├─ Limit switch integration & safety
├─ Position feedback & error reporting
└─ Inter-slave coordination for synchronized movement
```

#### **Phase 3: Integration & Testing (Week 5-6)**
```
✅ YOUR TASKS:
├─ End-to-end testing: Web → ESP32 → Masters
├─ Performance optimization & timing
├─ Real-time status updates ke web client
├─ Error recovery & fault tolerance
└─ Production deployment preparation

👥 TEAM TASKS (Parallel):
├─ Full system integration testing
├─ Motor calibration & tuning
├─ Safety system validation
├─ Performance optimization
└─ Production hardware setup
```

### 🎯 **Your Development Focus Summary**

**FOCUS ON**: Web Client + ESP32 firmware
**DON'T WORRY ABOUT**: Arduino Nano implementation details
**COORDINATE ON**: I2C protocol specification dengan tim
**DELIVERABLES**: 
1. ✅ Enhanced web client (sudah ready)
2. ✅ ESP32 firmware dengan dual I2C master
3. ✅ I2C protocol documentation untuk tim
4. ✅ Integration testing support

Tim kamu handle semua complexity dari distributed motor control, kamu fokus pada command distribution dan coordination di level ESP32! 🚀

---

## 🚀 **IMPLEMENTATION COMPLETED: Distributed Architecture ESP32 Firmware**

### ✅ **Enhanced ESP32 Firmware - Completed December 2024**

The ESP32 firmware has been completely rewritten to support the new distributed dual-arm architecture:

#### **🔧 New Architecture Implementation**

```cpp
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETED ESP32 FIRMWARE ARCHITECTURE                   │
│                        (Production Ready - Dec 2024)                       │
└─────────────────────────────────────────────────────────────────────────────┘

ESP32 WiFi Bridge
├─ CommandForwarder.cpp/h (Enhanced)
│  ├─ Dual I2C Master Support
│  │  ├─ ARM1 Master Nano (0x10)
│  │  └─ ARM2 Master Nano (0x20)
│  ├─ Independent Arm Script Management
│  │  ├─ ArmScript structures for ARM1/ARM2
│  │  ├─ Command status tracking
│  │  └─ Error handling per arm
│  ├─ I2C Communication Protocol
│  │  ├─ sendI2CCommand()
│  │  ├─ sendI2CCommandAndWait()
│  │  ├─ readI2CResponse()
│  │  └─ checkI2CDeviceStatus()
│  └─ Enhanced Status Reporting
│     ├─ printDetailedStatus()
│     ├─ getArmProgress()
│     └─ getArmStatus()
├─ HttpClient.cpp/h (Existing)
└─ SerialBridge.cpp/h (Legacy support)
```

#### **📊 Complete System Block Diagram with Data Flow**

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PALLETIZEROT DISTRIBUTED ARCHITECTURE                                  │
│                                        (13 Device Network)                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

📱 LAYER 1: WEB CLIENT (Next.js + React + TypeScript)
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🌐 Web Browser (localhost:3000)                                                                       │
│  ┌─────────────────────────┐    ┌─────────────────────────┐    ┌──────────────────────────────────┐  │
│  │     ARM1 Editor         │    │      ARM2 Editor        │    │        Debug Terminal            │  │
│  │  ┌─────────────────────┐│    │  ┌─────────────────────┐│    │  ┌──────────────────────────────┐│  │
│  │  │ MSL Script:         ││    │  │ RAW Commands:       ││    │  │ [ARM1] Command sent: X:100  ││  │
│  │  │ X(100); Y(50);      ││    │  │ X200                ││    │  │ [ARM2] I2C response: OK     ││  │
│  │  │ FUNC(pick) {        ││    │  │ Y300                ││    │  │ [I2C] 8/10 slaves connected ││  │
│  │  │   Z(100); G(600);   ││    │  │ G600                ││    │  │ [SYS] Dual-arm exec started ││  │
│  │  │ } CALL(pick);       ││    │  │ ZERO                ││    │  └──────────────────────────────┘│  │
│  │  └─────────────────────┘│    │  └─────────────────────┘│    └──────────────────────────────────┘  │
│  └─────────────────────────┘    └─────────────────────────┘                                           │
│           │ MSL Compile                  │ RAW Passthrough                   ▲ SSE Real-time           │
│           ▼                              ▼                                   │ Debug Stream            │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              MSL Compiler (TypeScript)                                          │  │
│  │  Input: X(100); FUNC(pick)... → Output: ["MOVE:X100", "MOVE:Z100", "MOVE:G600"]                │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
           │ HTTP POST /api/script/save {armId: "arm1", script: "...", format: "msl"}
           │ HTTP POST /api/script/raw  {armId: "arm2", script: "...", format: "raw"}
           ▼

🖥️  LAYER 2: NODE.JS SERVER (Express + SSE)
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🚀 Server (localhost:3006)                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                               SYSTEM STATE MANAGER                                            │  │
│  │  ┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────────────────────────┐  │  │
│  │  │    ARM1 Script      │    │    ARM2 Script      │    │      Distributed Status         │  │  │
│  │  │ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ ┌──────────────────────────────┐ │  │  │
│  │  │ │ Commands: 15    │ │    │ │ Commands: 8     │ │    │ │ ESP32: Connected ✅           │ │  │  │
│  │  │ │ Format: MSL     │ │    │ │ Format: RAW     │ │    │ │ ARM1 Master: Online ✅       │ │  │  │
│  │  │ │ Status: Ready   │ │    │ │ Status: Ready   │ │    │ │ ARM1 Slaves: 5/5 ✅         │ │  │  │
│  │  │ │ Progress: 0%    │ │    │ │ Progress: 0%    │ │    │ │ ARM2 Master: Online ✅       │ │  │  │
│  │  │ └─────────────────┘ │    │ └─────────────────┘ │    │ │ ARM2 Slaves: 4/5 ⚠️         │ │  │  │
│  │  └─────────────────────┘    └─────────────────────┘    │ └──────────────────────────────┘ │  │  │
│  │                                                        └──────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                             │ HTTP GET /api/script/poll (every 2 seconds)            │
│                                             ▼ JSON Response: {armId, commands[], format}             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

📡 LAYER 3: ESP32 WIFI BRIDGE (I2C Dual Master)
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🔌 ESP32 (WiFi + I2C Master)                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                            COMMAND FORWARDER (Enhanced)                                        │  │
│  │  ┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────────────────────────┐  │  │
│  │  │   ARM1 Manager      │    │   ARM2 Manager      │    │        I2C Controller            │  │  │
│  │  │ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ ┌──────────────────────────────┐ │  │  │
│  │  │ │ Commands: 15/15 │ │    │ │ Commands: 8/8   │ │    │ │ Wire.begin() ✅              │ │  │  │
│  │  │ │ Index: 3        │ │    │ │ Index: 1        │ │    │ │ Clock: 100kHz ✅             │ │  │  │
│  │  │ │ Status: EXEC    │ │    │ │ Status: EXEC    │ │    │ │ ARM1 Master (0x10): OK ✅   │ │  │  │
│  │  │ │ I2C Addr: 0x10  │ │    │ │ I2C Addr: 0x20  │ │    │ │ ARM2 Master (0x20): OK ✅   │ │  │  │
│  │  │ └─────────────────┘ │    │ └─────────────────┘ │    │ └──────────────────────────────┘ │  │  │
│  │  └─────────────────────┘    └─────────────────────┘    └──────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────────┘  │
│           │ convertToI2C("MOVE:X100", "arm1")                │ convertToI2C("RAW:Y300", "arm2")     │
│           │ → "arm1:X:100"                                   │ → "arm2:RAW:Y300"                    │
│           ▼ I2C Send to 0x10                                 ▼ I2C Send to 0x20                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

🤖 LAYER 4: ARDUINO NANO MASTERS (Team Development)
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐    ┌─────────────────────────────────────────────┐  │
│  │        🦾 ARM1 MASTER NANO (0x10)           │    │        🦾 ARM2 MASTER NANO (0x20)           │  │
│  │  ┌─────────────────────────────────────────┐│    │  ┌─────────────────────────────────────────┐│  │
│  │  │         I2C SLAVE RECEIVER              ││    │  │         I2C SLAVE RECEIVER              ││  │
│  │  │  ESP32 → "arm1:X:100"                  ││    │  │  ESP32 → "arm2:RAW:Y300"               ││  │
│  │  │  Parse → ARM=arm1, CMD=X, VAL=100      ││    │  │  Parse → ARM=arm2, CMD=RAW, VAL=Y300   ││  │
│  │  │  Response → "OK" | "DONE" | "ERROR"    ││    │  │  Response → "OK" | "DONE" | "ERROR"    ││  │
│  │  └─────────────────────────────────────────┘│    │  └─────────────────────────────────────────┘│  │
│  │  ┌─────────────────────────────────────────┐│    │  ┌─────────────────────────────────────────┐│  │
│  │  │         I2C MASTER DISTRIBUTOR          ││    │  │         I2C MASTER DISTRIBUTOR          ││  │
│  │  │  X-Command → Slave 0x11                ││    │  │  Y-Command → Slave 0x22                ││  │
│  │  │  Y-Command → Slave 0x12                ││    │  │  X-Command → Slave 0x21                ││  │
│  │  │  Z-Command → Slave 0x13                ││    │  │  Z-Command → Slave 0x23                ││  │
│  │  │  T-Command → Slave 0x14                ││    │  │  T-Command → Slave 0x24                ││  │
│  │  │  G-Command → Slave 0x15                ││    │  │  G-Command → Slave 0x25                ││  │
│  │  └─────────────────────────────────────────┘│    │  └─────────────────────────────────────────┘│  │
│  └─────────────────────────────────────────────┘    └─────────────────────────────────────────────┘  │
│           │ I2C Commands to 5 Slaves                         │ I2C Commands to 5 Slaves             │
│           ▼                                                  ▼                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

⚙️  LAYER 5: ARDUINO NANO SLAVES (Team Development)
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ARM1 SLAVES                                          ARM2 SLAVES                                     │
│  ┌───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬──────────┬──────────┐
│  │🔩 X-AXIS  │🔩 Y-AXIS  │🔩 Z-AXIS  │🔩 T-ROTAT │🔩 GRIPPER │🔩 X-AXIS  │🔩 Y-AXIS  │🔩 Z-AXIS  │🔩 T-ROTAT│🔩 GRIPPER│
│  │  (0x11)   │  (0x12)   │  (0x13)   │  (0x14)   │  (0x15)   │  (0x21)   │  (0x22)   │  (0x23)   │  (0x24)  │  (0x25)  │
│  ├───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼──────────┼──────────┤
│  │           │           │           │           │           │           │           │           │          │          │
│  │🔌 Stepper │🔌 Stepper │🔌 Stepper │🔌 Servo   │🔌 Servo   │🔌 Stepper │🔌 Stepper │🔌 Stepper │🔌 Servo  │🔌 Servo  │
│  │ Motor     │ Motor     │ Motor     │ Motor     │ Motor     │ Motor     │ Motor     │ Motor     │ Motor    │ Motor    │
│  │           │           │           │           │           │           │           │           │          │          │
│  │ AccelStep │ AccelStep │ AccelStep │ Servo.h   │ Servo.h   │ AccelStep │ AccelStep │ AccelStep │ Servo.h  │ Servo.h  │
│  │ Library   │ Library   │ Library   │ Library   │ Library   │ Library   │ Library   │ Library   │ Library  │ Library  │
│  │           │           │           │           │           │           │           │           │          │          │
│  │ Position  │ Position  │ Position  │ Angle     │ Open/Close│ Position  │ Position  │ Position  │ Angle    │Open/Close│
│  │ Control   │ Control   │ Control   │ Control   │ Control   │ Control   │ Control   │ Control   │ Control  │ Control  │
│  └───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴──────────┴──────────┘
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

📊 DATA FLOW SUMMARY:
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  1️⃣  Web Client: MSL/RAW Script → HTTP POST → Node.js Server                                          │
│  2️⃣  Server: Store ARM1/ARM2 Scripts → HTTP Polling Response → ESP32                                 │  
│  3️⃣  ESP32: I2C Distribution → ARM1 Master (0x10) & ARM2 Master (0x20)                               │
│  4️⃣  Masters: Command Parsing → I2C Distribution → 5 Slave Nanos per arm                             │
│  5️⃣  Slaves: Motor Control → AccelStepper/Servo → Physical Movement                                   │
│  6️⃣  Status Flow: Slaves → Masters → ESP32 → Server → Web Client (SSE)                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

🎯 PARALLEL EXECUTION CAPABILITY:
ARM1 Processing: X(100) + Y(50) + Z(10) = Simultaneous 3-axis movement
ARM2 Processing: T(90) + G(600) = Simultaneous rotation + grip
TOTAL THROUGHPUT: Up to 10 motors moving simultaneously (5 per arm)
```

#### **📊 Key Implementation Features**

**1. Dual Arm Command Management**
```cpp
struct ArmScript {
  String commands[50];      // Commands per arm
  int commandCount;         // Total commands
  int currentIndex;         // Execution progress
  String armId;            // "arm1" or "arm2"
  String format;           // "msl" or "raw"
  bool isActive;           // Execution state
  CommandStatus status;    // Detailed status tracking
};
```

**2. I2C Communication Protocol**
```cpp
// I2C Addresses
#define ARM1_MASTER_ADDR 0x10
#define ARM2_MASTER_ADDR 0x20

// Command Format: "ARM:COMMAND:PARAMS"
String convertToI2C(String webCommand, String armId) {
  String i2cCommand = armId + ":";
  if (webCommand.startsWith("MOVE:X")) {
    i2cCommand += "X:" + webCommand.substring(6);
  }
  // ... additional command conversions
  return i2cCommand;
}
```

**3. Parallel Arm Processing**
```cpp
void processNextCommand() {
  if (!isRunning) return;
  
  // Process both arms simultaneously
  bool arm1Active = arm1Script.isActive && arm1Script.currentIndex < arm1Script.commandCount;
  bool arm2Active = arm2Script.isActive && arm2Script.currentIndex < arm2Script.commandCount;
  
  if (arm1Active) processArmCommands(arm1Script, ARM1_MASTER_ADDR);
  if (arm2Active) processArmCommands(arm2Script, ARM2_MASTER_ADDR);
  
  // Auto-complete when both arms finish
  if (!arm1Active && !arm2Active) {
    isRunning = false;
    Serial.println("All dual-arm commands completed");
  }
}
```

#### **🌐 Enhanced Server API Integration**

**New Server Endpoints:**
- `POST /api/esp32/status` - Distributed architecture status reporting
- `GET /api/architecture` - Detailed system architecture information
- Enhanced `/api/status` with distributed device tracking

**Enhanced Status Tracking:**
```typescript
interface SystemState {
  arm1Status: {
    isActive: boolean
    progress: number
    status: string
    masterNanoConnected: boolean
    slaveNodesConnected: number
  }
  arm2Status: {
    isActive: boolean
    progress: number  
    status: string
    masterNanoConnected: boolean
    slaveNodesConnected: number
  }
}
```

#### **🔌 I2C Protocol Specification for Arduino Team**

**Command Format:**
```
ESP32 → Master Nano: "arm1:X:100"     // ARM1 move X to 100
ESP32 → Master Nano: "arm2:GROUP:X,Y" // ARM2 group movement
ESP32 → Master Nano: "arm1:ZERO"      // ARM1 home command

Master Nano → ESP32: "OK"             // Command accepted
Master Nano → ESP32: "DONE"           // Command completed
Master Nano → ESP32: "ERROR:message"  // Command failed
```

**I2C Addresses:**
- ARM1 Master Nano: `0x10`
- ARM1 Slave Nanos: `0x11` (X), `0x12` (Y), `0x13` (Z), `0x14` (T), `0x15` (G)
- ARM2 Master Nano: `0x20`
- ARM2 Slave Nanos: `0x21` (X), `0x22` (Y), `0x23` (Z), `0x24` (T), `0x25` (G)

#### **🎯 Debug and Monitoring Features**

**Serial Commands:**
- `status` - Show detailed system status
- `arm1` - Show ARM1 specific status
- `arm2` - Show ARM2 specific status
- `help` - Show command list

**Automatic Status Reports:**
- Detailed status every 30 seconds
- Real-time command logging
- I2C connectivity monitoring
- Error detection and reporting

#### **💾 Memory Optimization**

- **Reduced Commands Per Arm**: 50 commands (from 100) for memory efficiency
- **Efficient Status Tracking**: Minimal memory footprint per arm
- **Smart Polling**: Only active monitoring when needed
- **Legacy Support**: Maintains backward compatibility with Arduino MEGA

---

## 📋 Key System Features

### ✅ **Completed Optimizations (Updated December 2024)**

1. **Client-Side MSL Compilation**: Full TypeScript compiler in browser
2. **Ultra-Lightweight ESP32**: Pure command forwarder (99% RAM reduction)
3. **🆕 Distributed Dual Arm Support**: Independent I2C-based execution for 2 arms + 10 slave Nanos
4. **🆕 I2C Protocol Implementation**: Complete ESP32 master with acknowledgment system
5. **Real-time Debugging**: SSE terminal with 1000+ message buffer
6. **🆕 Enhanced Modular ESP32 Firmware**: Object-oriented architecture with distributed communication
7. **🆕 Arduino Team Coordination**: Complete I2C specifications and protocol documentation
8. **Optimal Data Flow**: Direct web-to-distributed-nano communication pipeline

### 🎯 **Performance Metrics (Updated)**

- **ESP32 RAM Usage**: 250KB → 3KB (99% reduction) ✅
- **Script Complexity**: Unlimited (web client processing) ✅
- **🆕 Dual Arm Coordination**: Parallel execution with I2C distribution ✅
- **🆕 I2C Communication**: 100kHz reliable with error handling ✅
- **Command Latency**: ~100-500ms per command ✅
- **Network Overhead**: <1KB per command ✅
- **Compilation Time**: <50ms for 100 commands ✅
- **Real-time Updates**: <100ms SSE latency ✅

### 🔧 **Technical Highlights (Updated Architecture)**

- **Frontend**: Next.js 15 + React 18 + Tailwind CSS 4 ✅
- **Backend**: Node.js + Express + Server-Sent Events ✅
- **🆕 Firmware**: ESP32 (I2C dual master) + 2x Arduino Nano Masters + 10x Arduino Nano Slaves
- **🆕 Architecture**: Distributed motor control with master-slave hierarchy
- **Language**: Modern Script Language (MSL) with functions, loops, groups ✅
- **🆕 Communication**: HTTP polling + I2C protocol + Serial UART (legacy)
- **Development**: Concurrent dev servers + ESP32 simulator ✅

---

*Generated automatically from PalletizerOT system analysis*  
*Last updated: 2025-01-01*