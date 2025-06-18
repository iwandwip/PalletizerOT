# ESP32 Palletizer Control System

Modern web-based control interface for ESP32 palletizer robotics system with real-time communication, industrial-grade features, and integrated debug terminal.

## Prerequisites

- Node.js 18+
- npm or yarn
- ESP32 device with palletizer firmware
- PlatformIO or Arduino IDE

## Installation

```bash
git clone https://github.com/username/esp32-palletizer-control.git
cd esp32-palletizer-control
npm install
```

### React Version Fix
```bash
npm install react@^18.0.0 react-dom@^18.0.0
npm install --save-dev @types/react@^18.0.0 @types/react-dom@^18.0.0
```

### shadcn/ui Setup
```bash
npx shadcn@latest init
npx shadcn@latest add button card tabs slider badge textarea input label toast progress switch alert
npm install lucide-react clsx class-variance-authority
```

## Development

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run build:copy   # Build + analyze files for ESP32
npm run build:test   # Build + test with local server
```

## Build & Deployment

### Standard Build Process
```bash
npm run build
```

This creates optimized static files in `out/` folder:
- `index.html` - Main application entry point
- `_next/static/css/` - Compiled CSS files  
- `_next/static/chunks/` - JavaScript modules
- `_next/static/media/` - Fonts and assets

### Test Build Locally
```bash
npm run build:test
```
Opens `http://localhost:3002` to test the production build.

## ESP32 Deployment

### Upload Process

1. **Build the project:**
   ```bash
   npm run build:copy
   ```

2. **Upload ALL files from `out/` folder to ESP32 LittleFS root:**

   **Method A - PlatformIO:**
   ```bash
   cp -r out/* firmware/PalletizerMaster/data/
   pio run --target uploadfs
   ```

   **Method B - Arduino IDE:**
   ```bash
   # Copy files to data/ folder
   # Tools > ESP32 Sketch Data Upload
   ```

3. **File structure on ESP32:**
   ```
   ESP32 LittleFS Root (/):
   ├── index.html
   ├── _next/
   │   └── static/
   │       ├── css/
   │       ├── chunks/
   │       └── media/
   └── favicon.ico
   ```

4. **Access:** `http://192.168.4.1/` or `http://[ESP32-IP]/`

## Project Structure

```
┌─────────────────┐
│  Web Interface  │ (Next.js Static Build)
│   (React UI)    │
└────────┬────────┘
         │ HTTP/SSE
┌────────▼────────┐
│  ESP32 Master   │ (PalletizerMaster + Server)
│  (Coordinator)  │
└────────┬────────┘
         │ UART (9600 baud)
    ┌────┴────┬────┬────┬────┐
    │         │    │    │    │
┌───▼───┐┌───▼───┐ ... ┌───▼───┐
│ESP32-X││ESP32-Y│     │ESP32-G│
│ Slave ││ Slave │     │ Slave │
└───────┘└───────┘     └───────┘
```

```
PalletizerOT/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   ├── system-controls.tsx    # PLAY/PAUSE/STOP/ZERO
│   │   ├── speed-panel.tsx        # Speed control interface
│   │   ├── command-editor.tsx     # Script editor
│   │   ├── status-display.tsx     # Real-time status
│   │   └── debug-terminal.tsx     # Debug terminal component
│   └── lib/
│       ├── api.ts                 # ESP32 API client with debug methods
│       ├── types.ts               # TypeScript interfaces
│       ├── hooks.ts               # React hooks with useDebugMonitor
│       └── utils.ts               # Utilities
│
├── firmware/
│   ├── PalletizerMaster/          # ESP32 Master controller
│   │   ├── PalletizerMaster.ino
│   │   ├── PalletizerMaster.cpp
│   │   ├── PalletizerMaster.h
│   │   ├── PalletizerServer.cpp   # Web server with debug stream
│   │   ├── PalletizerServer.h
│   │   ├── PalletizerScriptParser.cpp
│   │   ├── PalletizerScriptParser.h
│   │   ├── DebugManager.cpp       # Debug serial interceptor
│   │   ├── DebugManager.h
│   │   └── data/                  # LittleFS upload folder
│   ├── PalletizerSlave/           # ESP32 Slave controllers
│   │   ├── PalletizerSlave.ino
│   │   ├── StepperSlave.cpp
│   │   └── StepperSlave.h
│   └── PalletizerCommandExample/  # Sample scripts
│       ├── test_basic_simple.txt
│       ├── test_group_commands.txt
│       └── test_complex_automation.txt
│
├── scripts/
│   └── copy-to-esp32.mjs          # Deployment helper
├── out/                           # Build output
├── public/                        # Static assets
├── components.json                # shadcn/ui config
├── next.config.ts                 # Next.js config
├── tailwind.config.ts             # Tailwind config
└── package.json
```

