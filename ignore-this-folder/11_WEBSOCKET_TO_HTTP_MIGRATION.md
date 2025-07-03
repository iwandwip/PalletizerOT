# WebSocket to HTTP Migration Guide

## Overview

This document outlines the complete migration from WebSocket-based real-time communication to HTTP-based polling architecture for the Palletizer Control System.

## Migration Date
**Completed:** June 19, 2025

## Reason for Migration

The original WebSocket-based architecture had several issues:
- Complex connection management between web client, server, and ESP32
- Connection stability problems during development and testing
- Unnecessary real-time overhead for command execution that doesn't require instant feedback
- ESP32 memory usage for persistent WebSocket connections

## Architecture Changes

### Before: WebSocket-Based Architecture
```
Web Client ←→ WebSocket ←→ Node.js Server ←→ WebSocket ←→ ESP32 ←→ Serial ←→ Arduino
```

**Problems:**
- Multiple persistent connections
- Real-time status streaming
- Complex connection state management
- ESP32 memory overhead for WebSocket client

### After: HTTP-Based Architecture
```
Web Client → HTTP → Node.js Server ← HTTP Polling ← ESP32 ←→ Serial ←→ Arduino
```

**Benefits:**
- Simple request/response pattern
- No persistent connections
- Lower ESP32 memory usage
- More reliable communication
- ESP32 can store commands permanently in LittleFS

## Implementation Details

### 1. Command Flow Changes

**Old Flow:**
1. Web → WebSocket → Server → WebSocket → ESP32 → Serial → Arduino
2. Real-time streaming of commands
3. Complex queue management on server

**New Flow:**
1. Web → HTTP POST `/api/script/save` → Server compiles and stores script
2. ESP32 → HTTP GET `/api/script/poll` → Downloads compiled commands to LittleFS
3. Web → HTTP POST `/api/control/start` → Triggers execution
4. ESP32 → HTTP GET `/api/command/next` → Gets next command when ready
5. ESP32 → Serial → Arduino → Serial → ESP32
6. ESP32 → HTTP POST `/api/command/ack` → Acknowledges command completion
7. Repeat steps 4-6 until all commands complete

### 2. Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/script/save` | POST | Compile and save script |
| `/api/script/poll` | GET | ESP32 downloads new scripts |
| `/api/command/next` | GET | ESP32 requests next command |
| `/api/command/ack` | POST | ESP32 acknowledges command completion |
| `/api/control/start` | POST | Start script execution |
| `/api/control/stop` | POST | Stop and reset execution |
| `/api/control/pause` | POST | Pause execution |
| `/api/control/resume` | POST | Resume execution |
| `/api/status` | GET | Get system status |

### 3. ESP32 Changes

**Removed:**
- `WebSocketManager.h/cpp`
- `SerialBridge.h/cpp`
- Arduino WebSocket library (`arduinoWebSockets/`)

**Added:**
- `HttpClient.h/cpp` - Simple HTTP client for ESP32
- `CommandStorage.h/cpp` - LittleFS-based command storage

**New ESP32 Behavior:**
- Polls server every 2 seconds for new scripts
- Downloads and stores commands in LittleFS permanently
- Requests commands one by one during execution
- Waits for Arduino acknowledgment before requesting next command
- Commands persist across ESP32 reboots

### 4. Web Interface Changes

**Removed:**
- WebSocket client connection
- Real-time event handlers
- Live position updates
- Real-time queue monitoring

**Added:**
- HTTP polling every 3 seconds for status
- Script progress display with progress bar
- Simplified status indicators
- Command count tracking

**New Status Display:**
- ESP32 connection status
- Script loaded indicator
- Execution progress (X/Y commands)
- System states: NO_SCRIPT, READY, RUNNING, COMPLETED

### 5. Server Architecture

**Removed Files:**
- `ESP32Manager.ts` - WebSocket-based ESP32 communication
- `CommandQueue.ts` - Server-side command queueing
- `MotionPlanner.ts` - Motion planning logic
- WebSocket server setup

**Simplified Server:**
- Pure HTTP API with Express.js
- In-memory state management
- Script compilation and storage
- Command streaming with acknowledgment tracking

### 6. Dependencies Removed

```json
// Removed from package.json
"ws": "^8.18.0"
"@types/ws": "^8.5.13"
```

## Migration Benefits

### 1. Reliability
- No connection drops or reconnection logic needed
- Simple HTTP request/response pattern
- Less prone to network issues

### 2. ESP32 Memory Usage
- No WebSocket client library (~50KB saved)
- No persistent connection buffers
- Commands stored efficiently in LittleFS

### 3. Development Experience
- Easier debugging with HTTP logs
- Standard REST API patterns
- No complex WebSocket state management

### 4. Scalability
- Stateless HTTP requests
- ESP32 can work offline after script download
- Multiple ESP32s can poll same server

## Testing

### Test Simulator
The test simulator was completely rewritten for HTTP:

**File:** `src/test/esp32-simulator.js`

**Features:**
- HTTP polling simulation
- Script download simulation
- Command execution with Arduino response simulation
- Acknowledgment flow testing

**Usage:**
```bash
npm run test        # Run simulator only
npm run test:all    # Run server + simulator
```

## Backward Compatibility

**⚠️ Breaking Changes:**
- WebSocket connections no longer supported
- Real-time position updates removed
- Live queue monitoring removed
- ESP32 firmware requires complete reflash

**Migration Required:**
- ESP32 firmware must be updated with new HTTP-based code
- Web interface automatically migrated
- No data migration needed (scripts are compiled fresh)

## Performance Comparison

| Aspect | WebSocket | HTTP Polling |
|--------|-----------|-------------|
| ESP32 Memory | ~250KB | ~200KB |
| Connection Overhead | High | Low |
| Network Traffic | Continuous | Burst |
| Reliability | Medium | High |
| Development Complexity | High | Low |

## Future Considerations

### Potential Optimizations
1. **Reduced Polling Frequency**: Could increase polling interval when no script is loaded
2. **Command Batching**: Send multiple commands per request for faster execution
3. **Compression**: Compress large scripts during download
4. **Caching**: ESP32 could cache multiple scripts

### Monitoring
- HTTP request logging on server
- ESP32 connection timeout detection (30 seconds)
- Command execution timing
- Script compilation performance

## Rollback Plan

If rollback is needed:

1. **Server:** Restore from git commit before migration
2. **ESP32:** Flash previous WebSocket-based firmware
3. **Dependencies:** Restore WebSocket packages
4. **Web Interface:** Restore WebSocket client code

**Rollback Commit:** `git checkout <commit-before-migration>`

## Conclusion

The migration from WebSocket to HTTP polling has significantly simplified the architecture while improving reliability and reducing resource usage. The new system is more maintainable, easier to debug, and provides better separation of concerns between components.

The trade-off of real-time updates for reliability and simplicity has proven worthwhile for this industrial automation use case where command acknowledgment is more important than instant status updates.