# 🔄 **MIGRATION PLAN: OLD vs NEW ARCHITECTURE DATA FLOW**

## **📊 ARCHITECTURE COMPARISON**

### **🔴 OLD ARCHITECTURE**
```
Web Browser (Client)
        ↓ HTTP Request
ESP32 (Local Web Server + Script Parser + Master Controller)
        ↓ UART (Individual Commands)
Arduino UNO Slave #1 (X Axis Motor)
Arduino UNO Slave #2 (Y Axis Motor)  
Arduino UNO Slave #3 (Z Axis Motor)
Arduino UNO Slave #4 (T Axis Motor)
Arduino UNO Slave #5 (G Axis Motor)
```

### **🟢 NEW ARCHITECTURE**
```
Laptop/PC Server (Web Server + Script Parser + Compiler)
        ↓ HTTP Request
ESP32 (Simple Command Fetcher + Master Controller)
        ↓ UART (Compiled Commands)
Arduino MEGA (All 5 Motors: X, Y, Z, T, G)
```

---

## **🔀 KEY DIFFERENCES**

| Component | OLD System | NEW System |
|-----------|------------|------------|
| **Web Server** | ESP32 Local | Laptop/PC Server |
| **Script Parser** | ESP32 (Heavy ~250KB RAM) | Laptop/PC (JavaScript) |
| **Master Controller** | ESP32 | ESP32 (Lightweight) |
| **Slaves** | 5x Arduino UNO (1 motor each) | 1x Arduino MEGA (5 motors) |
| **Communication** | ESP32 ↔ 5 UNOs | ESP32 ↔ 1 MEGA |
| **Processing Power** | Limited ESP32 | Full PC Processing |

---

## **📈 DATA FLOW TRANSFORMATION**

### **🔴 OLD SYSTEM DATA FLOW**

#### **Step 1: Web Client → ESP32**
```http
POST /command HTTP/1.1
Content-Type: application/x-www-form-urlencoded

cmd=FUNC(PICK){X(100,d1000);Y(50,d500);Z(10);}CALL(PICK);
```

#### **Step 2: ESP32 Script Parsing (Heavy Processing)**
```cpp
// ESP32 Internal Processing (~250KB RAM)
PalletizerScriptParser parser;
parser.parseScript("FUNC(PICK){X(100,d1000);Y(50,d500);Z(10);}CALL(PICK);");

// Function extraction and storage
userFunctions[0] = {name: "PICK", body: "X(100,d1000);Y(50,d500);Z(10);"};

// Command expansion
executeStatement("CALL(PICK)");
→ executeStatement("X(100,d1000)");
→ executeStatement("Y(50,d500)");  
→ executeStatement("Z(10)");
```

#### **Step 3: ESP32 → Arduino UNO Slaves**
```cpp
// ESP32 sends to individual slaves via UART
Serial2.println("x;1;100;");     // To Arduino UNO #1 (X Motor)
delay(1000);                     // Handle d1000 delay
Serial2.println("y;1;50;");      // To Arduino UNO #2 (Y Motor)  
delay(500);                      // Handle d500 delay
Serial2.println("z;1;10;");      // To Arduino UNO #3 (Z Motor)
```

#### **Step 4: Each Arduino UNO Processes**
```cpp
// Arduino UNO #1 (X Motor)
if(command == "x;1;100;") {
  stepper_X.moveTo(100);
}

// Arduino UNO #2 (Y Motor)
if(command == "y;1;50;") {
  stepper_Y.moveTo(50);
}

// Arduino UNO #3 (Z Motor)  
if(command == "z;1;10;") {
  stepper_Z.moveTo(10);
}
```

---

### **🟢 NEW SYSTEM DATA FLOW**

#### **Step 1: Web Client → Laptop Server**
```http
POST /script HTTP/1.1
Content-Type: application/json

{
  "script": "FUNC(PICK){X(100,d1000);Y(50,d500);Z(10);}CALL(PICK);"
}
```

#### **Step 2: Laptop Server Processing (Heavy Processing)**
```javascript
// Client-side Script Engine (ScriptEngine.generateFromText)
const scriptEngine = ScriptEngine.getInstance();

// Parse MSL script to unified commands
const commands = [
  {
    id: "cmd_1",
    type: "MOVE", 
    parameters: {axis: "X", position: 100, delay: 1000}
  },
  {
    id: "cmd_2", 
    type: "MOVE",
    parameters: {axis: "Y", position: 50, delay: 500}
  },
  {
    id: "cmd_3",
    type: "MOVE", 
    parameters: {axis: "Z", position: 10}
  }
];

// Generate simple command sequence for ESP32
const simpleCommands = [
  "X:100:1000",  // Format: AXIS:POSITION:DELAY
  "Y:50:500", 
  "Z:10:0"
];
```