## Firmware Architecture

### Master-Slave Communication

**PalletizerMaster (Main ESP32):**
- Web server and UI hosting
- Command parsing and distribution  
- Inter-arm synchronization
- Timeout and error handling
- Debug message streaming

**PalletizerSlave (Motor Controllers):**
- Individual stepper motor control
- Movement execution
- Status reporting
- Homing operations

### Communication Protocol

**Commands (Master → Slave):**
```cpp
"x;1;100;d1000"        // axis;run;position;delay
"x;6;500"              // axis;setspeed;value  
"x;2"                  // axis;zero (homing)
```

**Group Commands:**
```cpp
"GROUP;X(100,d1000,200),Y(50,d500),Z(30)"  // Simultaneous execution
```

**Responses (Slave → Master):**
```cpp
"x;POSITION REACHED"
"x;SEQUENCE COMPLETED"  
"x;ZERO DONE"
```

## Modern Script Language

### System Control Commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `IDLE` | Stops all operations and sets system to idle status | `IDLE` | `IDLE` |
| `PLAY` | Starts or resumes execution from command queue | `PLAY` | `PLAY` |
| `PAUSE` | Pauses execution. Completes current command but doesn't process next | `PAUSE` | `PAUSE` |
| `STOP` | Stops all operations. If running, completes current sequence first | `STOP` | `STOP` |
| `ZERO` | Returns all axes to home position | `ZERO` | `ZERO` |

### Movement Commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| **Sequential** | Move axes one by one (default behavior) | `X(position,...); Y(position,...);` | `X(100,d1000,200); Y(50,d500,100);` |
| **Simultaneous** | Move multiple axes simultaneously | `GROUP(X(...), Y(...), Z(...))` | `GROUP(X(100,d1000,200), Y(50,d500), Z(30))` |

**Note:** Each axis can accept maximum 5 parameters in a single command.

### Speed Control

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| **Single Axis** | Set speed for specific axis | `SPEED;slaveid;value` | `SPEED;x;500` |
| **All Axes** | Set speed for all axes | `SPEED;value` | `SPEED;200` |

### Function System

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| **Function Definition** | Define reusable function | `FUNC(name) { commands; }` | `FUNC(PICK_ITEM) { X(100); Y(50); }` |
| **Function Call** | Execute defined function | `CALL(name)` | `CALL(PICK_ITEM)` |

### Synchronization

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| **Signal HIGH** | Send synchronization signal | `SET(1)` | `SET(1)` |
| **Signal LOW** | Clear synchronization signal | `SET(0)` | `SET(0)` |
| **Wait** | Wait for external sync signal | `WAIT` | `WAIT` |

## Script Examples

### Basic Movement
```cpp
X(100,d1000,200);
Y(50,d500,100);
Z(10,d2000);
```

### Simultaneous Movement (GROUP)
```cpp
GROUP(X(100,d1000,200), Y(50,d500,100), Z(10,d2000));
```

### Function Definition and Calls
```cpp
FUNC(PICK_SEQUENCE) {
  GROUP(X(100,d500), Y(50,d300));
  Z(10,d1000);
}

FUNC(PLACE_SEQUENCE) {
  Z(80,d500);
  GROUP(X(400,d800), Y(150,d600));
  Z(100,d1000);
}

CALL(PICK_SEQUENCE);
SET(1);
SET(0);
CALL(PLACE_SEQUENCE);
```

### Complex Automation
```cpp
FUNC(HOME_ALL) {
  ZERO;
  SPEED;200;
}

FUNC(PICK_AND_PLACE) {
  GROUP(X(100,d1000,200), Y(50,d500,100));
  Z(5,d1000);
  SET(1);
  Z(80,d500);
  GROUP(X(400,d1000,500), Y(150,d500,200));
  Z(100,d1000);
  SET(0);
}

CALL(HOME_ALL);
CALL(PICK_AND_PLACE);
CALL(PICK_AND_PLACE);
CALL(PICK_AND_PLACE);
```

