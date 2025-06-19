# Modern Script Language Guide

## Overview

The Palletizer Control System uses a Modern Script Language (MSL) for defining automated sequences of movements and operations. This language is compiled client-side and sent to the ESP32 for execution.

## Basic Syntax

### Single Axis Movement
Move individual axes with optional speed control:

```
X1000          # Move X axis to position 1000
Y-500          # Move Y axis to position -500
Z200 F2000     # Move Z axis to position 200 with feedrate 2000
T360 F1500     # Move T (rotation) axis to 360 degrees
G1             # Move G (gripper) axis to position 1
```

### Multi-Axis Movement (GROUP)
Move multiple axes simultaneously:

```
GROUP X1000 Y2000 Z500     # Move X, Y, Z simultaneously
GROUP X0 Y0                # Move X and Y to origin
GROUP T180 G0 F3000        # Rotate and open gripper with speed
```

### Speed Control
Set speed for individual axes:

```
VX2000         # Set X axis speed to 2000
VY1500         # Set Y axis speed to 1500
VXYZ3000       # Set X, Y, Z axes speed to 3000
VALL1000       # Set all axes speed to 1000
```

### Synchronization
Wait for all movements to complete:

```
X1000
Y2000
SYNC           # Wait for both movements to finish
Z500           # This will execute after X and Y complete
```

### Home and Zero Commands

```
H              # Home all axes (move to home position)
Z              # Zero all axes (set current position as zero)
```

## Advanced Features

### Functions
Define reusable sequences:

```
FUNC pickup
  Z-100        # Lower Z axis
  G1           # Close gripper
  Z100         # Raise Z axis
ENDFUNC

CALL pickup    # Execute the pickup function
```

### Loops
Repeat sequences multiple times:

```
LOOP 5
  X100
  Y100
  X0
  Y0
ENDLOOP
```

### Nested Functions and Loops
```
FUNC place_pattern
  LOOP 3
    GROUP X100 Y100
    CALL pickup
    GROUP X200 Y200
    CALL release
  ENDLOOP
ENDFUNC

FUNC release
  Z-50
  G0
  Z50
ENDFUNC

CALL place_pattern
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
H              # Home all axes
VALL2000       # Set speed for all axes

# Pick sequence
GROUP X500 Y300 Z0     # Move to pick position
Z-100                  # Lower to grab height
G1                     # Close gripper
Z100                   # Lift object

# Place sequence  
GROUP X1000 Y800       # Move to place position
Z-50                   # Lower to place height
G0                     # Open gripper
Z100                   # Lift clear

# Return home
GROUP X0 Y0 Z0         # Return to origin
```

### Palletizing Pattern
```
FUNC pickup_from_conveyor
  GROUP X0 Y0 Z100
  Z-100
  G1
  Z100
ENDFUNC

FUNC place_on_pallet
  Z-50
  G0
  Z100
ENDFUNC

VALL1500

LOOP 12
  CALL pickup_from_conveyor
  
  # Calculate position (3x4 pattern)
  GROUP X(100 * (LOOP_COUNT % 3)) Y(150 * (LOOP_COUNT / 3))
  
  CALL place_on_pallet
ENDLOOP

H  # Return home when done
```

### Multi-Layer Palletizing
```
FUNC pickup
  GROUP X0 Y0 Z0
  Z-100
  G1
  Z100
ENDFUNC

FUNC place
  Z-50
  G0
  Z100
ENDFUNC

VALL2000

# Layer 1
LOOP 6
  CALL pickup
  GROUP X(200 * (LOOP_COUNT % 3)) Y(200 * (LOOP_COUNT / 3)) Z50
  CALL place
ENDLOOP

# Layer 2  
LOOP 6
  CALL pickup
  GROUP X(200 * (LOOP_COUNT % 3)) Y(200 * (LOOP_COUNT / 3)) Z150
  CALL place
ENDLOOP

H
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
H              # Establish known position
VALL1500       # Set safe speeds
```

### 2. Use Synchronization
```
X1000
Y2000
SYNC           # Ensure both complete before continuing
Z500
```

### 3. Group Related Movements
```
# Good - simultaneous movement
GROUP X1000 Y2000

# Avoid - sequential movement when not needed
X1000
Y2000
```

### 4. Use Functions for Repeated Actions
```
FUNC safe_pickup
  Z100          # Ensure clear height
  GROUP X? Y?   # Move to position (parameters)
  Z-100         # Lower
  G1            # Grip
  Z100          # Lift
ENDFUNC
```

### 5. Add Comments for Clarity
```
# Initialize system
H                    # Home all axes
VALL2000            # Set safe working speed

# Main palletizing loop
LOOP 24
  CALL pickup       # Get item from conveyor
  # ... rest of sequence
ENDLOOP
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

The compiler generates commands in this format:
```
MX1000          # Move X axis to 1000
MY2000F1500     # Move Y axis to 2000 with feedrate 1500
GX1000Y2000     # Group move X and Y
H               # Home all axes
Z               # Zero all axes
VX2000          # Set X axis speed to 2000
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
GROUP X1000 Y2000 Z500

# Inefficient - multiple sequential commands  
X1000
Y2000
Z500
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