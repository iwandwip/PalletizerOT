# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ESP32 Palletizer Control System - A web-based robotics control interface for industrial palletizer automation using a Master-Slave ESP32 architecture.

## Key Commands

### Frontend Development
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build static files for ESP32 deployment
npm run lint         # Run ESLint
npm run build:test   # Build and test with local HTTP server on port 3002
```

### Firmware Build Process
The firmware requires the **Kinematrix** library (not included in repo) and uses either PlatformIO or Arduino IDE.

**PlatformIO method:**
```bash
# 1. Build web interface first
npm run build

# 2. Copy web files to ESP32 data folder
cp -r out/* firmware/PalletizerMaster/data/

# 3. Upload filesystem
pio run --target uploadfs

# 4. Build and upload firmware
pio run --target upload
```

**Note:** No platformio.ini exists - you'll need to create one with ESP32 board configuration.

## Architecture

### System Design
```
Web Interface (React/Next.js) ←→ ESP32 Master ←→ Multiple ESP32 Slaves (X,Y,Z,T,G axes)
                                      ↓
                                  LittleFS
                               (Script Storage)
```

### Major Migration in Progress
The codebase is transitioning from ESP32-heavy parsing to client-side batch processing:
- **Current**: ESP32 parses Modern Script Language (using ~250KB/320KB RAM)
- **Target**: Browser compiles scripts to simple commands, ESP32 just executes
- **Key files being replaced**: PalletizerScriptParser.cpp → ScriptCompiler.js

### Key Components

**Frontend (src/)**
- `app/page.tsx` - Main control interface
- `components/command-editor.tsx` - Script editor with syntax highlighting
- `components/debug-terminal.tsx` - Real-time SSE debug output
- `lib/compiler/ScriptCompiler.js` - Client-side script compiler (NEW)
- `lib/uploader/CommandUploader.js` - Batch command uploader (NEW)
- `lib/api.ts` - API client for ESP32 communication

**Firmware (firmware/)**
- `PalletizerMaster/` - Main ESP32 controller
  - `SimpleExecutor.cpp` - Lightweight command executor (NEW)
  - `CommandRouter.cpp` - Routes commands to slaves (NEW)
  - `FlashManager.cpp` - Manages script storage (NEW)
  - `PalletizerServer.cpp` - HTTP/SSE server
- `PalletizerSlave/` - Motor controllers for each axis

### API Endpoints
- `POST /script` - Upload compiled script
- `POST /control` - Send control commands (PLAY/PAUSE/STOP/ZERO)
- `POST /speed` - Set axis speeds
- `GET /status` - Get system status
- `GET /events` - SSE endpoint for real-time updates

### Modern Script Language
The system uses a custom scripting language with:
- Movement commands: `X100`, `Y-50 F1000`
- Group movements: `GROUP X100 Y200 Z50`
- Synchronization: `SYNC`
- Functions: `FUNC name ... ENDFUNC`, `CALL name`
- Loops: `LOOP n ... ENDLOOP`

### Important Configuration
- **Network**: Configure in `PalletizerMaster.ino` (DEV_MODE for station/AP mode)
- **Hardware pins**: Defined in each firmware file
- **Static export**: Next.js configured for `output: 'export'`
- **Build ignores**: TypeScript and ESLint errors ignored during build

### Current Development Focus
1. Completing migration to SimpleExecutor architecture
2. Removing heavy parsing modules from ESP32
3. Implementing client-side script compilation
4. Testing batch command upload/execution
5. Ensuring backward compatibility during transition