#### **Step 3: Laptop Server → ESP32**
```http
POST /queue HTTP/1.1
Content-Type: application/json

{
  "commands": [
    "X:100:1000",
    "Y:50:500", 
    "Z:10:0"
  ]
}
```

#### **Step 4: ESP32 Simple Processing (Lightweight)**
```cpp
// ESP32 stores commands in queue (LittleFS)
saveCommandsToQueue(commands);

// During execution, ESP32 reads and forwards
String command = getNextCommand(); // "X:100:1000"

// Parse simple format
int axis = command.charAt(0);     // 'X'
int pos = command.substring(2, command.indexOf(':', 2)).toInt(); // 100
int delay = command.substring(command.lastIndexOf(':')+1).toInt(); // 1000

// Send to Arduino MEGA
Serial2.println("MOVE:" + String(axis) + ":" + String(pos) + ":" + String(delay));
```

#### **Step 5: ESP32 → Arduino MEGA**
```cpp
// ESP32 sends unified commands to single MEGA
Serial2.println("MOVE:X:100:1000");  // Move X motor to 100 with 1000ms delay
Serial2.println("MOVE:Y:50:500");    // Move Y motor to 50 with 500ms delay  
Serial2.println("MOVE:Z:10:0");      // Move Z motor to 10 with no delay
```

#### **Step 6: Arduino MEGA Processes All Motors**
```cpp
// Arduino MEGA handles all 5 motors
void processCommand(String cmd) {
  if(cmd.startsWith("MOVE:")) {
    String parts[] = cmd.split(":");
    char axis = parts[1].charAt(0);        // X, Y, Z, T, G
    int position = parts[2].toInt();       // target position
    int delayMs = parts[3].toInt();        // delay in ms
    
    switch(axis) {
      case 'X': 
        stepper_X.moveTo(position);
        if(delayMs > 0) delay(delayMs);
        break;
      case 'Y':
        stepper_Y.moveTo(position); 
        if(delayMs > 0) delay(delayMs);
        break;
      case 'Z':
        stepper_Z.moveTo(position);
        if(delayMs > 0) delay(delayMs);
        break;
      case 'T':
        stepper_T.moveTo(position);
        if(delayMs > 0) delay(delayMs);
        break;
      case 'G':
        stepper_G.moveTo(position);
        if(delayMs > 0) delay(delayMs);
        break;
    }
  }
}
```

---

## **📋 COMMAND FORMAT EXAMPLES**

### **Complex Script Transformation**

#### **Input MSL Script:**
```cpp
FUNC(PICK_SEQUENCE) {
  Z(100,d500);
  X(200,d1000,300);
  Y(50,d500,100); 
  GROUP(X(100), Y(50), Z(10));
  G(600,d200);
}

FUNC(PLACE_SEQUENCE) {
  Z(80);
  GROUP(X(400), Y(150));
  Z(100,d1000);
  G(400);
}

CALL(PICK_SEQUENCE);
WAIT;
CALL(PLACE_SEQUENCE);
```

#### **Laptop Server Compilation:**
```javascript
// Function expansion and command generation
const expandedCommands = [
  // PICK_SEQUENCE expansion
  {type: "MOVE", axis: "Z", position: 100, delay: 500},
  {type: "MOVE", axis: "X", position: 200, delay: 1000},  
  {type: "MOVE", axis: "X", position: 300, delay: 0},
  {type: "MOVE", axis: "Y", position: 50, delay: 500},
  {type: "MOVE", axis: "Y", position: 100, delay: 0},
  {type: "GROUP", axes: ["X:100", "Y:50", "Z:10"], delay: 0},
  {type: "MOVE", axis: "G", position: 600, delay: 200},
  
  // WAIT command
  {type: "WAIT", delay: 0},
  
  // PLACE_SEQUENCE expansion  
  {type: "MOVE", axis: "Z", position: 80, delay: 0},
  {type: "GROUP", axes: ["X:400", "Y:150"], delay: 0},
  {type: "MOVE", axis: "Z", position: 100, delay: 1000},
  {type: "MOVE", axis: "G", position: 400, delay: 0}
];
```

