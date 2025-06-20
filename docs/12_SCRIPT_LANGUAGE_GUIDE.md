# Modern Script Language Guide

## Overview

The Palletizer Control System uses a Modern Script Language (MSL) for defining automated sequences of movements and operations. This language is compiled client-side and sent to the ESP32 for execution.

## Basic Syntax

### Single Axis Movement
Move individual axes with flexible parameter positioning (up to 5 parameters max):

```
# Basic movement (1 parameter)
X(100);                        # Move X to position 100
Y(50);                         # Move Y to position 50
Z(10);                         # Move Z to position 10
T(9900);                       # Move T (Tool/Turntable) to position 9900
G(600);                        # Move G (Gripper) to position 600

# With delay (2 parameters) - delay can be anywhere
X(100,d1000);                  # Move X to 100 with 1000ms delay
X(d1000,100);                  # Delay can be first parameter
Y(50,d500);                    # Move Y to 50 with 500ms delay

# Range movement (3 parameters) - delay flexible positioning
X(100,d1000,200);              # Move from 100 to 200 with 1000ms delay
X(d1000,100,200);              # Delay first
X(100,200,d1000);              # Delay last

# Complex movement (4-5 parameters) - up to 5 parameters max
X(100,d500,200,d1000,300);     # Multiple positions with delays
Y(50,d300,100,d800);           # 4 parameters
Z(10,d600,50,d1200,100);       # 5 parameters (maximum)

# Delay positioning examples
X(d500,100,d1000,200,d1500);   # Delays at various positions
Y(50,d300,d700,100);           # Multiple delays between positions
```

### Multi-Axis Movement (GROUP)
Move multiple axes simultaneously (1-5 axes, each with 1-5 parameters):

```
# Basic simultaneous movement
GROUP(X(1250), T(9900), T(-2500));

# With delays
GROUP(X(100,d500), Y(50,d300), Z(10,d600));

# Complex coordination - each axis can have up to 5 parameters
GROUP(X(100,d500,200), Y(50,d300,100,d800), Z(10));
GROUP(X(d1000,100,200,d500,300), T(9900,d2000), G(600));

# Real example
DETECT;
GROUP(X(1250), T(9900));
Z(6800);
G(400);
GROUP(Z(6000), X(0), T(0));
```

### Speed Control
Set speed for axes using semicolon format:

```
SPEED;1000;                    # Set all axes speed to 1000
SPEED;x;2000;                  # Set X axis speed to 2000
SPEED;y;1500;                  # Set Y axis speed to 1500
SPEED;xyz;3000;                # Set X, Y, Z axes speed to 3000
```

### Synchronization
Wait for all movements to complete:

```
X(1000);
Y(2000);
SYNC;                          # Wait for both movements to finish
Z(500);                        # This will execute after X and Y complete

# With sync pins
SET(1);                        # Set sync pin 1
WAIT;                          # Wait for sync signal
```

### Home and Zero Commands

```
HOME;                          # Home all axes (move to home position)
ZERO;                          # Zero all axes (set current position as zero)
```

## Advanced Features

### Functions
Define reusable sequences:

```
FUNC(pickup) {
  Z(-100);                     # Lower Z axis
  G(1);                        # Close gripper
  Z(100);                      # Raise Z axis
}

CALL(pickup);                  # Execute the pickup function

# Functions with complex movements
FUNC(place_item) {
  GROUP(X(500), Y(300));
  Z(-50);
  G(0);                        # Open gripper
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

# Nested loops
LOOP(3) {
  LOOP(4) {
    X(100,d500);
    Y(50,d300);
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
# Absolute positioning (default)
X1000          # Move to absolute position 1000

# Relative positioning (use + or -)
X+500          # Move 500 steps from current position
Y-200          # Move 200 steps back from current position
```

## Example Scripts

### Basic Pick and Place
```
# Initialize
HOME;                          # Home all axes
SPEED;2000;                    # Set speed for all axes

# Pick sequence
GROUP(X(500), Y(300), Z(0));   # Move to pick position
Z(-100);                       # Lower to grab height
G(1);                          # Close gripper
Z(100);                        # Lift object

# Place sequence  
GROUP(X(1000), Y(800));        # Move to place position
Z(-50);                        # Lower to place height
G(0);                          # Open gripper
Z(100);                        # Lift clear

# Return home
GROUP(X(0), Y(0), Z(0));       # Return to origin
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
  
  # Calculate position (3x4 pattern)
  # Note: Variable calculation in comments for now
  GROUP(X(300), Y(450));       # Position will vary per loop
  
  CALL(place_on_pallet);
}

HOME;                          # Return home when done
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

# Layer 1
LOOP(6) {
  CALL(pickup);
  # Positions for 2x3 pattern
  GROUP(X(200), Y(200), Z(50));
  CALL(place);
}

# Layer 2  
LOOP(6) {
  CALL(pickup);
  # Positions for 2x3 pattern, higher Z
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
HOME;                          # Establish known position
SPEED;1500;                    # Set safe speeds
```

### 2. Use Synchronization
```
X(1000);
Y(2000);
SYNC;                          # Ensure both complete before continuing
Z(500);
```

### 3. Group Related Movements
```
# Good - simultaneous movement
GROUP(X(1000), Y(2000));

# Avoid - sequential movement when not needed
X(1000);
Y(2000);
```

### 4. Use Functions for Repeated Actions
```
FUNC(safe_pickup) {
  Z(100);                      # Ensure clear height
  GROUP(X(500), Y(300));       # Move to position
  Z(-100);                     # Lower
  G(1);                        # Grip
  Z(100);                      # Lift
}
```

### 5. Add Comments for Clarity
```
# Initialize system
HOME;                          # Home all axes
SPEED;2000;                    # Set safe working speed

# Main palletizing loop
LOOP(24) {
  CALL(pickup);                # Get item from conveyor
  # ... rest of sequence
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
        "Y": 300,
        "X_delay": 500,
        "Y_delay": 300
      },
      "line": 2
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
MX1000          # Single axis move
GX1000Y2000     # Group move
H               # Home
Z               # Zero
VX2000          # Set speed
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
# Efficient - single group command
GROUP(X(1000), Y(2000), Z(500));

# Even better - with delays for smooth motion
GROUP(X(1000,d500), Y(2000,d500), Z(500,d500));

# Inefficient - multiple sequential commands  
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
# This syntax is planned for future versions
IF SENSOR_1 == TRUE
  CALL pickup_sequence
ELSE
  CALL skip_sequence
ENDIF
```

### Variable Support (Future Feature)
```
# This syntax is planned for future versions
VAR pickup_height = 100
VAR place_height = 50

Z-pickup_height
# ... operations
Z-place_height
```

## API Integration

### Script Compilation Endpoint
```javascript
// Save and compile script
const result = await api.saveScript(scriptText);
if (result.success) {
  console.log(`${result.commandCount} commands compiled`);
}
```

### Execution Control
```javascript
// Start execution
await api.start();

// Pause execution
await api.pause();

// Stop and reset
await api.stop();

// Resume execution
await api.resume();
```

### Status Monitoring
```javascript
// Get current status
const status = await api.getStatus();
console.log(`Progress: ${status.currentCommandIndex}/${status.totalCommands}`);
```

This language provides a powerful yet simple way to define complex automation sequences for the Palletizer Control System.