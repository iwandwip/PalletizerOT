# ESP32 Dual-Arm Simulator Documentation

## Overview

The ESP32 Dual-Arm Simulator is a development tool that emulates the behavior of dual ESP32 microcontrollers controlling a two-arm palletizer robot. It allows developers to test the web interface and server functionality without requiring physical hardware.

## Purpose & Role

### Primary Functions:
1. **Script Polling** - Continuously polls the server for new scripts to execute
2. **Command Execution** - Simulates the execution of movement commands
3. **Status Reporting** - Sends real-time execution updates to the debug terminal
4. **Dual Arm Management** - Manages independent execution states for two robotic arms

### Why Use the Simulator?
- **Development Testing** - Test web UI and server without physical ESP32
- **Script Validation** - Verify compiled scripts execute correctly
- **Debug Integration** - See real-time command execution in debug terminal
- **Dual Arm Logic** - Test independent arm control and coordination

## Architecture

```
┌─────────────────┐     HTTP Polling      ┌─────────────────┐
│                 │ ◄──────────────────── │                 │
│   Web Server    │                       │  ESP32 Simulator│
│   (Port 3006)   │ ──────────────────► │                 │
│                 │    Scripts & Status    │  ┌─────────┐   │
└─────────────────┘                       │  │  Arm 1  │   │
                                          │  ├─────────┤   │
                                          │  │  Arm 2  │   │
                                          │  └─────────┘   │
                                          └─────────────────┘
```

## How It Works

### 1. **Initialization**
When started, the simulator:
- Connects to the server at `http://localhost:3006`
- Initializes separate states for Arm 1 and Arm 2
- Begins polling for scripts every 2 seconds

### 2. **Script Polling**
The simulator continuously polls `/api/script/poll`:
```javascript
GET /api/script/poll
Response: {
  hasNewScript: boolean,
  scriptId: string,
  commands: string[],
  armId: 'arm1' | 'arm2',
  format: 'msl' | 'raw' | 'hybrid'
}
```

### 3. **Script Storage**
When a new script is received:
- Stores script in the appropriate arm slot (arm1Script or arm2Script)
- Resets command index to 0
- Prepares for execution

### 4. **Command Execution**
During execution:
- Processes one command per second
- Tracks progress with command index
- Sends debug updates for each command
- Handles pause/resume/stop states

### 5. **Debug Integration**
For each executed command, sends to `/api/debug`:
```javascript
POST /api/debug
{
  timestamp: number,
  level: 'INFO',
  source: 'ESP32-arm1',
  message: '🔄 [1/10] Executing: X100'
}
```

## State Management

### Per-Arm States:
```typescript
// Each arm maintains:
- script: ScriptData | null      // Current loaded script
- isRunning: boolean             // Execution active
- isPaused: boolean              // Execution paused
- commandIndex: number           // Current command position
```

### Script Data Structure:
```typescript
interface ScriptData {
  id: string                     // Unique script identifier
  commands: string[]             // Array of commands to execute
  hybridScript?: any             // Optional hybrid format
  rawLines?: string[]            // Raw script lines
  armId?: string                 // Target arm (arm1/arm2)
  format?: 'msl' | 'raw' | 'hybrid'
}
```

## Interactive Commands

The simulator provides a CLI interface for manual control:

| Command | Description | Example |
|---------|-------------|---------|
| `start [arm]` | Start execution for specified arm | `start arm1` |
| `pause [arm]` | Pause execution for specified arm | `pause arm2` |
| `resume [arm]` | Resume paused execution | `resume arm1` |
| `stop [arm]` | Stop and reset execution | `stop arm2` |
| `status` | Show current status of both arms | `status` |
| `help` | Display available commands | `help` |

## Usage

### Basic Usage:
```bash
# Start the simulator
npm run dev:esp32

# Or run everything together
npm run dev:full
```

### Testing Workflow:
1. Start the web server (`npm run dev:server`)
2. Start the simulator (`npm run dev:esp32`)
3. Load a script in the web UI for Arm 1 or Arm 2
4. Click "Process Script" to compile
5. Click "Execute" to start
6. Watch execution in simulator console and debug terminal

### Example Output:
```
🤖 ESP32 Dual-Arm Simulator initialized
🎯 Target server: http://localhost:3006
🦾 Supporting: Arm 1 & Arm 2
🚀 Starting ESP32 Dual-Arm Simulator...
✅ Simulator started - Polling for scripts...

📥 New script received for arm1:
   - ID: 1234567890
   - Format: msl
   - Commands: 10

▶️ Starting execution for arm1
🔄 arm1 [1/10] Executing: HOME
🔄 arm1 [2/10] Executing: X100
🔄 arm1 [3/10] Executing: Y200
...
✅ arm1 execution completed
```

## Integration with Web UI

### Script Processing Flow:
1. **User writes script** in web editor (MSL or RAW mode)
2. **User clicks "Process Script"** → Server compiles (MSL) or stores (RAW)
3. **Simulator polls and receives** the processed script
4. **User clicks "Execute"** → Server sets execution flag
5. **Simulator detects flag** and starts execution
6. **Debug terminal shows** real-time execution updates

### Dual Arm Coordination:
- Each arm operates independently
- Scripts can be loaded and executed simultaneously
- No cross-arm interference
- Status tracked separately

## Advanced Features

### 1. **Format Detection**
Automatically handles different script formats:
- **MSL**: Compiled Modern Script Language commands
- **RAW**: Direct ESP32 commands
- **Hybrid**: JSON-based command structure

### 2. **Execution Control**
- Pause/Resume without losing position
- Stop resets to beginning
- Per-arm control granularity

### 3. **Debug Messages**
Sends formatted messages that appear in web debug terminal:
- Execution start/stop
- Command-by-command progress
- Completion notifications
- Error states

## Troubleshooting

### Common Issues:

**1. Cannot connect to server**
- Ensure server is running on port 3006
- Check `http://localhost:3006/health`

**2. Scripts not executing**
- Verify script was processed successfully
- Check if "Execute" was clicked in web UI
- Look for errors in debug terminal

**3. Commands executing too fast/slow**
- Adjust execution interval in `startExecution()` method
- Default is 1 second per command

**4. Arm not responding**
- Check simulator console for error messages
- Verify armId in script matches (arm1/arm2)
- Use `status` command to check state

## Development

### Extending the Simulator:

**Add new commands:**
```typescript
handleCommand(command: string) {
  // Add new command cases
  case 'speed':
    this.setExecutionSpeed(args[0])
    break
}
```

**Modify execution behavior:**
```typescript
executeNextCommand(armId: string) {
  // Add custom logic
  if (command.startsWith('DELAY')) {
    // Handle delay differently
  }
}
```

**Add status reporting:**
```typescript
sendStatusUpdate() {
  // Send custom status to server
  const status = this.getStatus()
  this.sendToServer('/api/status', status)
}
```

## Conclusion

The ESP32 Dual-Arm Simulator is an essential development tool that:
- Enables hardware-free testing
- Provides real-time execution feedback
- Supports dual-arm coordination
- Integrates seamlessly with the web interface

It bridges the gap between web UI development and hardware implementation, allowing for rapid iteration and testing of palletizer control logic.