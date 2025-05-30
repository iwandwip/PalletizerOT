# ESP32 Palletizer Control System

Modern web-based control interface for ESP32 palletizer robotics system with real-time communication and industrial-grade features.

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
# Next.js 15 uses React 19, downgrade to React 18 for shadcn/ui compatibility
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
   # Copy all files to firmware/PalletizerMaster/data/
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
│   │   └── status-display.tsx     # Real-time status
│   └── lib/
│       ├── api.ts                 # ESP32 API client
│       ├── types.ts               # TypeScript interfaces
│       ├── hooks.ts               # React hooks
│       └── utils.ts               # Utilities
│
├── firmware/
│   ├── PalletizerMaster/          # ESP32 Master controller
│   │   ├── PalletizerMaster.ino
│   │   ├── PalletizerMaster.cpp
│   │   ├── PalletizerMaster.h
│   │   ├── PalletizerServer.cpp   # Web server
│   │   ├── PalletizerServer.h
│   │   ├── PalletizerScriptParser.cpp
│   │   ├── PalletizerScriptParser.h
│   │   └── data/                  # LittleFS upload folder
│   ├── PalletizerSlave/           # ESP32 Slave controllers
│   │   ├── PalletizerSlave.ino
│   │   ├── StepperSlave.cpp
│   │   └── StepperSlave.h
│   └── PalletizerCommandExample/  # Sample scripts
│       ├── test_basic_simple.txt
│       ├── test_legacy_format.txt
│       └── test_new_script_format.txt
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

**PalletizerSlave (Motor Controllers):**
- Individual stepper motor control
- Movement execution
- Status reporting
- Homing operations

### Communication Protocol

**Commands (Master → Slave):**
```cpp
"x;1;100;d1000;200"    // axis;command;position;delay;speed
"x;6;500"              // axis;setspeed;value  
"x;2"                  // axis;zero
```

**Responses (Slave → Master):**
```cpp
"x;POSITION REACHED"
"x;SEQUENCE COMPLETED"  
"x;ZERO DONE"
```

## API Documentation

### HTTP Endpoints

**System Control:**
```
POST /command
Body: cmd=PLAY|PAUSE|STOP|ZERO

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

**Configuration:**
```
GET /timeout_config
POST /timeout_config
GET /timeout_stats
POST /clear_timeout_stats
```

**Real-time Updates:**
```
GET /events
Content-Type: text/event-stream
```

### JavaScript API

```typescript
import { api } from '@/lib/api'

// Send commands
await api.sendCommand('PLAY')

// Script management  
await api.saveCommands(scriptText)
const commands = await api.loadCommands()

// Status monitoring
const status = await api.getStatus()

// Real-time events
const eventSource = api.createEventSource()
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
}
```

## Command Language

### Legacy Format
```
X(100,d1000,200),Y(50,d500,100) NEXT
SET(1) NEXT WAIT NEXT SET(0) NEXT
```

### Modern Script Format
```cpp
FUNC(PICK_SEQUENCE) {
  X(100,d1000,200);
  Y(50,d500,100);
  Z(10,d1000,50);
}

FUNC(PLACE_SEQUENCE) {
  Z(80,d500);
  X(400,d1000,500);
  Y(150,d500,200);
  Z(100,d1000);
}

CALL(PICK_SEQUENCE);
SET(1);
SET(0);
CALL(PLACE_SEQUENCE);
```

### Command Reference

**Movement:**
- `X(position)` - Move to position
- `X(pos,delay,speed)` - Move with timing
- `d1000` - Delay 1000ms

**Synchronization:**
- `SET(1)` - Signal HIGH
- `SET(0)` - Signal LOW
- `WAIT` - Wait for signal

**Functions:**
- `FUNC(name) {...}` - Define function
- `CALL(name)` - Execute function

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

**Connection status disconnected:**
- Verify ESP32 web server running
- Check `/events` endpoint accessibility
- Monitor network connectivity

**Commands not executing:**
- Check slave communication
- Verify command syntax
- Monitor timeout statistics

### File Size Issues
```bash
# Check build size
npm run build:copy

# If too large for ESP32:
# - Remove unused components
# - Optimize assets
# - Enable GZIP in firmware
```

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

## License

MIT License - see LICENSE file for details.