# Modern Script Language Guide

## Overview

The Palletizer Control System uses a Modern Script Language (MSL) for defining automated sequences of movements and operations. This language is compiled client-side and sent to the ESP32 for execution.

## Command Reference

### Movement Commands
- `X(position)`, `Y(position)`, `Z(position)`, `T(position)`, `G(position)` - Single axis movement
- `GROUP(axis1, axis2, ...)` - Multi-axis simultaneous movement

### System Commands
- `HOME;` - Home all axes to origin position
- `ZERO;` - Set current position as zero for all axes
- `SPEED;value;` - Set speed for all axes
- `SPEED;axis;value;` - Set speed for specific axis

### Synchronization Commands
- `SET(1);` - Set sync pin HIGH
- `SET(0);` - Set sync pin LOW
- `WAIT;` - Wait for sync signal
- `DETECT;` - Wait for detection sensors
- `DELAY(milliseconds);` - Wait for specified time in milliseconds

### Program Flow Commands
- `FUNC(name) { ... }` - Define a function
- `CALL(name);` - Call a function
- `LOOP(count) { ... }` - Repeat commands n times

## Basic Syntax

### Single Axis Movement
Move individual axes with multiple position parameters (up to 5 parameters max):

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

### Multi-Axis Movement (GROUP)
Move multiple axes simultaneously (1-5 axes, each with 1-5 parameters):

```
GROUP(X(1250), T(9900), T(-2500));

GROUP(X(100), Y(50), Z(10));

GROUP(X(100, 200), Y(50, 100), Z(10));
GROUP(X(100, 200, 300), T(9900), G(600));

DETECT;
GROUP(X(1250), T(9900));
Z(6800);
G(400);
GROUP(Z(6000), X(0), T(0));
```

### Speed Control
Set speed for axes using semicolon format:

```
SPEED;1000;
SPEED;x;2000;
SPEED;y;1500;
SPEED;xyz;3000;
```

### Synchronization and Detection
Control synchronization and sensor detection:

```
SET(1);
SET(0);
WAIT;
DETECT;
DELAY(1000);
```

### Home and Zero Commands

```
HOME;
ZERO;
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

## Coordinate System

### Axes Definition
- **X**: Horizontal movement (left/right)
- **Y**: Horizontal movement (forward/backward) 
- **Z**: Vertical movement (up/down)
- **T**: Rotation axis (degrees)
- **G**: Gripper axis (0=open, 1=closed)

### Units
- **Position**: Steps or encoder counts
- **Speed**: Steps per second
- **Rotation**: Degrees (for T axis)

### Coordinate Modes
```
X1000

X+500
Y-200
```

## Example Scripts

### Basic Pick and Place
```
HOME;
SPEED;2000;

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
  GROUP(X(0), Y(0), Z(100));
  Z(-100);
  G(1);
  Z(100);
}

FUNC(place_on_pallet) {
  Z(-50);
  G(0);
  Z(100);
}

SPEED;1500;

LOOP(12) {
  CALL(pickup_from_conveyor);
  
  GROUP(X(300), Y(450));
  
  CALL(place_on_pallet);
}

HOME;
```

### Multi-Layer Palletizing
```
FUNC(pickup) {
  GROUP(X(0), Y(0), Z(0));
  Z(-100);
  G(1);
  Z(100);
}

FUNC(place) {
  Z(-50);
  G(0);
  Z(100);
}

SPEED;2000;

LOOP(6) {
  CALL(pickup);
  GROUP(X(200), Y(200), Z(50));
  CALL(place);
}

LOOP(6) {
  CALL(pickup);
  GROUP(X(200), Y(200), Z(150));
  CALL(place);
}

HOME;
```

## Error Handling

### Syntax Errors
The compiler will detect and report:
- Invalid command names
- Missing ENDFUNC/ENDLOOP statements
- Invalid axis names
- Malformed coordinates

### Runtime Errors
The ESP32 will handle:
- Axis limit violations
- Communication timeouts
- Hardware faults

## Best Practices

### 1. Always Start with Home
```
HOME;
SPEED;1500;
```

### 2. Use Group Commands for Coordination
```
GROUP(X(1000), Y(2000));
Z(500);

