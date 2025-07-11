# Modern Script Language Guide

## Overview

The Palletizer Control System uses a Modern Script Language (MSL) for defining automated sequences of movements and operations. This language is compiled client-side and sent to the ESP32 for execution.

## Command Reference

### Movement Commands
- `X(position, ...);`, `Y(position, ...);`, `Z(position, ...);`, `T(position, ...);`, `G(position, ...);` - Single axis movement (1-5 parameters)
- `GROUP(axis1, axis2, ...);` - Multi-axis asynchronous movement (each axis 1-5 parameters)
- `GROUPSYNC(axis1, axis2, ...);` - Multi-axis synchronized movement (matrix execution)

### System Commands
- `HOME();` - Home all axes to origin position
- `HOME(axis);` - Home specific axis (X, Y, Z, T, G)
- `ZERO();` - Set current position as zero for all axes
- `SPEED(value);` - Set speed for all axes
- `SPEED(axis, value);` - Set speed for specific axis

### Synchronization Commands
- `SET(1);` - Set sync pin HIGH
- `SET(0);` - Set sync pin LOW
- `WAIT();` - Wait for sync signal
- `DETECT();` - Wait for detection sensors
- `DELAY(milliseconds);` - Wait for specified time in milliseconds

### Program Flow Commands
- `FUNC(name) { ... }` - Define a function
- `CALL(name);` - Call a function
- `LOOP(count) { ... }` - Repeat commands n times

## Basic Syntax

### Single Axis Movement
Move individual axes with trajectory planning (up to 5 parameters max):

```
X(100);
Y(50);
Z(10);
T(9900);
G(600);

X(100, 200);
Y(50, 150);
Z(10, 100);

X(100, 200, 300);
X(50, 100, 200, 300);
X(10, 50, 100, 200, 300);
```

**Behavior**: Each axis moves through all positions sequentially with smooth interpolation.

### Multi-Axis Movement (GROUP)
Asynchronous multi-axis movement - axes move independently:

```
GROUP(X(1250), Y(500), Z(100));

GROUP(X(100), Y(50), Z(10));

GROUP(X(100, 200), Y(50, 100), Z(10));
GROUP(X(100, 200, 300), T(9900), G(600));
```

**Behavior**: All axes start moving simultaneously but don't wait for each other. Each axis follows its own trajectory.

### Synchronized Multi-Axis Movement (GROUPSYNC)
Matrix-based synchronized movement - coordinated step execution:

```
GROUPSYNC(X(1000, 5000), Y(100, 5000), Z(400, 500, 600));

GROUPSYNC(X(100, 200), Y(50, 100));
GROUPSYNC(T(90, 180, 270), G(0, 600, 0));
```

**Behavior**: 
- **Step 1**: X→1000, Y→100, Z→400 (wait for all to complete)
- **Step 2**: X→5000, Y→5000, Z→500 (wait for all to complete)  
- **Step 3**: Z→600 (X&Y finished, only Z continues)

### Practical Example
```
DETECT();
GROUP(X(1250), T(9900));
Z(6800);
G(400);
GROUPSYNC(Z(6000), X(0), T(0));
```

### Speed Control
Set speed for axes using parentheses format:

```
SPEED(1000);
SPEED(X, 2000);
SPEED(Y, 1500);
SPEED(Z, 3000);
```

### Synchronization and Detection
Control synchronization and sensor detection:

```
SET(1);
SET(0);
WAIT();
DETECT();
DELAY(1000);
```

### Home and Zero Commands

```
HOME();
HOME(X);
HOME(Y);
ZERO();
```

## Advanced Features

### Functions
Define reusable sequences:

```
FUNC(pickup) {
  Z(-100);
  G(1);
  Z(100);
}

CALL(pickup);

FUNC(place_item) {
  GROUP(X(500), Y(300));
  Z(-50);
  G(0);
  Z(100);
}
```

### Loops
Repeat sequences multiple times:

```
LOOP(5) {
  X(100);
  Y(100);
  X(0);
  Y(0);
}

LOOP(3) {
  LOOP(4) {
    X(100);
    DELAY(500);
    Y(50);
    DELAY(300);
  }
  Z(10);
}
```

### Nested Functions and Loops
```
FUNC(place_pattern) {
  LOOP(3) {
    GROUP(X(100), Y(100));
    CALL(pickup);
    GROUP(X(200), Y(200));
    CALL(release);
  }
}

FUNC(release) {
  Z(-50);
  G(0);
  Z(50);
}

CALL(place_pattern);
```


## Example Scripts

### Basic Pick and Place
```
HOME();
SPEED(2000);

GROUP(X(500), Y(300), Z(0));
Z(-100);
G(1);
Z(100);

GROUP(X(1000), Y(800));
Z(-50);
G(0);
Z(100);

GROUP(X(0), Y(0), Z(0));
```

