# Command Format Architecture Design

## Overview

This document outlines the optimal command format architecture for the ESP32 Palletizer Control System, designed to minimize ESP32 processing load while maintaining robust execution and error handling.

## Design Principles

1. **Zero Heavy Processing on ESP32** - All parsing and compilation happens on the server
2. **Sequential Execution with Feedback** - Each command waits for acknowledgment before proceeding
3. **Group Command Support** - Parallel movement commands handled efficiently
4. **Robust Error Handling** - Built-in timeout and response validation
5. **Future-Proof Design** - Extensible format for new features

## Analyzed Options

### Option 1: Pre-Expanded Sequential Commands
```json
{
  "scriptId": "1640995200000",
  "totalCommands": 8,
  "commands": [
    {
      "id": 1,
      "type": "MOVE_SINGLE",
      "target": "X", 
      "value": 100,
      "delay": 1000,
      "waitForDone": true
    }
  ]
}
```

**Pros:** No parsing, sequential execution, built-in feedback
**Cons:** Verbose format

### Option 2: String Commands with Metadata
```json
{
  "scriptId": "1640995200000", 
  "commands": [
    {
      "seq": 1,
      "cmd": "x;1;100;",
      "type": "single",
      "delay": 1000,
      "expect": "DONE"
    }
  ]
}
```

**Pros:** Familiar format, group handling
**Cons:** Still requires some parsing logic

### Option 3: Bytecode-like Format
```json
{
  "scriptId": "1640995200000",
  "bytecode": [
    {"op": "MOV", "axis": 1, "val": 100, "wait": 1000}
  ]
}
```

**Pros:** Very compact, fastest processing
**Cons:** Less readable, harder to debug

### Option 4: Hybrid Approach ⭐ **RECOMMENDED**
```json
{
  "scriptId": "1640995200000",
  "metadata": {
    "totalSteps": 4,
    "estimatedTime": 5000,
    "axes": ["X", "Y", "Z", "GRIPPER"]
  },
  "steps": [
    {
      "id": 1,
      "action": "MOVE",
      "axis": "X",
      "position": 100,
      "speed": 1000,
      "serial_cmd": "x;1;100;",
      "expect_response": "DONE",
      "timeout": 5000
    },
    {
      "id": 2,
      "action": "GROUP_MOVE",
      "parallel": true,
      "commands": [
        {"axis": "X", "position": 0, "serial_cmd": "x;1;0;"},
        {"axis": "Y", "position": 0, "serial_cmd": "y;1;0;"},
        {"axis": "Z", "position": 100, "serial_cmd": "z;1;100;"}
      ],
      "expect_responses": ["DONE", "DONE", "DONE"],
      "timeout": 8000
    },
    {
      "id": 3,
      "action": "SYSTEM",
      "command": "GRIPPER_OPEN", 
      "serial_cmd": "g;0;1;",
      "expect_response": "DONE",
      "timeout": 3000
    }
  ]
}
```

## Recommended Solution: Option 4 (Hybrid Approach)

### Why Option 4 is Best:

1. **🔥 Zero Parsing on ESP32**
   - ESP32 directly uses `serial_cmd` field
   - No string manipulation or parsing required

2. **⚡ Built-in Error Handling**
   - `timeout` for each command prevents hanging
   - `expect_response` for validation
   - Robust handling for failed commands

3. **🎛️ Perfect Group Command Support**
   - `parallel: true` flag for group movements
   - Multiple `serial_cmd` in one step
   - ESP32 loops through commands, waits for all responses

4. **📊 Rich Debugging Information**
   - `metadata` for monitoring and progress tracking
   - `action` field for logging and debugging
   - `id` for step-by-step progress tracking

5. **🔄 Future-Proof Design**
   - Easy to add new fields without breaking compatibility
   - Support for complex scenarios
   - Extensible for new command types

## System Architecture

### Task Distribution:

#### 💻 **Laptop Server (Heavy Processing):**
- Parse MSL scripts: `X(100,d1500);`
- Compile to ready-to-send commands: `"serial_cmd": "x;1;100;"`
- Handle functions, loops, groups, and complex logic
- Generate timeout and response expectations
- Validate script syntax and semantics

