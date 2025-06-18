# NEW CONCEPT: Lightweight Distributed Palletizer Architecture

## Overview
Arsitektur baru yang memindahkan semua proses berat ke laptop server, dengan ESP32 dan Arduino Mega hanya sebagai executor yang sangat ringan.

## System Architecture

```
┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│   LAPTOP SERVER     │      │      ESP32       │      │   ARDUINO MEGA      │
├─────────────────────┤      ├──────────────────┤      ├─────────────────────┤
│ • Next.js Web UI    │      │ • WiFi Client    │      │ • 5x AccelStepper   │
│ • Script Parser     │ HTTP │ • Command Buffer │Serial│ • Motor Control     │
│ • Motion Planner    │<---->│ • Serial Bridge  │<---->│ • Position Report   │
│ • State Manager     │ WS   │ • Status Relay   │ 115k │ • Limit Switches    │
│ • Command Queue     │      │                  │      │                     │
└─────────────────────┘      └──────────────────┘      └─────────────────────┘
     Heavy Processing          Ultra Lightweight          Ultra Lightweight
```

## Communication Protocol

### 1. Laptop → ESP32 (via WebSocket)
```json
{
  "cmd": "MOVE",
  "data": {
    "X": 1000,   // steps
    "Y": 2000,
    "Z": 500,
    "speed": 1000,
    "accel": 500
  }
}
```

### 2. ESP32 → Arduino Mega (via Serial)
```
Simple text protocol:
M X1000 Y2000 Z500 S1000 A500\n   // Move command
S\n                                // Status request
H\n                                // Home all axes
E\n                                // Emergency stop
```

### 3. Arduino Mega → ESP32 (Status)
```
P X100 Y200 Z50 T0 G0\n           // Position report
I\n                               // Idle
B\n                               // Busy
D\n                               // Done
E Error message\n                 // Error
```

## Component Design

### Laptop Server (Next.js + Node.js)

```typescript
// Core Services
1. ScriptParser
   - Parse Modern Script Language
   - Generate motion commands
   - Validate syntax

2. MotionPlanner  
   - Calculate trajectories
   - Optimize paths
   - Handle GROUP movements
   - Implement SYNC points

3. CommandQueue
   - Buffer commands
   - Handle priorities
   - Manage flow control

4. ESP32Manager
   - WebSocket connection
   - Command transmission
   - Status monitoring
   - Error handling

5. WebUI
   - Script editor
   - Real-time visualization
   - Debug terminal
   - Control panel
```

### ESP32 (Minimal Bridge)

```cpp
// Ultra lightweight components only
1. WiFiClient
   - Connect to server
   - Maintain connection

2. WebSocketClient
   - Receive commands
   - Send status updates

3. SerialBridge
   - Forward to Arduino
   - Parse responses
   - Buffer management

4. StatusReporter
   - Aggregate status
   - Error detection
   - Heartbeat
```

### Arduino Mega (Direct Motor Control)

```cpp
// Using AccelStepper for 5 motors
1. MotorController
   AccelStepper motorX(AccelStepper::DRIVER, 2, 3);
   AccelStepper motorY(AccelStepper::DRIVER, 4, 5);
   AccelStepper motorZ(AccelStepper::DRIVER, 6, 7);
   AccelStepper motorT(AccelStepper::DRIVER, 8, 9);
   AccelStepper motorG(AccelStepper::DRIVER, 10, 11);

2. CommandParser
   - Parse serial commands
   - Validate parameters
   - Execute movements

3. PositionReporter
   - Track positions
   - Detect completion
   - Monitor limits
```

## Data Flow

### Script Execution Flow
```
1. User writes script in Web UI
2. Server parses script → motion commands
3. Server plans optimal trajectory
4. Commands sent to ESP32 via WebSocket
5. ESP32 forwards to Arduino via Serial
6. Arduino executes motor movements
7. Arduino reports position/status
8. ESP32 relays status to server
9. Server updates UI in real-time
```

### Example Execution

**User Script:**
```
GROUP X1000 Y2000 Z500
SYNC
X0 Y0 Z0 F3000
```

**Server Processing:**
```javascript
// Parse & Plan
commands = [
  {
    type: "GROUP",
    moves: calculateSimultaneousMove({X:1000, Y:2000, Z:500}),
    duration: 2000ms
  },
  {
    type: "SYNC",
    waitFor: "all_complete"
  },
  {
    type: "MOVE", 
    moves: {X:0, Y:0, Z:0},
    speed: 3000
  }
]
```

**ESP32 → Arduino:**
```
G X1000 Y2000 Z500 S1000 A500
W
M X0 Y0 Z0 S3000 A500
```

## Implementation Phases

### Phase 1: Arduino Mega Setup
- [ ] Create MultiStepperController sketch
- [ ] Implement serial command parser
- [ ] Test with 5 motors simultaneously
- [ ] Add position feedback

### Phase 2: ESP32 Bridge
- [ ] Remove all web server code
- [ ] Implement WiFi client mode
- [ ] Add WebSocket client
- [ ] Create serial bridge to Arduino
- [ ] Minimal command buffer (10-20 commands)

### Phase 3: Laptop Server
- [ ] Setup Next.js API routes
- [ ] WebSocket server for ESP32
- [ ] Port ScriptCompiler to server
- [ ] Implement motion planner
- [ ] Real-time status dashboard

### Phase 4: Integration
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling & recovery
- [ ] Documentation

## Performance Targets

### Arduino Mega
- Loop frequency: >10kHz
- Max speed: 4000 steps/sec per motor
- Command latency: <5ms
- Memory usage: <50% RAM

### ESP32
- WiFi latency: <10ms
- Serial throughput: 115200 baud
- Command buffer: 20 commands
- Memory usage: <30% RAM

### Server
- Parse time: <100ms for 1000 lines
- WebSocket latency: <5ms
- UI update rate: 60fps
- Concurrent clients: 10+

## Advantages

1. **ESP32 & Arduino Super Light**
   - No parsing, no complex logic
   - Just relay and execute
   - Minimal memory usage

2. **Server Unlimited Power**
   - Complex trajectory planning
   - Multi-palletizer management
   - Advanced optimization
   - Easy debugging

3. **Scalability**
   - Control multiple palletizers
   - Cloud deployment option
   - Remote access capability

4. **Development Speed**
   - All logic in JavaScript
   - Hot reload development
   - Better testing tools

## Migration Strategy

1. **Keep existing firmware** as fallback
2. **Develop new components** in parallel
3. **Test incrementally** with single axis
4. **Gradual rollout** after validation

## Error Handling

### Connection Loss
- ESP32 stops all motors
- Buffered commands retained
- Auto-reconnect with state sync

### Command Errors
- Server validates before sending
- Arduino validates on receive
- Clear error reporting chain

### Emergency Stop
- Hardware button on Arduino
- Software command from server
- ESP32 relay capability