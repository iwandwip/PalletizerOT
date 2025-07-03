# 📋 **COMPLETE ANALYSIS REPORT - OLD PALLETIZER SYSTEM**

Based on comprehensive examination of both the ESP32 firmware and web interface in `firmware/backup/OldFirmwareReference/`, here's the complete understanding:

## **🏗️ SYSTEM ARCHITECTURE**

### **ESP32 Side (Local Server)**
- **Main Controller**: `PalletizerMaster.cpp/.h` - Core system orchestrator
- **Script Parser**: `PalletizerScriptParser.cpp/.h` - Heavy parsing engine (~250KB RAM usage)
- **Web Server**: `PalletizerServer.cpp/.h` - HTTP endpoints + SSE events
- **Protocol**: `PalletizerProtocol.cpp/.h` - UART communication to slaves  
- **Runtime**: `PalletizerRuntime.cpp/.h` - Command execution engine

### **Web Client Side**
- **React Components**: Command editor, status display, debug terminal
- **API Client**: TypeScript HTTP client with SSE support
- **Simple UI**: Basic script editing and system control

---

## **🔤 MODERN SCRIPT LANGUAGE (MSL) FORMAT**

### **Function System**
```cpp
FUNC(functionName) {
  // Commands here
}

CALL(functionName);
```

### **Movement Commands**
Movement commands support **maximum 5 parameters** with flexible delay positioning:

```cpp
// Basic movement (1 parameter)
X(100);                        // Move X to position 100
Y(50);                         // Move Y to position 50
Z(10);                         // Move Z to position 10
T(9900);                       // Move T (Tool/Turntable) to position 9900
G(600);                        // Move G (Gripper) to position 600

// With delay (2 parameters) - delay can be anywhere
X(100,d1000);                  // Move X to 100 with 1000ms delay
X(d1000,100);                  // Delay can be first parameter
Y(50,d500);                    // Move Y to 50 with 500ms delay

// Range movement (3 parameters) - delay flexible positioning
X(100,d1000,200);              // Move from 100 to 200 with 1000ms delay
X(d1000,100,200);              // Delay first
X(100,200,d1000);              // Delay last

// Complex movement (4-5 parameters) - up to 5 parameters max
X(100,d500,200,d1000,300);     // Multiple positions with delays
Y(50,d300,100,d800);           // 4 parameters
Z(10,d600,50,d1200,100);       // 5 parameters (maximum)

// Delay positioning examples
X(d500,100,d1000,200,d1500);   // Delays at various positions
Y(50,d300,d700,100);           // Multiple delays between positions
```

**Key Rules:**
- **Maximum 5 parameters** per movement command
- **Delay format**: `d<milliseconds>` (e.g., `d1000` = 1000ms delay)
- **Flexible delay positioning**: Delays can be placed anywhere in parameter list
- **Axis types**: X, Y, Z (linear), T (tool/turntable), G (gripper)

### **Group Commands (Simultaneous)**
```cpp
GROUP(X(100), Y(50), Z(10));
GROUP(X(100,d500), Y(50,d300), Z(10,d600));
GROUP(X(1250), T(9900), T(-2500));
```

### **System Commands**
```cpp
ZERO;         // Home all axes
PLAY;         // Start execution
PAUSE;        // Pause execution  
STOP;         // Stop execution
IDLE;         // Set idle state
```

### **Speed Control**
```cpp
SPEED;1000;     // Set all axes speed to 1000
SPEED;x;500;    // Set X axis speed to 500
SPEED;y;300;    // Set Y axis speed to 300
SPEED;z;400;    // Set Z axis speed to 400
SPEED;t;600;    // Set T axis speed to 600
SPEED;g;200;    // Set G axis speed to 200
```

### **Synchronization Commands**
```cpp
SET(1);       // Set sync pin HIGH
SET(0);       // Set sync pin LOW
WAIT;         // Wait for sync signal
DETECT;       // Wait for detection sensors
```

### **Legacy Format Support**
```cpp
X(100,200),Y(50,100) NEXT    // Legacy coordinate format
SET(1) NEXT SET(0) NEXT      // Legacy with NEXT separator
```

---

## **🌐 API ENDPOINTS & PROTOCOL**