### Multi-Axis Coordination
```cpp
FUNC(ARM1_SEQUENCE) {
  GROUP(X(100,d1000,200), Y(50,d800,100));
  Z(10,d1500,50);
  SET(1);
  WAIT;
  SET(0);
}

FUNC(ARM2_SEQUENCE) {
  WAIT;
  GROUP(X(1000,d1000,900), Y(500,d800,450));
  Z(100,d1500,50);
  SET(1);
  SET(0);
}

CALL(ARM1_SEQUENCE);
```

## Movement Parameters

**Position Parameters (Max 5 per axis):**
```cpp
X(position)                          # Single position
X(position,delay)                    # Position with delay
X(position,delay,param3)             # Additional parameter
X(position,delay,param3,param4)      # More parameters
X(position,delay,param3,param4,param5) # Maximum 5 parameters
```

**Delay Syntax:**
```cpp
d1000    # Delay 1000ms (can be anywhere in parameter list)
```

**Examples:**
```cpp
X(100)                               # Move to position 100
X(100,d1000)                         # Move to 100 with 1000ms delay
X(100,d1000,200,400,500)             # Complex 5-parameter movement
```

## Code Style Guidelines

### Horizontal vs Vertical Formatting
```cpp
# Horizontal style
X(100,d1000,200);Y(50,d500,100);Z(30);

# Vertical style  
X(100,d1000,200);
Y(50,d500,100);
Z(30);

# Mixed style
GROUP(X(100,d1000), Y(50,d500)); Z(30);
```

### Function Organization
```cpp
FUNC(DESCRIPTIVE_NAME) {
  GROUP(X(...), Y(...));    # Simultaneous operations first
  Z(...);                   # Sequential operations follow
  SET(1); SET(0);           # Sync operations last
}
```

## Debug System

### Web-Based Debug Terminal

The system includes an integrated debug terminal accessible from the web interface:

**Features:**
- Real-time debug message streaming via Server-Sent Events
- Level-based filtering (ERROR, WARNING, INFO, DEBUG)
- Text search across messages and sources
- Export debug logs to file
- Pause/resume message capture
- Resizable and minimizable terminal
- Auto-scroll with manual override
- Timestamp display with millisecond precision

**Architecture:**
```
Serial.println() → DebugManager → PalletizerServer → SSE → React Terminal
```

### Debug Endpoints

```
GET  /debug              # SSE stream for real-time messages
GET  /debug/buffer       # Get buffered messages (max 1000)
POST /debug/clear        # Clear debug buffer
POST /debug/toggle       # Enable/disable debug capture
```

### Using Debug System

**In Firmware:**
```cpp
DEBUG_MGR.begin(&Serial, &server);
DEBUG_MGR.info("MASTER", "System initialized");
DEBUG_MGR.warning("SLAVE", "Connection timeout");
DEBUG_MGR.error("PARSER", "Invalid command");
```

**In React:**
```typescript
// Debug terminal automatically connects to SSE stream
// Messages appear in real-time at bottom of page
// Use filters and search to find specific messages
```

## API Documentation

### HTTP Endpoints

**System Control:**
```
POST /command
Body: cmd=PLAY|PAUSE|STOP|ZERO|IDLE

GET /status  
Returns: {"status": "IDLE|RUNNING|PAUSED|STOPPING"}
```

**Script Management:**
```
POST /write
Body: text=<script_content>

GET /get_commands
Returns: Current script content

POST /upload
Body: file=<script_file>

GET /download_commands
Returns: Script file download
```

**Speed Control:**
```
POST /command
Body: cmd=SPEED;x;500     # Single axis speed
Body: cmd=SPEED;200       # All axes speed
```

**Group Commands:**
```
POST /command
Body: cmd=GROUP(X(100,d1000,200),Y(50,d500),Z(30))
```

**Configuration:**
```
GET /timeout_config
POST /timeout_config
GET /timeout_stats
POST /clear_timeout_stats
```

**Debug System:**
```
GET /debug              # SSE stream
GET /debug/buffer       # Buffered messages
POST /debug/clear       # Clear buffer
POST /debug/toggle      # Toggle capture
```

**Real-time Updates:**
```
GET /events             # System events SSE
GET /debug              # Debug messages SSE
```

### JavaScript API

