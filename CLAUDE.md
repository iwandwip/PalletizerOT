# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PalletizerOT is an industrial palletizer control system with a dual-arm robotic automation interface. The system consists of:

- **Web Client**: Next.js 15 + React 18 + TypeScript interface with Modern Script Language (MSL) compiler
- **Backend Server**: Express.js API server with real-time communication
- **ESP32 Firmware**: Ultra-lightweight command forwarder (99% RAM reduction architecture)
- **Arduino Network**: Master/slave system for motor control (2 masters + 10 slaves)

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Express.js, Server-Sent Events, CORS, mDNS service discovery
- **MSL Compiler**: Custom TypeScript-based parser with real-time compilation
- **Firmware**: ESP32 + Arduino C++ with object-oriented architecture
- **Communication**: HTTP polling, UART protocol, SSE events

## Development Commands

### Development Servers
```bash
npm run dev              # Next.js web client (port 3005)
npm run dev:server       # Express backend server (port 3006)
npm run dev:all          # Both servers concurrently
npm run dev:esp32        # ESP32 simulator for testing
npm run dev:full         # Complete development environment (all services)
```

### Build & Deployment
```bash
npm run build            # Production build
npm run build:export     # Static export for ESP32 deployment
npm run build:copy       # Copy build to ESP32 filesystem
npm run build:test       # Build and test locally on port 3003
npm run lint             # ESLint code checking
```

### Testing
```bash
npm run test             # ESP32 simulator testing
npm run test:all         # Integration testing with server
npm run test:integration # Full integration test suite
```

## Architecture Overview

### MSL Compiler System
The Modern Script Language compiler is implemented in TypeScript with a modular parser architecture:

- **Core**: `src/compiler/core/` - FunctionManager, LoopManager, ParserRegistry
- **Parsers**: `src/compiler/parsers/` - MovementParser, ControlFlowParser, SystemParser, GroupParser
- **Generators**: `src/compiler/generators/` - TextGenerator for output formatting
- **Main**: `src/compiler/MSLCompiler.ts` - Primary compiler orchestrator

### Communication Flow
```
Web Client (MSL Compiler) → Express Server → ESP32 Bridge → Arduino MEGA Network
     ↓                           ↓               ↓              ↓
Full Script Processing    Command Storage   UART Forwarding   Motor Control
Real-time Compilation    HTTP/SSE API      Serial Protocol   5-Axis + Gripper
```

### Key Directories
- `src/app/` - Next.js App Router pages and layout
- `src/components/` - React components including editors, UI library, and system controls
- `src/compiler/` - Complete MSL compiler implementation
- `src/server/` - Express.js backend server
- `src/lib/` - Utilities, API client, types, and custom hooks
- `firmware/FirmwareESP32/` - Ultra-lightweight ESP32 firmware
- `docs/` - Comprehensive project documentation

## Development Workflow

1. **Web Development**: Use `npm run dev:all` for concurrent frontend/backend development
2. **MSL Compiler**: Real-time compilation happens in browser, test with the web interface
3. **ESP32 Testing**: Use `npm run dev:esp32` for simulator testing without hardware
4. **Full System**: Use `npm run dev:full` to include ESP32 simulator
5. **Production**: Use `npm run build:copy` to deploy to actual ESP32 hardware

## Key Features

- **Dual-Arm Support**: Independent script management for ARM1/ARM2
- **Real-time Compilation**: MSL compiler with instant syntax validation
- **Professional Interface**: Debug terminal, status monitoring, speed controls
- **Ultra-lightweight ESP32**: Object-oriented firmware with minimal memory footprint
- **Service Discovery**: Automatic ESP32 detection via mDNS/Bonjour

## Important File Locations

- Main interface: `src/app/page.tsx`
- MSL Compiler: `src/compiler/MSLCompiler.ts`
- Express server: `src/server/index.ts`
- ESP32 firmware: `firmware/FirmwareESP32/FirmwareESP32.ino`
- Component library: `src/components/ui/`
- API utilities: `src/lib/api.ts`

## Port Configuration

- Web Client: 3005 (development), 3003 (testing)
- Backend Server: 3006
- ESP32 Target: 80 (production deployment)

## Documentation

Comprehensive documentation is available in `docs/`:
- `01_PROJECT_STRUCTURE.md` - Architecture and setup
- `02_SYSTEM_FLOWS.md` - Technical implementation details
- `03_VERSION_HISTORY.md` - Development evolution and migration guides