### **ESP32 HTTP Endpoints**
```cpp
POST /command         // Send script or single commands
POST /write          // Save script to ESP32 filesystem (/queue.txt)
GET  /status         // Get system status (IDLE/RUNNING/PAUSED/STOPPING)
GET  /get_commands   // Load saved script from filesystem
POST /upload         // Upload script file
GET  /events         // SSE stream for real-time status updates
GET  /debug          // SSE stream for debug messages (if WEB_DEBUG=1)
```

### **Command Endpoint Format**
```typescript
POST /command
Content-Type: application/x-www-form-urlencoded
Body: cmd=FUNC(TEST){X(100);Y(50);}CALL(TEST);

Response: "Command sent: FUNC(TEST){X(100);Y(50);}CALL(TEST);"
```

### **Write Endpoint Format**
```typescript
POST /write
Content-Type: application/x-www-form-urlencoded
Body: text=FUNC(TEST){X(100);Y(50);}CALL(TEST);

Response: "Commands saved successfully. Click PLAY to execute."
```

### **Status Response Format**
```json
{
  "status": "IDLE" | "RUNNING" | "PAUSED" | "STOPPING"
}
```

### **System States**
```cpp
enum SystemState {
  STATE_IDLE = 0,      // "IDLE"
  STATE_RUNNING = 1,   // "RUNNING" 
  STATE_PAUSED = 2,    // "PAUSED"
  STATE_STOPPING = 3   // "STOPPING"
};
```

---

## **⚙️ SCRIPT PARSING BEHAVIOR**

### **Parsing Flow**
1. **Function Extraction**: Find all `FUNC(name) { ... }` and store in memory
2. **Command Detection**: Classify command types (MODERN_SCRIPT vs INLINE_COMMANDS)
3. **Tokenization**: Split script using semicolons, handle GROUP parentheses
4. **Execution**: Process commands sequentially or queue for later

### **Command Classification Logic**
```cpp
if (command.indexOf("FUNC(") != -1) {
  commandType = "SCRIPT_WITH_FUNCTIONS";
} else if (command.indexOf("CALL(") != -1) {
  commandType = "SCRIPT_WITH_CALLS";  
} else if (upperCommand == "PLAY" || upperCommand == "PAUSE" || upperCommand == "STOP") {
  commandType = "SYSTEM_CONTROL";
} else if (upperCommand == "ZERO") {
  commandType = "HOMING";
} else if (upperCommand.startsWith("SPEED;")) {
  commandType = "SPEED_CONTROL";
} else if (upperCommand.startsWith("SET(") || upperCommand == "WAIT") {
  commandType = "SYNC_COMMAND";
} else if (upperCommand == "DETECT") {
  commandType = "DETECT_COMMAND";
} else if (command.indexOf("NEXT") != -1) {
  commandType = "LEGACY_BATCH";
} else if (command.indexOf('(') != -1 && command.indexOf(',') != -1) {
  commandType = "LEGACY_COORDINATES";
}
```

### **Tokenization Methods**
1. **Basic**: `tokenizeStatements()` - Simple semicolon splitting
2. **Group-Aware**: `tokenizeStatementsWithGroupSupport()` - Handle GROUP() parentheses  
3. **Command-Aware**: `tokenizeStatementsWithCommandSupport()` - Full parsing with nesting

### **Function Parsing**
```cpp
// Function definition pattern
FUNC(functionName) {
  // function body
}

// Function call pattern
CALL(functionName);

// Brace matching for nested structures
int findMatchingBrace(const String& script, int openPos) {
  int braceCount = 1;
  for (int i = openPos + 1; i < script.length(); i++) {
    if (script.charAt(i) == '{') braceCount++;
    else if (script.charAt(i) == '}') {
      braceCount--;
      if (braceCount == 0) return i;
    }
  }
  return -1;
}
```

---

## **🔄 EXECUTION FLOW**

### **Script to ESP32 Protocol Translation**
```cpp
// MSL Command: X(100);
// Becomes UART to slave: "x;1;100;"

// MSL Command: Y(50,d1000);  
// Becomes UART to slave: "y;1;50;" + delay handling

// MSL Command: GROUP(X(100), Y(50));  
// Becomes: "x;1;100;" + "y;1;50;" (sent simultaneously)
```