### Palletizing Pattern
```
FUNC(pickup_from_conveyor) {
  GROUP(X(0, 50), Y(0, 25), Z(100, 50, 0));
  DELAY(200);
  Z(-100, -80, -100);
  DELAY(100);
  G(100, 300, 600);
  DELAY(150);
  Z(50, 100);
}

FUNC(place_on_pallet) {
  Z(-50, -20);
  DELAY(300);
  G(600, 400, 200, 0);
  DELAY(100);
  Z(20, 100);
}

SPEED(1500);

LOOP(12) {
  CALL(pickup_from_conveyor);
  DELAY(500);
  
  GROUP(X(300, 280, 300), Y(450, 430, 450), T(0, 90, 180));
  DELAY(200);
  
  CALL(place_on_pallet);
  DELAY(300);
}

HOME();
```

### Multi-Layer Palletizing
```
FUNC(pickup) {
  GROUP(X(0, -20, 0), Y(0, -10, 0), Z(0, 50, 100));
  DELAY(250);
  Z(50, 0, -50, -100);
  DELAY(150);
  G(0, 200, 400, 600, 800);
  DELAY(200);
  Z(-50, 50, 100);
}

FUNC(place) {
  Z(50, 0, -50);
  DELAY(300);
  G(800, 600, 300, 100, 0);
  DELAY(100);
  Z(0, 50, 100);
}

SPEED(2000);

LOOP(6) {
  CALL(pickup);
  DELAY(400);
  GROUP(X(100, 150, 200), Y(100, 150, 200), Z(25, 50), T(0, 45));
  DELAY(250);
  CALL(place);
  DELAY(350);
}

LOOP(6) {
  CALL(pickup);
  DELAY(400);
  GROUP(X(200, 180, 200), Y(200, 180, 200), Z(125, 150), T(45, 90, 0));
  DELAY(250);
  CALL(place);
  DELAY(350);
}

HOME();
```

## Command Output Format

The compiler converts MSL scripts directly into simple text commands:

**Input MSL:**
```
HOME();
SPEED(2000);
X(100);
GROUP(X(500), Y(300));
```

**Compiled Output:**
```
HOME
SPEED:ALL:2000
MOVE:X100
GROUP:X500:Y300
```

### Complete Example

**Input Script:**
```
HOME();
ZERO();
SPEED(1500);
SPEED(X, 2000);

X(100);
Y(50, 150);
Z(10, 100, 200);
T(90, 180, 270, 0);
G(0, 300, 600, 400, 0);

GROUP(X(300, 400), Y(150, 250), Z(75));
GROUPSYNC(X(1000, 5000), Y(100, 5000), Z(400, 500, 600));

SET(1);
SET(0);
WAIT();
DETECT();
DELAY(500);

FUNC(test_move) {
  X(400, 500);
  Y(200, 300, 400);
  DELAY(200);
}

CALL(test_move);

LOOP(2) {
  GROUP(Z(100, 200), T(180));
  GROUPSYNC(G(600), X(0));
}
```

**Compiled Text Output:**
```
HOME
ZERO
SPEED:ALL:1500
SPEED:X:2000
MOVE:X100
MOVE:Y50,150
MOVE:Z10,100,200
MOVE:T90,180,270,0
MOVE:G0,300,600,400,0
GROUP:X300,400:Y150,250:Z75
GROUPSYNC:X1000,5000:Y100,5000:Z400,500,600
SET:1
SET:0
WAIT
DETECT
DELAY:500
MOVE:X400,500
MOVE:Y200,300,400
DELAY:200
GROUPSYNC:Z100,200:T180
GROUPSYNC:G600:X0
GROUPSYNC:Z100,200:T180
GROUPSYNC:G600:X0
```

## Integration with Hardware

### Complete Workflow

#### 1. Client-Side Compilation
The web interface compiles MSL scripts into simple text commands:

**Input MSL:**
```
HOME();
SPEED(2000);
X(100);
GROUP(X(500), Y(300));
```

**Compiled Output:**
```
HOME
SPEED:ALL:2000
MOVE:X100
GROUP:X500:Y300
```

#### 2. ESP32 Storage & Processing
ESP32 receives and stores the compiled commands:

```cpp
// Store commands in LittleFS
void storeCommands(String commands) {
  File file = LittleFS.open("/script.txt", "w");
  file.print(commands);
  file.close();
}

// Execute commands line by line
void executeScript() {
  File file = LittleFS.open("/script.txt", "r");
  while(file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    
    if(sendToArduino(line)) {
      String response = waitArduinoResponse();
      if(response != "OK") {
        Serial.println("Error: " + response);
        break;
      }
    }
  }
  file.close();
}
```

#### 3. ESP32 ↔ Arduino Communication Protocol