#### **Simple Commands for ESP32:**
```json
[
  "MOVE:Z:100:500",
  "MOVE:X:200:1000", 
  "MOVE:X:300:0",
  "MOVE:Y:50:500",
  "MOVE:Y:100:0", 
  "GROUP:X:100,Y:50,Z:10:0",
  "MOVE:G:600:200",
  "WAIT:0",
  "MOVE:Z:80:0",
  "GROUP:X:400,Y:150:0", 
  "MOVE:Z:100:1000",
  "MOVE:G:400:0"
]
```

#### **ESP32 to Arduino MEGA:**
```cpp
// ESP32 sends one by one to MEGA
Serial2.println("MOVE:Z:100:500");
Serial2.println("MOVE:X:200:1000");
Serial2.println("MOVE:X:300:0");
Serial2.println("MOVE:Y:50:500");
Serial2.println("MOVE:Y:100:0");
Serial2.println("GROUP:X:100,Y:50,Z:10:0");  // Simultaneous movement
Serial2.println("MOVE:G:600:200");
Serial2.println("WAIT:0");
Serial2.println("MOVE:Z:80:0");
Serial2.println("GROUP:X:400,Y:150:0");
Serial2.println("MOVE:Z:100:1000");
Serial2.println("MOVE:G:400:0");
```

---

## **🎯 MIGRATION BENEFITS**

### **Performance Improvements**
- **ESP32 RAM Usage**: 250KB → ~20KB (92% reduction)
- **Processing Power**: Limited ESP32 → Full PC capabilities
- **Script Complexity**: No limits vs previous memory constraints
- **Parsing Speed**: Much faster on PC vs ESP32

### **Simplified Hardware**
- **Slave Controllers**: 5 Arduino UNOs → 1 Arduino MEGA
- **Wiring Complexity**: 5 UART connections → 1 UART connection
- **Power Requirements**: 5 separate controllers → 1 unified controller
- **Maintenance**: 5 devices to maintain → 1 device to maintain

### **Enhanced Capabilities**
- **Script Editor**: Rich web-based IDE vs basic text input
- **Real-time Debugging**: Enhanced logging and monitoring
- **Advanced Features**: Visual editors, timeline views, spreadsheet editing
- **Scalability**: Easy to add new features and script formats

---

## **⚠️ MIGRATION CHALLENGES**

### **1. API Compatibility**
- Must maintain exact same endpoints: `/command`, `/write`, `/status`, `/events`
- Same request/response format for backward compatibility
- ESP32 must emulate old server behavior

### **2. Command Protocol Changes**
- **Old**: `x;1;100;` (axis;slaveId;position)
- **New**: `MOVE:X:100:0` (command:axis:position:delay)
- Arduino MEGA firmware must handle new protocol

### **3. GROUP Command Handling**
- **Old**: Sequential commands to different slaves
- **New**: Simultaneous command to single MEGA
- MEGA must coordinate multiple motors simultaneously

### **4. Timing and Synchronization**
- **Old**: ESP32 handled delays between slave commands
- **New**: MEGA must handle internal timing coordination
- Ensure same execution timing as old system

---

## **📝 IMPLEMENTATION STEPS**

### **Phase 1: Script Engine Migration**
1. Update MSL parser to match old system exactly
2. Implement function expansion and command generation
3. Create simple command format for ESP32
4. Test with all example scripts from old system

### **Phase 2: ESP32 Firmware Update**
1. Replace heavy parser with simple command fetcher
2. Implement new command protocol to MEGA
3. Maintain API compatibility with old endpoints
4. Add command queue management

### **Phase 3: Arduino MEGA Firmware**
1. Develop unified motor controller firmware
2. Implement new command protocol parser
3. Add simultaneous movement support for GROUP commands
4. Handle timing and delay coordination

### **Phase 4: Integration Testing**
1. Test complete data flow from web to MEGA
2. Validate timing and synchronization
3. Ensure backward compatibility with existing scripts
4. Performance testing and optimization

### **Phase 5: Deployment**
1. Gradual rollout with fallback options
2. Documentation and training updates
3. Monitoring and issue resolution
4. Final migration completion

This migration plan provides a clear roadmap for transforming the system while maintaining full backward compatibility and improving performance significantly.