### **Slave Communication Protocol**
```cpp
Format: "slaveId;commandCode;parameters;"

Examples:
x;1;1250;     // Move X axis to position 1250
y;1;500;      // Move Y axis to position 500
z;1;100;      // Move Z axis to position 100
t;1;9900;     // Move T axis to position 9900
g;1;600;      // Move gripper to position 600
```

### **File Storage System**
- Scripts saved to `/queue.txt` in LittleFS filesystem
- Functions stored in RAM array `Function userFunctions[MAX_FUNCTIONS]`
- Command counter tracks execution progress
- Cache system for frequently accessed commands

---

## **📊 REAL-TIME COMMUNICATION**

### **Server-Sent Events (SSE)**
```javascript
// Status updates stream
GET /events
Data: {"status": "RUNNING"}
Data: {"status": "PAUSED"}
Data: {"status": "IDLE"}

// Debug messages stream (if WEB_DEBUG=1)  
GET /debug
Data: {
  "level": "INFO", 
  "source": "PARSER", 
  "message": "Script parsed successfully", 
  "timestamp": 12345
}
```

### **Web Client Integration Example**
```typescript
// Send command to ESP32
await api.sendCommand("FUNC(TEST){X(100);Y(50);}CALL(TEST);");

// Save script to ESP32 storage
await api.saveCommands(scriptText);

// Load script from ESP32 storage
const script = await api.loadCommands();

// Real-time status monitoring
const eventSource = new EventSource('/events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('System Status:', data.status);
};

// Real-time debug monitoring
const debugSource = new EventSource('/debug');
debugSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`[${data.level}] ${data.source}: ${data.message}`);
};
```

---

## **📝 SCRIPT EXAMPLES FROM OLD SYSTEM**

### **Basic Function Script**
```cpp
FUNC(PICK_SEQUENCE) {
  Z(100);
  X(200,d1000,300);
  Y(50,d500,100);
  Z(50,d2000);
}

FUNC(PLACE_SEQUENCE) {
  Z(80,d500);
  X(400,d1000,500);
  Y(150,d500,200);
  Z(100,d1000);
}

CALL(PICK_SEQUENCE);
CALL(PLACE_SEQUENCE);
```

### **Synchronization Script**
```cpp
FUNC(SYNC_WITH_ARM2) {
  SET(1);
  WAIT;
  SET(0);
  DETECT;
}

CALL(SYNC_WITH_ARM2);
```

### **Mixed Format Script**
```cpp
FUNC(QUICK_MOVE) {
  X(100,d500,200);
  Y(50,d300,100);
}

// Legacy format mixed with modern
X(50,100),Y(25,50) NEXT 
CALL(QUICK_MOVE);
SET(1) NEXT SET(0) NEXT

// Modern format continues
FUNC(COMPLEX_SEQUENCE) {
  Z(10,d1000,50);
  X(300,d1500,400);
  Y(150,d800,200);
  Z(50,d2000,10);
}

CALL(COMPLEX_SEQUENCE);
```

### **Group Movement Examples**
```cpp
// Basic simultaneous movement
GROUP(X(1250), T(9900), T(-2500));

// With delays
GROUP(X(100,d500), Y(50,d300), Z(10,d600));

// Complex coordination
DETECT;
GROUP(X(1250), T(9900));
Z(6800);
G(400);
GROUP(Z(6000), X(0), T(0));
```

---

## **🎯 KEY DIFFERENCES FROM CURRENT SYSTEM**

### **Parsing Location**
- **Old System**: ESP32 does ALL parsing (250KB+ RAM usage)
- **New System**: Client-side parsing, ESP32 just executes simple commands

### **Script Storage**
- **Old System**: Scripts stored in ESP32 LittleFS `/queue.txt` 
- **New System**: Should maintain same storage behavior for compatibility

### **API Structure**
- **Old System**: `POST /command` with `cmd=` parameter
- **New System**: Current system uses different endpoint structure  

### **Function System**
- **Old System**: Functions parsed and stored in ESP32 RAM
- **New System**: Functions should be expanded client-side to simple commands