**Command Format:**
- `HOME` - Home all axes
- `HOME:X` - Home specific axis
- `ZERO` - Zero all axes  
- `SPEED:ALL:value` - Set speed for all axes
- `SPEED:X:value` - Set speed for specific axis
- `MOVE:Xvalue` - Move single axis (X100, Z-50, G1)
- `GROUP:X500:Y300:Z0` - Move multiple axes simultaneously
- `SET:1` or `SET:0` - Set sync pin HIGH/LOW
- `WAIT` - Wait for sync signal
- `DETECT` - Wait for detection sensors
- `DELAY:500` - Wait for specified milliseconds

**Communication Example:**
```
ESP32 → Arduino: "MOVE:X100"
Arduino → ESP32: "OK"

ESP32 → Arduino: "GROUP:X500:Y300"
Arduino → ESP32: "OK"

ESP32 → Arduino: "DELAY:1000"
Arduino → ESP32: "OK"
```

#### 4. Arduino Implementation

```cpp
void setup() {
  Serial.begin(115200);  // Communication with ESP32
  // Initialize stepper motors, sensors, etc.
}

void loop() {
  if(Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    executeCommand(cmd);
  }
}

void executeCommand(String cmd) {
  if(cmd == "HOME") {
    homeAllAxes();
    Serial.println("OK");
  }
  else if(cmd.startsWith("HOME:")) {
    char axis = cmd.charAt(7);
    homeAxis(axis);
    Serial.println("OK");
  }
  else if(cmd == "ZERO") {
    zeroAllAxes();
    Serial.println("OK");
  }
  else if(cmd.startsWith("MOVE:")) {
    parseMove(cmd.substring(5));
  }
  else if(cmd.startsWith("GROUP:")) {
    parseGroup(cmd.substring(6));
  }
  else if(cmd.startsWith("SPEED:")) {
    parseSpeed(cmd.substring(6));
  }
  else if(cmd.startsWith("SET:")) {
    int pin = cmd.substring(4).toInt();
    setPin(pin);
    Serial.println("OK");
  }
  else if(cmd == "WAIT") {
    waitForSync();
    Serial.println("OK");
  }
  else if(cmd == "DETECT") {
    waitForDetection();
    Serial.println("OK");
  }
  else if(cmd.startsWith("DELAY:")) {
    int ms = cmd.substring(6).toInt();
    delay(ms);
    Serial.println("OK");
  }
  else {
    Serial.println("ERR:UNKNOWN_COMMAND");
  }
}

void parseMove(String params) {
  // Parse: X100, Z-50, G1
  char axis = params.charAt(0);
  int value = params.substring(1).toInt();
  
  if(moveAxis(axis, value)) {
    Serial.println("OK");
  } else {
    Serial.println("ERR:MOVE_FAILED");
  }
}

void parseGroup(String params) {
  // Parse: X500:Y300:Z0
  // Split by ':' and move all axes simultaneously
  
  if(moveGroup(params)) {
    Serial.println("OK");
  } else {
    Serial.println("ERR:GROUP_FAILED");
  }
}

void parseSpeed(String params) {
  // Parse: ALL:2000 or X:1500
  int colonIndex = params.indexOf(':');
  if(colonIndex > 0) {
    String axis = params.substring(0, colonIndex);
    int speed = params.substring(colonIndex + 1).toInt();
    
    if(setSpeed(axis, speed)) {
      Serial.println("OK");
    } else {
      Serial.println("ERR:SPEED_FAILED");
    }
  } else {
    Serial.println("ERR:INVALID_SPEED_FORMAT");
  }
}
```

### Error Handling

**Arduino Error Responses:**
- `ERR:UNKNOWN_COMMAND` - Command not recognized
- `ERR:MOVE_FAILED` - Axis movement failed
- `ERR:GROUP_FAILED` - Group movement failed
- `ERR:SPEED_FAILED` - Speed setting failed
- `ERR:INVALID_SPEED_FORMAT` - Invalid speed command format
- `ERR:LIMIT_EXCEEDED` - Position out of bounds
- `ERR:AXIS_FAULT` - Hardware fault detected
- `ERR:TIMEOUT` - Operation timeout

**ESP32 Error Handling:**
```cpp
String response = waitArduinoResponse();
if(response.startsWith("ERR:")) {
  // Log error and stop execution
  Serial.println("Arduino Error: " + response);
  stopExecution();
}
```

### Memory Efficiency

**Advantages of this approach:**
- **ESP32**: Only stores plain text, processes one command at a time
- **Arduino**: Minimal memory usage, no JSON parsing required
- **Communication**: Simple string protocol, easy to debug
- **Reliability**: Command-by-command acknowledgment ensures synchronization
- **Scalability**: Easy to add new commands without complex parsing