#### 🔌 **ESP32 Master (Zero-Brain Execution):**
- Receive compiled JSON from server via HTTP polling
- Store commands in LittleFS for persistence
- Execute commands sequentially by sending `serial_cmd` to Arduino MEGA
- Wait for expected responses with timeout handling
- Report execution progress back to server
- Handle error recovery and retry logic

#### ⚙️ **Arduino MEGA Slaves (Light Parsing):**
- Parse simple format: `x;1;100;` → axis='x', direction=1, position=100
- Execute stepper motor movements
- Send acknowledgment: `DONE`, `ERROR`, or status messages
- Handle individual axis control logic

## Implementation Details

### ESP32 Execution Flow:
```cpp
// Super simple ESP32 execution logic
for(auto& step : jsonData["steps"]) {
  if(step["parallel"] == true) {
    // Group command - send all commands in parallel
    for(auto& cmd : step["commands"]) {
      Serial2.println(cmd["serial_cmd"]);
    }
    // Wait for all expected responses
    waitForAllResponses(step["expect_responses"], step["timeout"]);
  } else {
    // Single command
    Serial2.println(step["serial_cmd"]);
    waitForResponse(step["expect_response"], step["timeout"]);
  }
  
  // Report progress to server
  reportProgress(step["id"]);
}
```

### Arduino MEGA Parsing:
```cpp
void parseCommand(String command) {
  // Parse format: "x;1;100;"
  int firstSemicolon = command.indexOf(';');
  int secondSemicolon = command.indexOf(';', firstSemicolon + 1);
  
  char axis = command.charAt(0);           // 'x'
  int direction = command.substring(firstSemicolon + 1, secondSemicolon).toInt();  // 1
  int position = command.substring(secondSemicolon + 1, command.lastIndexOf(';')).toInt();  // 100
  
  // Execute movement
  executeMovement(axis, direction, position);
  
  // Send acknowledgment
  Serial.println("DONE");
}
```

## Command Format Examples

### Single Movement:
```json
{
  "id": 1,
  "action": "MOVE",
  "axis": "X",
  "position": 100,
  "speed": 1500,
  "serial_cmd": "x;1;100;",
  "expect_response": "DONE",
  "timeout": 5000
}
```

### Group Movement:
```json
{
  "id": 2,
  "action": "GROUP_MOVE",
  "parallel": true,
  "commands": [
    {"axis": "X", "position": 0, "serial_cmd": "x;1;0;"},
    {"axis": "Y", "position": 0, "serial_cmd": "y;1;0;"},
    {"axis": "Z", "position": 100, "serial_cmd": "z;1;100;"}
  ],
  "expect_responses": ["DONE", "DONE", "DONE"],
  "timeout": 8000
}
```

### System Command:
```json
{
  "id": 3,
  "action": "SYSTEM",
  "command": "GRIPPER_OPEN",
  "serial_cmd": "g;0;1;",
  "expect_response": "DONE",
  "timeout": 3000
}
```

### Wait/Delay Command:
```json
{
  "id": 4,
  "action": "WAIT",
  "duration": 2000,
  "serial_cmd": "wait;2000;",
  "expect_response": "DONE",
  "timeout": 3000
}
```

## Benefits of This Architecture

1. **Performance**: ESP32 operates with minimal CPU and memory usage
2. **Reliability**: Built-in error handling and timeout mechanisms
3. **Scalability**: Easy to add new command types and axes
4. **Debugging**: Rich metadata for troubleshooting
5. **Maintainability**: Clear separation of concerns between components
6. **Flexibility**: Supports both simple and complex command sequences

## Migration Path

1. **Phase 1**: Implement new command format in server-side script compiler
2. **Phase 2**: Update ESP32 firmware to handle new JSON format
3. **Phase 3**: Update Arduino MEGA firmware for enhanced parsing
4. **Phase 4**: Test and validate with existing MSL scripts
5. **Phase 5**: Deploy and monitor performance improvements

## Future Considerations

- Support for conditional commands based on sensor feedback
- Integration with real-time monitoring and analytics
- Support for dynamic speed and acceleration profiles
- Enhanced error recovery and retry mechanisms
- Integration with external systems via API callbacks

---

**Author**: Claude Code Assistant  
**Date**: 2024-06-20  
**Status**: Design Document - Ready for Implementation