### **Memory Usage**
- **Old System**: Heavy parsing on ESP32 (~250KB/320KB RAM)
- **New System**: Lightweight ESP32, heavy processing on client

---

## **⚠️ CRITICAL REQUIREMENTS FOR NEW SYSTEM**

### **1. EXACT Script Syntax Compatibility**
Must support ALL MSL commands identically:
- Function definitions: `FUNC(name) { ... }`
- Function calls: `CALL(name);`
- Movement commands: `X(pos)`, `X(pos,delay)`, `X(from,delay,to)`
- Group commands: `GROUP(X(100), Y(50), Z(10))`
- System commands: `ZERO`, `PLAY`, `PAUSE`, `STOP`, `IDLE`
- Speed commands: `SPEED;value;`, `SPEED;axis;value;`
- Sync commands: `SET(1)`, `SET(0)`, `WAIT`, `DETECT`
- Legacy format: `X(100,200),Y(50,100) NEXT`

### **2. Same API Endpoints**
Must maintain exact endpoint compatibility:
- `POST /command` - Execute immediate commands
- `POST /write` - Save script to storage
- `GET /status` - Get system status
- `GET /get_commands` - Load saved script
- `POST /upload` - Upload script file
- `GET /events` - SSE status stream
- `GET /debug` - SSE debug stream

### **3. Same Request/Response Format**
- **Content-Type**: `application/x-www-form-urlencoded`
- **Command Parameter**: `cmd=<script>`
- **Write Parameter**: `text=<script>`
- **Response Format**: Plain text for commands, JSON for status
- **Status Values**: `IDLE`, `RUNNING`, `PAUSED`, `STOPPING`

### **4. Legacy Support**
Must handle both modern and legacy script formats seamlessly

### **5. Function Expansion**
Client-side expansion of `FUNC`/`CALL` to simple command sequences

### **6. GROUP Command Handling**
Proper simultaneous movement support with timing coordination

### **7. File System Compatibility**
Scripts saved to `/queue.txt` in LittleFS for consistency

### **8. SSE Event Compatibility**
Same event format and timing for real-time updates

---

## **🚀 IMPLEMENTATION STRATEGY**

1. **Update Script Engine**: Modify the new script engine to match MSL syntax exactly
2. **API Compatibility Layer**: Ensure new endpoints match old behavior exactly  
3. **Function Expansion**: Implement client-side function expansion
4. **Legacy Parser**: Add support for `NEXT` separator and legacy coordinate format
5. **GROUP Command Handler**: Implement simultaneous movement logic
6. **Testing**: Validate with all example scripts from old system

The new system must be **100% backward compatible** with existing scripts and client integrations while moving heavy parsing from ESP32 to browser for better performance and memory efficiency.

---

## **📂 Reference Files Analyzed**

### **ESP32 Firmware**
- `firmware/backup/OldFirmwareReference/firmware/PalletizerMaster/PalletizerScriptParser.cpp/.h`
- `firmware/backup/OldFirmwareReference/firmware/PalletizerMaster/PalletizerServer.cpp/.h`
- `firmware/backup/OldFirmwareReference/firmware/PalletizerMaster/PalletizerMaster.cpp/.h`
- `firmware/backup/OldFirmwareReference/firmware/PalletizerMaster/PalletizerProtocol.cpp/.h`
- `firmware/backup/OldFirmwareReference/firmware/PalletizerMaster/PalletizerRuntime.cpp/.h`

### **Web Interface**
- `firmware/backup/OldFirmwareReference/src/lib/api.ts`
- `firmware/backup/OldFirmwareReference/src/app/page.tsx`
- `firmware/backup/OldFirmwareReference/src/components/command-editor.tsx`

### **Script Examples**
- `firmware/backup/OldFirmwareReference/firmware/PalletizerCommandExample/test_new_script_format.txt`
- `firmware/backup/OldFirmwareReference/firmware/PalletizerCommandExample/test_mixed_format.txt`
- `firmware/backup/OldFirmwareReference/firmware/PalletizerCommandExample/test_legacy_format.txt`
- Multiple test files in `ScriptExample/` folders

This documentation provides the complete foundation needed to implement a fully compatible Modern Script Language system in the new architecture.