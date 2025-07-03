# PALLETIZEROT - SYSTEM FLOWS & TECHNICAL ARCHITECTURE

**System Data Flow dan Processing Logic** untuk PalletizerOT - Complete technical implementation dari Modern Script Language (MSL) compilation, command processing, dan ultra-lightweight ESP32 command forwarding architecture.

```
   +=============================================================================+
                      🔄 PALLETIZEROT SYSTEM FLOWS                        |
                                                                           |
   |  🧠 MSL Compiler  <->  📊 Command Pipeline  <->  🔌 ESP32 Bridge  <->  🤖 Motors  |
                                                                           |
   |    Web Browser     |   Express Server    |   UART Protocol   |   5-Axis     |
   |    TypeScript      |   Command Storage   |   Serial Bridge   |   Control    |
   |    Real-time UI    |   SSE Events        |   Format Convert  |   AccelStep  |
   +=============================================================================+
```

---

# 📋 TABLE OF CONTENTS

- [2.1 MSL Compilation & Processing Flow](#21-msl-compilation-processing-flow)
- [2.2 Command Pipeline & Distribution Flow](#22-command-pipeline-distribution-flow)
- [2.3 ESP32 Command Forwarding Flow](#23-esp32-command-forwarding-flow)
- [2.4 Real-time Communication Flow](#24-real-time-communication-flow)
- [2.5 Dual-Arm Support Architecture](#25-dual-arm-support-architecture)
- [2.6 Error Handling & Recovery Flow](#26-error-handling-recovery-flow)

---

## 2.1 MSL Compilation & Processing Flow

### **Web Client-Based MSL Compiler Pipeline**
```
  ----------------------------------------------------------------------------+
                    MSL COMPILATION & PROCESSING FLOW                      |
  ----------------------------------------------------------------------------+
                                                                          |
|  📝 MSL INPUT           🧠 COMPILER ENGINE        📊 COMMAND OUTPUT          |
                                                                          |
|    ----------------+       ----------------+       ----------------+       |
|  | MSL Script      |---->| MSLCompiler.ts  |---->| Command Arrays  |       |
|  | Text Editor     |     | Main Engine     |     | ESP32 Format    |       |
|  |                 |     |                 |     |                 |       |
|  | FUNC(PICK) {    |     | • Tokenization  |     | ["x;1;100;",    |       |
|  |   X(100);       |     | • Parsing       |     |  "y;1;50;",     |       |
|  |   Y(50);        |     | • Validation    |     |  "g;1;1;"]      |       |
|  |   G(1);         |     | • Optimization  |     |                 |       |
|  | }               |     |                 |     |                 |       |
|  |                 |     | Error Recovery: |     | Metadata:       |       |
|  | LOOP(5) {       |     | • Syntax Check  |     | • Line Numbers  |       |
|  |   CALL(PICK);   |     | • Range Valid   |     | • Source Map    |       |
|  |   X(200);       |     | • Type Check    |     | • Timing Info   |       |
|  | }               |     | • User Feedback |     | • Dependencies  |       |
|    ----------------+       ----------------+       ----------------+       |
  ----------------------------------------------------------------------------+
```

### **MSL Compiler Component Architecture**
```
  ----------------------------------------------------------------------------+
                     MSL COMPILER COMPONENT ARCHITECTURE                   |
  ----------------------------------------------------------------------------+
                                                                          |
|  🔧 PARSER REGISTRY         📝 SPECIALIZED PARSERS       🎯 OUTPUT GEN       |
                                                                          |
|    ----------------+       ----------------------------+     ------------+  |
|  | ParserRegistry  |     | MovementParser.ts          |   | TextGenerator |  |
|  | Core System     |     | • X,Y,Z,T,G commands       |   | ESP32 Format  |  |
|  |                 |     | • Parameter validation     |   |               |  |
|  | • Parser Setup  |     | • Range checking           |   | • Serial      |  |
|  | • Token Routing |     | • Speed/delay support      |   |   Protocol    |  |
|  | • Error Collect |     |                            |   | • Command     |  |
|  | • Validation    |     | ControlFlowParser.ts       |   |   Arrays      |  |
|  |                 |     | • FUNC/ENDFUNC blocks      |   | • Line Map    |  |
|  | Function Mgr:   |     | • LOOP/ENDLOOP expansion   |   | • Error Info  |  |
|  | • Definition    |     | • CALL resolution          |   |               |  |
|  | • Call Stack    |     | • Nested structures        |   | Format:       |  |
|  | • Recursion     |     |                            |   | • x;1;100;    |  |
|  | • Validation    |     | GroupParser.ts             |   | • y;1;50;     |  |
|  |                 |     | • GROUP(cmds...) async     |   | • z;1;10;     |  |
|  | Loop Manager:   |     | • GROUPSYNC(cmds...) sync  |   | • t;1;45;     |  |
|  | • Expansion     |     | • Multi-axis coordination  |   | • g;1;1;      |  |
|  | • Nesting       |     |                            |   |               |  |
|  | • Optimization  |     | SystemParser.ts            |   | Metadata:     |  |
|  | • Unrolling     |     | • ZERO() home all          |   | • Source map  |  |
|  |                 |     | • WAIT(ms) delays          |   | • Timing      |  |
|    ----------------+       | • DELAY(ms) pauses         |   | • Validation  |  |
                           | • DETECT() sensor reads    |     ------------+  |
                             ----------------------------+                     |
  ----------------------------------------------------------------------------+
```

### **Real-time Compilation Process**
```javascript
// MSL Compilation Flow dalam MSLCompiler.ts
const compileMSL = async (mslScript: string): Promise<CompilationResult> => {
  try {
    // 1. Tokenization - Split MSL into tokens
    const tokens = tokenize(mslScript);
    
    // 2. Parser Registration - Setup specialized parsers
    const parserRegistry = new ParserRegistry();
    parserRegistry.register('movement', new MovementParser());
    parserRegistry.register('control', new ControlFlowParser());
    parserRegistry.register('group', new GroupParser());
    parserRegistry.register('system', new SystemParser());
    
    // 3. Function Discovery - Find all FUNC definitions
    const functionManager = new FunctionManager();
    const functions = functionManager.extractFunctions(tokens);
    
    // 4. Loop Processing - Expand all LOOP structures
    const loopManager = new LoopManager();
    const expandedTokens = loopManager.expandLoops(tokens);
    
    // 5. Parsing - Convert tokens to commands
    const commands = [];
    for (const token of expandedTokens) {
      const parser = parserRegistry.getParser(token.type);
      const command = parser.parse(token);
      commands.push(command);
    }
    
    // 6. Function Resolution - Resolve all CALL statements
    const resolvedCommands = functionManager.resolveCalls(commands, functions);
    
    // 7. Validation - Check ranges, syntax, dependencies
    const validation = validateCommands(resolvedCommands);
    if (!validation.isValid) {
      throw new CompilationError(validation.errors);
    }
    
    // 8. Optimization - Remove redundancy, optimize timing
    const optimizedCommands = optimizeCommands(resolvedCommands);
    
    // 9. Text Generation - Convert to ESP32 format
    const textGenerator = new TextGenerator();
    const outputText = textGenerator.generate(optimizedCommands);
    
    return {
      success: true,
      commands: optimizedCommands,
      outputText: outputText,
      metadata: {
        originalLines: mslScript.split('\n').length,
        expandedCommands: optimizedCommands.length,
        compilationTime: Date.now() - startTime,
        functionCount: functions.length,
        loopExpansions: loopManager.getExpansionCount()
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      lineNumber: error.lineNumber,
      suggestions: generateSuggestions(error)
    };
  }
};
```

### **MSL Command Processing Examples**
```javascript
// Movement Command Processing
// Input MSL: X(100, 1500, 200);
// Parser Process:
{
  type: 'movement',
  axis: 'X',
  position: 100,      // Required parameter
  speed: 1500,        // Optional (default: axis default)
  delay: 200,         // Optional (default: 0)
  validation: {
    positionRange: [0, 1000],     // Axis limits
    speedRange: [100, 3000],      // Speed limits
    delayRange: [0, 10000]        // Delay limits
  }
}
// Output: "x;1;100;1500;200;"

// Group Command Processing  
// Input MSL: GROUP(X(100), Y(50), Z(10));
// Parser Process:
{
  type: 'group',
  mode: 'async',      // Asynchronous execution
  commands: [
    { axis: 'X', position: 100 },
    { axis: 'Y', position: 50 },
    { axis: 'Z', position: 10 }
  ]
}
// Output: ["x;1;100;", "y;1;50;", "z;1;10;"] // Sent simultaneously

// Function Processing
// Input MSL: 
// FUNC(PICK) {
//   Z(0);
//   G(1);
//   Z(50);
// }
// CALL(PICK);

// Function Manager Process:
functionDefinitions.set('PICK', [
  { type: 'movement', axis: 'Z', position: 0 },
  { type: 'movement', axis: 'G', action: 1 },
  { type: 'movement', axis: 'Z', position: 50 }
]);

// Call Resolution:
// CALL(PICK) expands to:
["z;1;0;", "g;1;1;", "z;1;50;"]
```

## 2.2 Command Pipeline & Distribution Flow

### **Server Command Storage & Distribution Architecture**
```
  ----------------------------------------------------------------------------+
                   COMMAND PIPELINE & DISTRIBUTION FLOW                   |
  ----------------------------------------------------------------------------+
                                                                          |
|  📱 WEB CLIENT              🖥️ EXPRESS SERVER         🔌 ESP32 POLLING       |
                                                                          |
|    ----------------+       ----------------+       ----------------+       |
|  | MSL Compilation |---->| Command Storage |<----| HTTP Polling    |       |
|  | Complete        |     | In-Memory       |     | Every 100ms     |       |
|  |                 |     |                 |     |                 |       |
|  | POST            | --> | Command Arrays: | <-- | GET /api/script/|       |
|  | /api/script/    |     | {               |     | poll            |       |
|  | save            |     |   arm1: [...],  |     |                 |       |
|  |                 |     |   arm2: [...],  |     | Response:       |       |
|  | Payload:        |     |   status: {},   |     | {               |       |
|  | {               |     |   metadata: {}  |     |   commands: [], |       |
|  |   commands: [], |     | }               |     |   hasMore: bool,|       |
|  |   arm: 'arm1',  |     |                 |     |   execId: "..." |       |
|  |   replace: true |     | Execution Ctrl: |     | }               |       |
|  | }               |     | • Start/Stop    |     |                 |       |
|  |                 |     | • Pause/Resume  |     | ESP32 Executes: |       |
|  | Real-time UI:   |     | • Status Track  |     | • Command Queue |       |
|  | • Progress      |     | • Error Handle  |     | • Serial Bridge |       |
|  | • Status        |     |                 |     | • Status Report |       |
|    ----------------+       ----------------+       ----------------+       |
  ----------------------------------------------------------------------------+
```

### **Express Server Implementation**
```javascript
// src/server/index.ts - Complete server implementation (632 lines)
const express = require('express');
const cors = require('cors');
const { Bonjour } = require('bonjour-service');

class PalletizerServer {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSSE();
    this.setupMDNS();
    
    // Command storage untuk dual-arm support
    this.commandStorage = {
      arm1: { commands: [], status: 'idle', metadata: {} },
      arm2: { commands: [], status: 'idle', metadata: {} }
    };
    
    // SSE clients untuk real-time updates
    this.sseClients = new Set();
  }
  
  setupRoutes() {
    // Script Management
    this.app.post('/api/script/save', this.handleScriptSave.bind(this));
    this.app.post('/api/script/raw', this.handleRawScript.bind(this));
    this.app.get('/api/script/poll', this.handleScriptPoll.bind(this));
    
    // Execution Control
    this.app.post('/api/control/start', this.handleControlStart.bind(this));
    this.app.post('/api/control/pause', this.handleControlPause.bind(this));
    this.app.post('/api/control/stop', this.handleControlStop.bind(this));
    this.app.post('/api/control/zero', this.handleControlZero.bind(this));
    
    // Status & Debug
    this.app.get('/api/status', this.handleStatus.bind(this));
    this.app.get('/api/events', this.handleSSE.bind(this));
  }
  
  async handleScriptSave(req, res) {
    try {
      const { commands, arm = 'arm1', replace = true } = req.body;
      
      if (replace) {
        this.commandStorage[arm].commands = commands;
      } else {
        this.commandStorage[arm].commands.push(...commands);
      }
      
      this.commandStorage[arm].metadata = {
        uploadTime: new Date().toISOString(),
        commandCount: commands.length,
        totalCommands: this.commandStorage[arm].commands.length
      };
      
      // Broadcast ke SSE clients
      this.broadcastSSE('script_update', {
        arm: arm,
        commandCount: this.commandStorage[arm].commands.length,
        status: 'uploaded'
      });
      
      res.json({ 
        success: true, 
        commandCount: this.commandStorage[arm].commands.length 
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
      this.broadcastSSE('error', { message: error.message });
    }
  }
  
  async handleScriptPoll(req, res) {
    try {
      const { arm = 'arm1', batchSize = 10 } = req.query;
      const storage = this.commandStorage[arm];
      
      if (storage.commands.length === 0) {
        return res.json({ 
          commands: [], 
          hasMore: false, 
          status: storage.status 
        });
      }
      
      // Get next batch of commands
      const batch = storage.commands.splice(0, batchSize);
      
      res.json({
        commands: batch,
        hasMore: storage.commands.length > 0,
        remainingCommands: storage.commands.length,
        executionId: `exec_${Date.now()}`,
        status: storage.status
      });
      
      // Update execution metrics
      this.broadcastSSE('execution_progress', {
        arm: arm,
        executedCommands: batch.length,
        remainingCommands: storage.commands.length
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
      this.broadcastSSE('error', { message: error.message });
    }
  }
}
```

### **Command Storage & Distribution Logic**
```javascript
// Advanced command storage dengan dual-arm support
class CommandStorageManager {
  constructor() {
    this.storage = new Map();
    this.executionMetrics = new Map();
    this.setupArmStorage('arm1');
    this.setupArmStorage('arm2');
  }
  
  setupArmStorage(armId) {
    this.storage.set(armId, {
      commands: [],
      status: 'idle',           // idle, executing, paused, completed, error
      currentIndex: 0,
      executionId: null,
      metadata: {
        totalCommands: 0,
        executedCommands: 0,
        startTime: null,
        estimatedDuration: 0,
        averageCommandTime: 0
      }
    });
  }
  
  storeCommands(armId, commands, options = {}) {
    const armStorage = this.storage.get(armId);
    
    if (options.replace) {
      armStorage.commands = [...commands];
      armStorage.currentIndex = 0;
    } else {
      armStorage.commands.push(...commands);
    }
    
    armStorage.metadata.totalCommands = armStorage.commands.length;
    armStorage.metadata.uploadTime = new Date().toISOString();
    
    // Estimate execution duration berdasarkan command types
    armStorage.metadata.estimatedDuration = this.estimateExecutionTime(commands);
    
    return {
      success: true,
      commandCount: armStorage.commands.length,
      estimatedDuration: armStorage.metadata.estimatedDuration
    };
  }
  
  getNextBatch(armId, batchSize = 10) {
    const armStorage = this.storage.get(armId);
    
    if (armStorage.currentIndex >= armStorage.commands.length) {
      return {
        commands: [],
        hasMore: false,
        completed: true
      };
    }
    
    const endIndex = Math.min(
      armStorage.currentIndex + batchSize,
      armStorage.commands.length
    );
    
    const batch = armStorage.commands.slice(armStorage.currentIndex, endIndex);
    armStorage.currentIndex = endIndex;
    
    // Update execution metrics
    armStorage.metadata.executedCommands = armStorage.currentIndex;
    
    return {
      commands: batch,
      hasMore: armStorage.currentIndex < armStorage.commands.length,
      remainingCommands: armStorage.commands.length - armStorage.currentIndex,
      progress: (armStorage.currentIndex / armStorage.commands.length) * 100,
      executionId: armStorage.executionId || `exec_${Date.now()}`
    };
  }
  
  estimateExecutionTime(commands) {
    // Estimate berdasarkan command types dan typical execution times
    const timingEstimates = {
      movement: 1000,    // 1 second average for movement commands
      group: 1500,       // 1.5 seconds for group movements
      wait: 0,           // Depends on WAIT parameter
      system: 500        // 0.5 seconds for system commands
    };
    
    let totalTime = 0;
    
    commands.forEach(command => {
      const commandType = this.getCommandType(command);
      totalTime += timingEstimates[commandType] || 1000;
      
      // Add WAIT/DELAY times
      if (command.includes('wait;') || command.includes('delay;')) {
        const waitTime = this.extractWaitTime(command);
        totalTime += waitTime;
      }
    });
    
    return totalTime;
  }
}
```

## 2.3 ESP32 Command Forwarding Flow

### **Ultra-Lightweight ESP32 Architecture**
```
  ----------------------------------------------------------------------------+
                    ESP32 COMMAND FORWARDING ARCHITECTURE                  |
  ----------------------------------------------------------------------------+
                                                                          |
|  📡 HTTP CLIENT             🧠 COMMAND LOGIC          📟 SERIAL BRIDGE      |
                                                                          |
|    ----------------+       ----------------+       ----------------+       |
|  | HttpClient.cpp  |---->| CommandForwarder|---->| SerialBridge.cpp|       |
|  | Server Comm     |     | Main Logic      |     | Arduino Bridge  |       |
|  |                 |     |                 |     |                 |       |
|  | • HTTP Polling  |     | • Command Queue |     | • UART TX/RX    |       |
|  | • JSON Parse    |     | • Format Convert|     | • Protocol Hand |       |
|  | • Auto-retry    |     | • Error Handle  |     | • Response Proc |       |
|  | • WiFi Manage   |     | • Status Track  |     | • Buffer Manage |       |
|  |                 |     |                 |     |                 |       |
|  | Class Features: |     | Ultra-Light:    |     | Dual-UART:      |       |
|  | • Async Ops     |     | • 3KB RAM Only  |     | • Arm1: GPIO16/17|       |
|  | • Error Recovery|     | • No Processing |     | • Arm2: GPIO18/19|       |
|  | • Connection    |     | • Pure Forward  |     | • Format: x;1;100;|      |
|  |   Management    |     | • Minimal Deps  |     | • ACK Handling  |       |
|    ----------------+       ----------------+       ----------------+       |
  ----------------------------------------------------------------------------+
```

### **ESP32 Firmware Implementation**
```cpp
// FirmwareESP32.ino - Ultra-clean main file (11 lines only!)
#include "CommandForwarder.h"

CommandForwarder forwarder;

void setup() {
  forwarder.begin();
}

void loop() {
  forwarder.update();
}

// CommandForwarder.cpp - Main logic class
class CommandForwarder {
private:
  HttpClient httpClient;
  SerialBridge serialBridge;
  
  // Ultra-lightweight state management
  String commandQueue[MAX_QUEUE_SIZE];
  int queueIndex = 0;
  int queueSize = 0;
  
  unsigned long lastPollTime = 0;
  const unsigned long POLL_INTERVAL = 100; // 100ms polling
  
public:
  void begin() {
    Serial.begin(115200);
    serialBridge.begin();
    httpClient.begin();
    
    Serial.println("PalletizerOT ESP32 Command Forwarder v1.0");
    Serial.println("Ultra-lightweight architecture - 3KB RAM usage");
  }
  
  void update() {
    // Non-blocking polling untuk server commands
    if (millis() - lastPollTime >= POLL_INTERVAL) {
      pollServerForCommands();
      lastPollTime = millis();
    }
    
    // Process command queue
    processCommandQueue();
    
    // Handle serial responses
    serialBridge.processResponses();
    
    // Minimal delay untuk stability
    delay(1);
  }
  
  void pollServerForCommands() {
    String response = httpClient.poll("/api/script/poll?arm=arm1");
    
    if (response.length() > 0) {
      parseAndQueueCommands(response);
    }
  }
  
  void parseAndQueueCommands(String jsonResponse) {
    // Minimal JSON parsing untuk extract commands array
    JsonDocument doc;
    deserializeJson(doc, jsonResponse);
    
    JsonArray commands = doc["commands"];
    
    for (JsonVariant command : commands) {
      if (queueSize < MAX_QUEUE_SIZE) {
        commandQueue[queueSize] = command.as<String>();
        queueSize++;
      }
    }
  }
  
  void processCommandQueue() {
    if (queueIndex < queueSize) {
      String command = commandQueue[queueIndex];
      
      // Forward command to Arduino MEGA via serial
      bool success = serialBridge.sendCommand(command);
      
      if (success) {
        queueIndex++;
        
        // Report execution status ke server
        httpClient.reportStatus("executing", queueIndex, queueSize - queueIndex);
      }
    }
  }
};
```

### **Serial Protocol Implementation**
```cpp
// SerialBridge.cpp - Arduino MEGA communication
class SerialBridge {
private:
  HardwareSerial* arm1Serial; // GPIO16/17
  HardwareSerial* arm2Serial; // GPIO18/19
  
  String responseBuffer = "";
  unsigned long commandTimeout = 5000; // 5 second timeout
  
public:
  void begin() {
    // Dual-UART setup for dual-arm support
    arm1Serial = &Serial1;
    arm2Serial = &Serial2;
    
    arm1Serial->begin(115200, SERIAL_8N1, 16, 17); // RX, TX for Arm1
    arm2Serial->begin(115200, SERIAL_8N1, 18, 19); // RX, TX for Arm2
    
    Serial.println("SerialBridge: Dual-UART initialized");
  }
  
  bool sendCommand(String command, String targetArm = "arm1") {
    HardwareSerial* targetSerial = (targetArm == "arm2") ? arm2Serial : arm1Serial;
    
    // Send command dengan proper protocol format
    targetSerial->println(command);
    
    // Wait for acknowledgment dari Arduino MEGA
    unsigned long startTime = millis();
    
    while (millis() - startTime < commandTimeout) {
      if (targetSerial->available()) {
        String response = targetSerial->readStringUntil('\n');
        response.trim();
        
        if (response == "DONE" || response == "OK") {
          Serial.printf("Command executed: %s -> %s\n", command.c_str(), response.c_str());
          return true;
        } else if (response == "ERROR" || response.startsWith("ERR:")) {
          Serial.printf("Command failed: %s -> %s\n", command.c_str(), response.c_str());
          return false;
        }
      }
      
      delay(1); // Small delay untuk prevent tight loop
    }
    
    // Timeout occurred
    Serial.printf("Command timeout: %s\n", command.c_str());
    return false;
  }
  
  void processResponses() {
    // Process responses dari both arms
    processArmResponses(arm1Serial, "arm1");
    processArmResponses(arm2Serial, "arm2");
  }
  
  void processArmResponses(HardwareSerial* serial, String armId) {
    while (serial->available()) {
      String response = serial->readStringUntil('\n');
      response.trim();
      
      if (response.length() > 0) {
        // Forward response ke server untuk debugging
        forwardResponseToServer(response, armId);
      }
    }
  }
};
```

### **Command Format Conversion**
```
MSL Command:     X(100, 1500, 200);
↓
Compiled Format: x;1;100;1500;200;
↓
ESP32 Processing: Parse parameters, validate format
↓
Serial Protocol: x;1;100;1500;200;\n
↓
Arduino MEGA:    Stepper motor control execution
↓
Response:        DONE\n or ERROR\n
↓
ESP32 Status:    Success/failure reporting
↓
Server Update:   SSE event to web client
```

## 2.4 Real-time Communication Flow

### **Server-Sent Events (SSE) Architecture**
```
  ----------------------------------------------------------------------------+
                     REAL-TIME COMMUNICATION ARCHITECTURE                  |
  ----------------------------------------------------------------------------+
                                                                          |
|  📱 WEB CLIENT              📡 SSE EVENTS             🔌 ESP32 STATUS        |
                                                                          |
|    ----------------+       ----------------+       ----------------+       |
|  | Event Listener  |<----| Express SSE     |<----| Status Reports  |       |
|  | Debug Terminal  |     | Event Stream    |     | HTTP Updates    |       |
|  |                 |     |                 |     |                 |       |
|  | Real-time UI:   |     | Event Types:    |     | Report Types:   |       |
|  | • Command Log   |     | • debug         |     | • execution     |       |
|  | • Status Updates|     | • status        |     | • error         |       |
|  | • Error Display |     | • error         |     | • completion    |       |
|  | • Progress Bar  |     | • progress      |     | • connection    |       |
|  |                 |     | • connection    |     |                 |       |
|  | Auto-reconnect: |     |                 |     | Polling Data:   |       |
|  | • Connection    |     | Broadcasting:   |     | • Commands exec |       |
|  |   Monitoring    |     | • All clients   |     | • Status changes|       |
|  | • Retry Logic   |     | • Real-time     |     | • Error states  |       |
|  | • Error Recovery|     | • Low Latency   |     | • Progress info |       |
|    ----------------+       ----------------+       ----------------+       |
  ----------------------------------------------------------------------------+
```

### **SSE Implementation**
```javascript
// Server-side SSE implementation (src/server/index.ts)
class SSEManager {
  constructor() {
    this.clients = new Set();
    this.setupHeartbeat();
  }
  
  handleSSEConnection(req, res) {
    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Add client to active connections
    const clientId = Date.now().toString();
    const client = { id: clientId, response: res, lastPing: Date.now() };
    this.clients.add(client);
    
    // Send initial connection event
    this.sendToClient(client, 'connected', { 
      clientId: clientId, 
      serverTime: new Date().toISOString() 
    });
    
    // Handle client disconnect
    req.on('close', () => {
      this.clients.delete(client);
      console.log(`SSE client disconnected: ${clientId}`);
    });
    
    req.on('error', (error) => {
      this.clients.delete(client);
      console.error(`SSE client error: ${error.message}`);
    });
  }
  
  broadcast(eventType, data) {
    const event = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };
    
    // Send to all connected clients
    this.clients.forEach(client => {
      this.sendToClient(client, eventType, data, event.id);
    });
    
    // Log untuk debugging
    console.log(`SSE Broadcast [${eventType}]:`, data);
  }
  
  sendToClient(client, eventType, data, eventId = null) {
    try {
      const eventData = JSON.stringify(data);
      const eventMessage = [
        eventId ? `id: ${eventId}` : '',
        `event: ${eventType}`,
        `data: ${eventData}`,
        '', ''
      ].filter(line => line !== '').join('\n');
      
      client.response.write(eventMessage);
      client.lastPing = Date.now();
      
    } catch (error) {
      console.error('SSE send error:', error);
      this.clients.delete(client);
    }
  }
  
  setupHeartbeat() {
    // Send periodic heartbeat to detect disconnections
    setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach(client => {
        // Remove stale connections (no activity for 30 seconds)
        if (now - client.lastPing > 30000) {
          this.clients.delete(client);
          return;
        }
        
        // Send heartbeat
        this.sendToClient(client, 'heartbeat', { timestamp: now });
      });
    }, 10000); // Every 10 seconds
  }
}

// Usage dalam Express routes
const sseManager = new SSEManager();

// SSE endpoint
app.get('/api/events', (req, res) => {
  sseManager.handleSSEConnection(req, res);
});

// Broadcast events dari various sources
const broadcastDebug = (message) => {
  sseManager.broadcast('debug', { message: message, timestamp: Date.now() });
};

const broadcastStatus = (status) => {
  sseManager.broadcast('status', status);
};

const broadcastError = (error) => {
  sseManager.broadcast('error', { 
    message: error.message, 
    stack: error.stack,
    timestamp: Date.now() 
  });
};
```

### **Client-side SSE Integration**
```javascript
// Web client SSE listener (React component)
const useSSEConnection = () => {
  const [events, setEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const eventSourceRef = useRef(null);
  
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const eventSource = new EventSource('http://localhost:3006/api/events');
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      setConnectionStatus('connected');
      console.log('SSE connection established');
    };
    
    // Debug events
    eventSource.addEventListener('debug', (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [...prev, {
        type: 'debug',
        message: data.message,
        timestamp: data.timestamp,
        id: event.lastEventId
      }]);
    });
    
    // Status events
    eventSource.addEventListener('status', (event) => {
      const data = JSON.parse(event.data);
      setConnectionStatus(data.connected ? 'connected' : 'disconnected');
      
      setEvents(prev => [...prev, {
        type: 'status',
        message: `Status: ${JSON.stringify(data)}`,
        timestamp: Date.now(),
        id: event.lastEventId
      }]);
    });
    
    // Error events
    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [...prev, {
        type: 'error',
        message: data.message,
        timestamp: data.timestamp,
        id: event.lastEventId
      }]);
    });
    
    eventSource.onerror = (error) => {
      setConnectionStatus('error');
      console.error('SSE connection error:', error);
      
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          connectSSE();
        }
      }, 3000);
    };
    
  }, []);
  
  useEffect(() => {
    connectSSE();
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectSSE]);
  
  return { events, connectionStatus, reconnect: connectSSE };
};
```

## 2.5 Dual-Arm Support Architecture

### **Independent Dual-Arm Management**
```
  ----------------------------------------------------------------------------+
                      DUAL-ARM SUPPORT ARCHITECTURE                        |
  ----------------------------------------------------------------------------+
                                                                          |
|  📱 WEB INTERFACE           🖥️ SERVER STORAGE         🔌 ESP32 ROUTING      |
                                                                          |
|    ----------------+       ----------------+       ----------------+       |
|  | Arm Selection   |---->| Independent     |---->| UART Routing    |       |
|  | UI Controls     |     | Command Storage |     | Dual Channels   |       |
|  |                 |     |                 |     |                 |       |
|  | Arm1 Controls:  |     | arm1: {         |     | Serial1 (GPIO   |       |
|  | • Script Upload |     |   commands: [], |     | 16/17):         |       |
|  | • Start/Stop    |     |   status: idle, |     | • Arm1 Commands |       |
|  | • Progress      |     |   metadata: {}  |     | • Dedicated     |       |
|  |                 |     | }               |     |   Channel       |       |
|  |                 |     |                 |     |                 |       |
|  | Arm2 Controls:  |     | arm2: {         |     | Serial2 (GPIO   |       |
|  | • Script Upload |     |   commands: [], |     | 18/19):         |       |
|  | • Start/Stop    |     |   status: idle, |     | • Arm2 Commands |       |
|  | • Progress      |     |   metadata: {}  |     | • Independent   |       |
|  |                 |     | }               |     |   Control       |       |
|  |                 |     |                 |     |                 |       |
|  | Synchronized:   |     | Coordination:   |     | Coordination:   |       |
|  | • Both Arms     |     | • Cross-arm     |     | • Timing Sync   |       |
|  | • Coordination  |     |   Scripts       |     | • Status Merge  |       |
|  | • Group Ops     |     | • Group Commands|     | • Error Handle  |       |
|    ----------------+       ----------------+       ----------------+       |
  ----------------------------------------------------------------------------+
```

### **Dual-Arm Implementation**
```javascript
// Server-side dual-arm management
class DualArmManager {
  constructor() {
    this.arms = {
      arm1: new ArmController('arm1'),
      arm2: new ArmController('arm2')
    };
    
    this.coordinatedExecution = false;
    this.synchronizationPoints = [];
  }
  
  uploadScript(armId, commands, options = {}) {
    const arm = this.arms[armId];
    
    if (options.coordinated) {
      // Extract synchronization points dari MSL script
      this.extractSyncPoints(commands);
      this.coordinatedExecution = true;
    }
    
    return arm.uploadCommands(commands);
  }
  
  startExecution(armId = 'both') {
    if (armId === 'both') {
      // Start both arms with coordination
      return this.startCoordinatedExecution();
    } else {
      // Start individual arm
      return this.arms[armId].startExecution();
    }
  }
  
  startCoordinatedExecution() {
    // Coordinate execution antara both arms
    const arm1Commands = this.arms.arm1.getCommands();
    const arm2Commands = this.arms.arm2.getCommands();
    
    // Find synchronization points
    const syncPoints = this.findSynchronizationPoints(arm1Commands, arm2Commands);
    
    // Execute dengan coordination
    return this.executeWithSynchronization(syncPoints);
  }
  
  executeWithSynchronization(syncPoints) {
    return new Promise(async (resolve, reject) => {
      try {
        for (const syncPoint of syncPoints) {
          // Execute commands until next sync point
          await Promise.all([
            this.arms.arm1.executeUntilSync(syncPoint.arm1Index),
            this.arms.arm2.executeUntilSync(syncPoint.arm2Index)
          ]);
          
          // Wait for both arms to reach sync point
          await this.waitForSynchronization(syncPoint);
          
          // Continue to next sync point
        }
        
        // Execute remaining commands
        await Promise.all([
          this.arms.arm1.executeRemaining(),
          this.arms.arm2.executeRemaining()
        ]);
        
        resolve({ success: true, message: 'Coordinated execution completed' });
        
      } catch (error) {
        reject(error);
      }
    });
  }
}

// ESP32 dual-UART implementation
class DualUARTManager {
  constructor() {
    this.arm1Serial = &Serial1; // GPIO16/17
    this.arm2Serial = &Serial2; // GPIO18/19
    
    this.setupUARTChannels();
  }
  
  void setupUARTChannels() {
    arm1Serial->begin(115200, SERIAL_8N1, 16, 17);
    arm2Serial->begin(115200, SERIAL_8N1, 18, 19);
    
    Serial.println("Dual-UART channels initialized");
    Serial.println("Arm1: GPIO16(RX)/GPIO17(TX)");
    Serial.println("Arm2: GPIO18(RX)/GPIO19(TX)");
  }
  
  bool sendCommandToArm(String command, int armNumber) {
    HardwareSerial* targetSerial = (armNumber == 2) ? arm2Serial : arm1Serial;
    
    // Add arm identifier ke command protocol
    String armCommand = String(armNumber) + ";" + command;
    
    targetSerial->println(armCommand);
    
    // Wait for acknowledgment dengan timeout
    return waitForAcknowledgment(targetSerial, 5000);
  }
  
  void processResponses() {
    // Process responses dari both arms simultaneously
    processArmResponse(arm1Serial, 1);
    processArmResponse(arm2Serial, 2);
  }
  
  void processArmResponse(HardwareSerial* serial, int armNumber) {
    while (serial->available()) {
      String response = serial->readStringUntil('\n');
      response.trim();
      
      if (response.length() > 0) {
        // Forward response dengan arm identifier
        reportArmResponse(armNumber, response);
      }
    }
  }
}
```

## 2.6 Error Handling & Recovery Flow

### **Comprehensive Error Management Architecture**
```
  ----------------------------------------------------------------------------+
                     ERROR HANDLING & RECOVERY FLOW                       |
  ----------------------------------------------------------------------------+
                                                                          |
|  🧠 COMPILER ERRORS         🖥️ SERVER ERRORS          🔌 ESP32 ERRORS       |
                                                                          |
|    ----------------+       ----------------+       ----------------+       |
|  | Syntax Errors   |     | Runtime Errors  |     | Communication   |       |
|  | • Line Numbers  |     | • HTTP Failures |     | • WiFi Issues   |       |
|  | • Suggestions   |     | • Storage Errors|     | • Serial Errors |       |
|  | • Real-time     |     | • SSE Problems  |     | • Timeout Errors|       |
|  |                 |     |                 |     |                 |       |
|  | Validation:     |     | Recovery:       |     | Recovery:       |       |
|  | • Range Check   |     | • Auto-retry    |     | • Auto-reconnect|       |
|  | • Type Check    |     | • Fallback      |     | • Error Logging |       |
|  | • Logic Check   |     | • Error Report  |     | • Status Report |       |
|  |                 |     |                 |     |                 |       |
|  | User Feedback:  |     | Monitoring:     |     | Hardware Check: |       |
|  | • Error Display |     | • Health Check  |     | • Connection    |       |
|  | • Fix Suggest   |     | • Performance   |     | • UART Status   |       |
|  | • Line Highlight|     | • Resource Use  |     | • Response Time |       |
|    ----------------+       ----------------+       ----------------+       |
  ----------------------------------------------------------------------------+
```

### **Error Recovery Implementation**
```javascript
// Comprehensive error handling system
class ErrorManager {
  constructor() {
    this.errorHistory = [];
    this.recoveryStrategies = new Map();
    this.setupRecoveryStrategies();
  }
  
  setupRecoveryStrategies() {
    // Compilation errors
    this.recoveryStrategies.set('syntax_error', {
      priority: 'high',
      action: 'immediate_user_feedback',
      retry: false,
      handler: this.handleSyntaxError.bind(this)
    });
    
    // Communication errors
    this.recoveryStrategies.set('connection_error', {
      priority: 'medium',
      action: 'auto_retry',
      retry: true,
      maxRetries: 3,
      handler: this.handleConnectionError.bind(this)
    });
    
    // Hardware errors
    this.recoveryStrategies.set('hardware_error', {
      priority: 'high',
      action: 'emergency_stop',
      retry: false,
      handler: this.handleHardwareError.bind(this)
    });
  }
  
  async handleError(error, context = {}) {
    const errorInfo = {
      type: error.type || 'unknown',
      message: error.message,
      timestamp: new Date().toISOString(),
      context: context,
      id: Date.now().toString()
    };
    
    // Log error
    this.errorHistory.push(errorInfo);
    
    // Get recovery strategy
    const strategy = this.recoveryStrategies.get(errorInfo.type);
    
    if (strategy) {
      return await strategy.handler(errorInfo, strategy);
    } else {
      return await this.handleGenericError(errorInfo);
    }
  }
  
  async handleSyntaxError(errorInfo, strategy) {
    // Provide immediate user feedback dengan suggestions
    const suggestions = this.generateSuggestions(errorInfo);
    
    return {
      success: false,
      error: errorInfo,
      suggestions: suggestions,
      userAction: 'fix_syntax',
      recovered: false
    };
  }
  
  async handleConnectionError(errorInfo, strategy) {
    let retryCount = 0;
    
    while (retryCount < strategy.maxRetries) {
      try {
        // Attempt reconnection
        await this.attemptReconnection();
        
        return {
          success: true,
          recovered: true,
          retryCount: retryCount + 1,
          message: 'Connection restored'
        };
        
      } catch (retryError) {
        retryCount++;
        
        if (retryCount >= strategy.maxRetries) {
          return {
            success: false,
            recovered: false,
            retryCount: retryCount,
            finalError: retryError.message
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
      }
    }
  }
  
  generateSuggestions(errorInfo) {
    const suggestions = [];
    
    // Pattern-based suggestions
    if (errorInfo.message.includes('Unexpected token')) {
      suggestions.push('Check for missing semicolons or closing braces');
    }
    
    if (errorInfo.message.includes('Invalid range')) {
      suggestions.push('Verify parameter values are within valid ranges');
    }
    
    if (errorInfo.message.includes('Unknown command')) {
      suggestions.push('Check command spelling and supported syntax');
    }
    
    return suggestions;
  }
}
```

---

**📋 Related Documents:**
- **[01_PROJECT_STRUCTURE.md](./01_PROJECT_STRUCTURE.md)** - Project architecture dan technology stack
- **[03_VERSION_HISTORY.md](./03_VERSION_HISTORY.md)** - Development evolution dan migration history