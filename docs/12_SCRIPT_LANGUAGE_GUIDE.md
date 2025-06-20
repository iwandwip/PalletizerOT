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

