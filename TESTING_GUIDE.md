# Testing Guide - New Architecture

## Test Scenarios

### 1. Unit Testing

#### Arduino Mega Motor Control
```
Test Commands:
M X1000 S500 A200        # Single axis move
M X1000 Y2000 S1000      # Multi-axis move  
G X500 Y500 Z100 S800    # Group move (synchronized)
V X2000 Y1500            # Set velocities
A X300 Y400              # Set accelerations
H                        # Home all
Z                        # Zero positions
E                        # Emergency stop
S                        # Status request
```

Expected Responses:
```
B    # Busy (when executing)
D    # Done (when complete)
P X1000 Y2000 Z100 T0 G0  # Position update
OK   # Command acknowledged
```

#### ESP32 Bridge Communication
```json
Test WebSocket Messages:
{
  "cmd": "MOVE",
  "data": {"X": 1000, "Y": 2000, "speed": 1500}
}

{
  "cmd": "GROUP", 
  "data": {"X": 500, "Y": 500, "Z": 100}
}

{
  "cmd": "STOP"
}
```

Expected Responses:
```json
{
  "type": "status",
  "status": "BUSY",
  "queue": 3
}

{
  "type": "position", 
  "position": {"X": 1000, "Y": 2000, "Z": 100, "T": 0, "G": 0}
}
```

### 2. Integration Testing

#### Script Compilation & Execution
```
Test Script 1 - Basic Movement:
X1000 Y2000 F1500
SYNC
X0 Y0 F3000

Expected: 
- 3 commands generated
- Sequential execution
- Position updates
```

```
Test Script 2 - Group Operations:
GROUP X1000 Y2000 Z500
SYNC
GROUP X0 Y0 Z0

Expected:
- Synchronized movement
- All axes finish together
```

```
Test Script 3 - Functions:
FUNC pickup
  Z-100
  G1  
  Z100
ENDFUNC

CALL pickup

Expected:
- Function compilation
- Correct expansion
- 3 commands executed
```

```
Test Script 4 - Loops:
LOOP 3
  X100
  Y100
  X0
  Y0
ENDLOOP

Expected:
- 12 commands total (3 loops × 4 commands)
- Repeated pattern execution
```

### 3. Performance Testing

#### Latency Measurements
```javascript
// Measure command latency
const start = performance.now();
await serverAPI.move({X: 1000});
const latency = performance.now() - start;
console.log(`Command latency: ${latency}ms`);

// Target: <10ms for local network
```

#### Throughput Testing
```javascript
// Test command queue throughput
const commands = [];
for(let i = 0; i < 100; i++) {
  commands.push(`X${i * 10}`);
}

const script = commands.join('\n');
const start = performance.now();
await serverAPI.executeScript(script);
const throughput = commands.length / ((performance.now() - start) / 1000);
console.log(`Throughput: ${throughput} commands/second`);
```

#### Memory Usage
```cpp
// Arduino memory monitoring (add to main loop)
void checkMemory() {
  int freeRAM = freeMemory();
  if (freeRAM < 500) {
    Serial.println("E Low memory warning");
  }
}

// Target: >50% free RAM on Arduino
```

### 4. Error Handling Testing

#### Connection Loss Scenarios
```
Test 1: WiFi Disconnect
- Disconnect ESP32 from WiFi
- Send commands from web interface
- Expected: Queue commands, auto-reconnect

Test 2: Server Restart  
- Restart laptop server
- ESP32 should reconnect automatically
- Commands should resume

Test 3: Arduino Reset
- Reset Arduino Mega
- ESP32 should detect disconnect
- Server should show error status
```

#### Invalid Command Handling
```
Test Commands:
XYZ123            # Invalid format
M X99999999       # Out of range
INVALID_COMMAND   # Unknown command

Expected:
- Error messages returned
- System remains stable
- No crashes or hangs
```

### 5. Safety Testing

#### Emergency Stop
```
Test Scenario:
1. Start long script execution
2. Trigger emergency stop
3. Verify immediate halt
4. Check queue cleared
5. Test system recovery

Expected:
- Motors stop within 100ms
- All queues cleared
- System ready for new commands
```

#### Limit Switch Simulation
```cpp
// Add to Arduino code for testing
bool checkLimits() {
  // Simulate limit switch hit
  if (motorX.currentPosition() > 5000) {
    Serial.println("E X-axis limit reached");
    motorX.stop();
    return false;
  }
  return true;
}
```

### 6. Load Testing

#### Multiple Client Connections
```javascript
// Test multiple web browser tabs
// Each should receive real-time updates
// Commands should be processed sequentially
```

#### Large Script Execution
```
Test Script - 1000 Commands:
LOOP 250
  X100 Y100
  GROUP X200 Y200
  X0 Y0  
  SYNC
ENDLOOP

Expected:
- Smooth execution
- No memory issues
- Consistent performance
```

### 7. Validation Checklist

#### Pre-Deployment
- [ ] Arduino responds to all command types
- [ ] ESP32 connects to WiFi and server
- [ ] WebSocket communication stable
- [ ] Script compiler handles all syntax
- [ ] Motion planner optimizes paths
- [ ] Real-time position updates work
- [ ] Emergency stop functions correctly
- [ ] Error handling graceful
- [ ] Memory usage within limits
- [ ] Performance meets requirements

#### Post-Deployment
- [ ] System runs continuously for 1+ hours
- [ ] No memory leaks detected
- [ ] Error recovery works
- [ ] Multiple scripts execute correctly
- [ ] Position accuracy maintained
- [ ] Speed control responsive

## Automated Testing

### Test Script Template
```bash
#!/bin/bash
# automated-test.sh

echo "Starting Palletizer System Test..."

# 1. Check server status
curl -f http://localhost:3001/api/status || exit 1

# 2. Test script compilation
curl -X POST -H "Content-Type: application/json" \
  -d '{"script":"X1000\nY2000\nSYNC"}' \
  http://localhost:3001/api/script/parse || exit 1

# 3. Test execution
curl -X POST -H "Content-Type: application/json" \
  -d '{"script":"X1000\nY2000\nSYNC"}' \
  http://localhost:3001/api/script/execute || exit 1

echo "All tests passed!"
```

### Continuous Integration
```yaml
# ci-test.yml
name: Palletizer Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test
      - run: npm run build
```

## Metrics to Monitor

### System Health
- Command execution time
- Queue processing rate  
- WebSocket connection stability
- Memory usage trends
- Error frequency

### Performance KPIs
- Average latency: <10ms
- Throughput: >50 commands/sec
- Uptime: >99%
- Memory usage: <70%
- Error rate: <1%