```typescript
import { api } from '@/lib/api'

// Send system commands
await api.sendCommand('PLAY')
await api.sendCommand('SPEED;x;500')
await api.sendCommand('GROUP(X(100,d1000,200),Y(50,d500),Z(30))')

// Script management  
await api.saveCommands(scriptText)
const commands = await api.loadCommands()

// Status monitoring
const status = await api.getStatus()

// Debug operations
const debugBuffer = await api.getDebugBuffer()
await api.clearDebugBuffer()
await api.toggleDebugCapture()

// Real-time events
const eventSource = api.createEventSource()
const debugSource = api.createDebugEventSource()
```

## Configuration

### Network Settings
```cpp
// firmware/PalletizerMaster/PalletizerMaster.ino
#define WIFI_MODE PalletizerServer::MODE_STA
#define WIFI_SSID "your_wifi"
#define WIFI_PASSWORD "your_password"
```

### Hardware Pins
```cpp
// Master ESP32
#define RX_PIN 16
#define TX_PIN 17
#define INDICATOR_PIN 26
#define SYNC_SET_PIN 25
#define SYNC_WAIT_PIN 27

// Slave ESP32  
#define CLK_PIN 10        // Stepper clock
#define CW_PIN 11         // Direction
#define EN_PIN 12         // Enable
#define SENSOR_PIN 6      // Limit switch
#define BRAKE_PIN 7       // Brake (T-axis)
```

### Timeout Configuration
```typescript
interface TimeoutConfig {
  maxWaitTime: number      // Max wait (ms)
  strategy: number         // 0=Skip, 1=Pause, 2=Abort, 3=Retry
  maxTimeoutWarning: number
  autoRetryCount: number
  saveToFile: boolean
}
```

## Troubleshooting

### Build Issues
```bash
# React version conflicts
rm -rf node_modules package-lock.json
npm install
npm install react@^18.0.0 react-dom@^18.0.0

# shadcn/ui errors
npx shadcn@latest init --force
```

### ESP32 Issues

**Web interface not loading:**
- Check ESP32 IP address
- Verify file structure on LittleFS
- Check serial monitor for errors
- Use debug terminal for diagnostics

**Connection status disconnected:**
- Verify ESP32 web server running
- Check `/events` endpoint accessibility
- Monitor network connectivity
- Check debug messages for connection errors

**Commands not executing:**
- Check slave communication in debug terminal
- Verify command syntax using Modern Script Language
- Monitor timeout statistics
- Check debug messages for parsing errors

**GROUP commands not simultaneous:**
- Verify GROUP syntax: `GROUP(X(...), Y(...), Z(...))`
- Check debug messages for GROUP processing
- Ensure all slaves in group are connected
- Monitor slave completion indicators

**Debug terminal not showing messages:**
- Ensure DebugManager is initialized after server
- Check `/debug` SSE endpoint
- Verify debug capture is enabled
- Check browser console for connection errors

### File Size Issues
```bash
# Check build size
npm run build:copy

# If too large for ESP32:
# - Remove unused components
# - Optimize assets
# - Enable GZIP in firmware
```

## Command Language Summary

### Essential Commands
```cpp
# System Control
PLAY; PAUSE; STOP; IDLE; ZERO;

# Speed Control  
SPEED;200;              # All axes
SPEED;x;500;            # Single axis

# Sequential Movement
X(100,d1000,200);
Y(50,d500,100);

# Simultaneous Movement
GROUP(X(100,d1000,200), Y(50,d500,100), Z(30));

# Functions
FUNC(NAME) { commands; }
CALL(NAME);

# Synchronization
SET(1); SET(0); WAIT;
```

### Best Practices
- Use GROUP() for simultaneous operations
- Define reusable functions for complex sequences
- Use descriptive function names
- Add delays for mechanical settling
- Test with debug terminal for verification
- Use proper synchronization for multi-arm coordination

## Contributing

```bash
# Setup development
git clone https://github.com/your-username/esp32-palletizer-control.git
cd esp32-palletizer-control
npm install
npm run dev

# Development workflow
git checkout -b feature-name
# Make changes
npm run build:test  # Test changes
git commit -am "Add feature"
git push origin feature-name
# Create pull request
```

### Code Guidelines
- Use TypeScript for new code
- Follow React functional patterns
- Use shadcn/ui components
- Implement error handling
- Add loading states
- Document complex logic
- Add debug messages for new features
- Use Modern Script Language syntax only

## License

MIT License - see LICENSE file for details.