X(1000);
Y(2000);
Z(500);
```

### 3. Group Related Movements
```
GROUP(X(1000), Y(2000));

X(1000);
Y(2000);
```

### 4. Use Functions for Repeated Actions
```
FUNC(safe_pickup) {
  Z(100);
  GROUP(X(500), Y(300));
  Z(-100);
  G(1);
  Z(100);
}
```

### 5. Add Comments for Clarity
```
HOME;
SPEED;2000;

LOOP(24) {
  CALL(pickup);
}
```

## Script Editor Features

### Auto-Compilation
- Scripts are automatically compiled as you type
- Real-time syntax checking
- Error highlighting

### Quick Examples
The editor provides template scripts:
- Simple Movement
- Group Movements  
- Function Example
- Loop Example

### File Operations
- Load from file (.txt, .script)
- Save to file
- Save to browser memory
- Load from browser memory

## Compilation Process

1. **Parsing**: Script is parsed for syntax errors
2. **Expansion**: Functions and loops are expanded
3. **Optimization**: Sequential movements are optimized
4. **Code Generation**: Platform-specific commands generated
5. **Validation**: Final validation of command sequence

## Command Output Format

The compiler generates commands in JSON format:
```json
{
  "format": "msl",
  "scriptId": "1750396338241",
  "commands": [
    {
      "index": 0,
      "type": "MOVE",
      "data": {
        "X": 1000
      },
      "line": 1
    },
    {
      "index": 1,
      "type": "GROUP",
      "data": {
        "X": 500,
        "Y": 300
      },
      "line": 2
    },
    {
      "index": 2,
      "type": "DELAY",
      "data": {
        "milliseconds": 500
      },
      "line": 3
    }
  ]
}
```

## Integration with Hardware

### ESP32 Processing
1. Script compiled on web interface
2. Commands sent to ESP32 via HTTP
3. ESP32 stores commands in LittleFS
4. Commands executed one by one
5. Arduino acknowledges each command
6. ESP32 requests next command

### Arduino Communication
Commands sent to Arduino in simplified format:
```
MX1000
GX1000Y2000
H
Z
VX2000
```

## Troubleshooting

### Common Issues

**Script Won't Compile**
- Check for missing ENDFUNC/ENDLOOP
- Verify axis names (X, Y, Z, T, G only)
- Check coordinate format (numbers only)

**Movements Don't Execute**
- Ensure ESP32 is connected
- Check if script is saved to ESP32
- Verify start command was sent

**Jerky Movements**
- Use GROUP commands for simultaneous axes
- Add SYNC commands to ensure completion
- Adjust speeds with V commands

### Debug Information
The debug terminal shows:
- Compilation status
- Command count
- ESP32 connection status
- Execution progress

## Performance Tips

### Optimize Movement Commands
```
GROUP(X(1000), Y(2000), Z(500));

GROUP(X(1000), Y(2000), Z(500));
DELAY(500);

X(1000);
Y(2000);
Z(500);
```

### Minimize Script Size
- Use functions for repeated sequences
- Avoid unnecessary SYNC commands
- Combine movements when possible

### Speed Considerations
- Set appropriate speeds for your hardware
- Use different speeds for different operations
- Consider acceleration limits

## Advanced Examples

### Conditional Logic (Future Feature)
```
IF SENSOR_1 == TRUE
  CALL pickup_sequence
ELSE
  CALL skip_sequence
ENDIF
```

### Variable Support (Future Feature)
```
VAR pickup_height = 100
VAR place_height = 50

Z-pickup_height
Z-place_height
```

## API Integration

### Script Compilation Endpoint
```javascript
const result = await api.saveScript(scriptText);
if (result.success) {
  console.log(`${result.commandCount} commands compiled`);
}
```

### Execution Control
```javascript
await api.start();

await api.pause();

await api.stop();

await api.resume();
```

### Status Monitoring
```javascript
const status = await api.getStatus();
console.log(`Progress: ${status.currentCommandIndex}/${status.totalCommands}`);
```

This language provides a powerful yet simple way to define complex automation sequences for the Palletizer Control System.