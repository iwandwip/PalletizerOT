import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { ScriptCompiler } from './ScriptCompiler';
import { MotionPlanner } from './MotionPlanner';
import { ESP32Manager } from './ESP32Manager';
import { CommandQueue } from './CommandQueue';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

const PORT = process.env.PORT || 3001;

// Initialize components
const scriptCompiler = new ScriptCompiler();
const motionPlanner = new MotionPlanner();
const commandQueue = new CommandQueue();
const esp32Manager = new ESP32Manager(wss);

// Middleware
app.use(express.json());
app.use(express.static('out')); // Serve static files

// API Routes
app.post('/api/script/parse', async (req, res) => {
  try {
    const { script } = req.body;
    const commands = await scriptCompiler.parse(script);
    res.json({ commands, success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message, success: false });
  }
});

app.post('/api/script/execute', async (req, res) => {
  try {
    const { script } = req.body;
    
    // Parse script
    const commands = await scriptCompiler.parse(script);
    
    // Plan motion
    const optimizedCommands = await motionPlanner.plan(commands);
    
    // Queue for execution
    commandQueue.enqueue(optimizedCommands);
    
    // Send to ESP32
    esp32Manager.executeCommands(optimizedCommands);
    
    res.json({ 
      success: true, 
      commandCount: optimizedCommands.length,
      message: 'Script queued for execution'
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message, success: false });
  }
});

app.post('/api/control/:action', (req, res) => {
  const { action } = req.params;
  
  try {
    switch (action) {
      case 'play':
        esp32Manager.sendCommand({ cmd: 'RESUME' });
        break;
      case 'pause':
        esp32Manager.sendCommand({ cmd: 'PAUSE' });
        break;
      case 'stop':
        esp32Manager.sendCommand({ cmd: 'STOP' });
        commandQueue.clear();
        break;
      case 'home':
        esp32Manager.sendCommand({ cmd: 'HOME' });
        break;
      case 'zero':
        esp32Manager.sendCommand({ cmd: 'ZERO' });
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message, success: false });
  }
});

app.post('/api/move', (req, res) => {
  try {
    const { axes, speed, accel } = req.body;
    
    esp32Manager.sendCommand({
      cmd: 'MOVE',
      data: {
        ...axes,
        speed: speed || 1000,
        accel: accel || 500
      }
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message, success: false });
  }
});

app.post('/api/group-move', (req, res) => {
  try {
    const { axes, speed, accel } = req.body;
    
    esp32Manager.sendCommand({
      cmd: 'GROUP',
      data: {
        ...axes,
        speed: speed || 1000,
        accel: accel || 500
      }
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message, success: false });
  }
});

app.post('/api/speed', (req, res) => {
  try {
    const { axes } = req.body;
    
    esp32Manager.sendCommand({
      cmd: 'SET_SPEED',
      data: axes
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message, success: false });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    esp32Connected: esp32Manager.isConnected(),
    queueLength: commandQueue.length(),
    currentPosition: esp32Manager.getCurrentPosition(),
    systemStatus: esp32Manager.getStatus()
  });
});

// WebSocket connection handling for web clients
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  // Send initial status
  ws.send(JSON.stringify({
    type: 'status',
    data: {
      esp32Connected: esp32Manager.isConnected(),
      queueLength: commandQueue.length(),
      currentPosition: esp32Manager.getCurrentPosition()
    }
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle client commands
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'subscribe':
          // Add to subscribers list for real-time updates
          esp32Manager.addSubscriber(ws);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    esp32Manager.removeSubscriber(ws);
    console.log('WebSocket connection closed');
  });
});

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error', success: false });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Palletizer Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server, wss };