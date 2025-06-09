# Setup Instructions

## Files Changed/Created

### **MODIFIED FILES:**
1. `package.json` - Added axios, fs-extra dependencies
2. `next.config.ts` - Removed static export, added server config
3. `src/lib/api.ts` - Updated endpoints to localhost API routes

### **NEW FILES CREATED:**

#### **Backend Services (5 files):**
- `src/lib/config.ts` - Configuration management
- `src/lib/services/esp32-client.ts` - ESP32 communication
- `src/lib/services/file-manager.ts` - File operations
- `src/lib/services/script-parser.ts` - Modern Script Language parser
- `src/lib/services/sequence-runner.ts` - Execution logic
- `src/lib/services/debug-manager.ts` - Debug & logging

#### **API Routes (14 files):**
- `src/app/api/system/play/route.ts`
- `src/app/api/system/pause/route.ts`
- `src/app/api/system/stop/route.ts`
- `src/app/api/system/zero/route.ts`
- `src/app/api/system/status/route.ts`
- `src/app/api/system/command/route.ts`
- `src/app/api/scripts/save/route.ts`
- `src/app/api/scripts/load/route.ts`
- `src/app/api/scripts/parse/route.ts`
- `src/app/api/speed/global/route.ts`
- `src/app/api/speed/axis/route.ts`
- `src/app/api/esp32/command/route.ts`
- `src/app/api/esp32/status/route.ts`
- `src/app/api/debug/logs/route.ts`
- `src/app/api/debug/clear/route.ts`

### **FOLDERS TO DELETE:**
- `firmware/` - Move to separate ESP32 project
- `scripts/` - No longer needed

### **FOLDERS TO CREATE:**
Create these folders in project root:
```bash
mkdir -p storage/scripts
mkdir -p storage/logs  
mkdir -p storage/config
```

## Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create storage folders:**
   ```bash
   mkdir -p storage/scripts storage/logs storage/config
   ```

3. **Configure ESP32 connection:**
   Edit `src/lib/config.ts` and update ESP32 IP:
   ```typescript
   esp32: {
     host: '192.168.1.100', // Your ESP32 IP
     port: '80',
   }
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Access application:**
   Open http://localhost:3000

## Environment Variables (Optional)

Create `.env.local` file:
```env
ESP32_HOST=192.168.1.100
ESP32_PORT=80
PORT=3000
HOST=localhost
```

## Storage Structure

```
storage/
├── scripts/
│   ├── current_script.txt    # Main script file
│   └── backup_*.txt          # Backup scripts
├── logs/
│   ├── 2024-01-01.log       # Daily log files
│   └── 2024-01-02.log
└── config/
    ├── timeout.json         # Timeout configuration
    └── system.json          # System settings
```

## API Endpoints

All endpoints are now local:

- **System:** `/api/system/play`, `/api/system/pause`, `/api/system/stop`, `/api/system/zero`
- **Scripts:** `/api/scripts/save`, `/api/scripts/load`, `/api/scripts/parse`
- **Speed:** `/api/speed/global`, `/api/speed/axis`
- **ESP32:** `/api/esp32/command`, `/api/esp32/status`
- **Debug:** `/api/debug/logs`, `/api/debug/clear`

## Migration Benefits

✅ **Reduced ESP32 Memory Usage** - No web server, parser, or file system  
✅ **Better Performance** - Laptop handles complex processing  
✅ **Easier Debugging** - Full Node.js debugging tools  
✅ **Unlimited Storage** - Scripts and logs stored on laptop  
✅ **Better Development** - Hot reload, TypeScript, full IDE support