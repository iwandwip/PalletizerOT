const WebSocket = require('ws');

class ESP32Simulator {
  constructor(serverHost = 'localhost', serverPort = 3001) {
    this.serverHost = serverHost;
    this.serverPort = serverPort;
    this.ws = null;
    this.connected = false;
    this.commandQueue = [];
    this.currentPosition = { X: 0, Y: 0, Z: 0, T: 0, G: 0 };
    this.isRunning = false;
    this.speed = { X: 1000, Y: 1000, Z: 1000, T: 1000, G: 1000 };
  }

  connect() {
    console.log(`🔌 Connecting to ws://${this.serverHost}:${this.serverPort}/ws`);
    
    this.ws = new WebSocket(`ws://${this.serverHost}:${this.serverPort}/ws`);
    
    this.ws.on('open', () => {
      this.connected = true;
      console.log('✅ WebSocket connected');
      this.sendStatus();
    });
    
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.log('📨 Raw message:', data.toString());
        this.handleRawMessage(data.toString());
      }
    });
    
    this.ws.on('close', () => {
      this.connected = false;
      console.log('❌ WebSocket disconnected');
    });
    
    this.ws.on('error', (error) => {
      console.error('🚨 WebSocket error:', error.message);
    });
  }

  handleMessage(message) {
    console.log('📨 Received message:', JSON.stringify(message, null, 2));
    
    switch (message.cmd || message.type) {
      case 'MOVE':
        this.handleMove(message.data || message);
        break;
      case 'GROUP':
        this.handleGroupMove(message.data || message);
        break;
      case 'HOME':
        this.handleHome();
        break;
      case 'ZERO':
        this.handleZero();
        break;
      case 'STOP':
        this.handleStop();
        break;
      case 'PAUSE':
        this.handlePause();
        break;
      case 'RESUME':
        this.handleResume();
        break;
      case 'SET_SPEED':
        this.handleSetSpeed(message.data || message);
        break;
      default:
        console.log('❓ Unknown command:', message);
    }
  }

  handleRawMessage(message) {
    console.log('📨 Raw command:', message);
    
    if (message.startsWith('M')) {
      this.parseMotorCommand(message);
    } else if (message.startsWith('G')) {
      this.parseGroupCommand(message);
    } else if (message === 'H') {
      this.handleHome();
    } else if (message === 'Z') {
      this.handleZero();
    } else if (message === 'S') {
      this.handleStop();
    } else {
      console.log('❓ Unknown raw command:', message);
    }
  }

  parseMotorCommand(cmd) {
    const match = cmd.match(/M([XYZTG])([+-]?\d+)(?:F(\d+))?/);
    if (match) {
      const [, axis, steps, feedrate] = match;
      console.log(`🎯 Motor ${axis}: ${steps} steps${feedrate ? `, feed: ${feedrate}` : ''}`);
      this.simulateMovement(axis, parseInt(steps), feedrate ? parseInt(feedrate) : null);
    }
  }

  parseGroupCommand(cmd) {
    console.log(`🎯 Group movement: ${cmd}`);
    const axes = {};
    const axisMatches = cmd.matchAll(/([XYZTG])([+-]?\d+)/g);
    for (const match of axisMatches) {
      axes[match[1]] = parseInt(match[2]);
    }
    this.simulateGroupMovement(axes);
  }

  handleMove(data) {
    console.log('🎯 Single axis move:', data);
    Object.keys(data).forEach(axis => {
      if (['X', 'Y', 'Z', 'T', 'G'].includes(axis)) {
        this.simulateMovement(axis, data[axis], data.speed);
      }
    });
  }

  handleGroupMove(data) {
    console.log('🎯 Group move:', data);
    const axes = {};
    Object.keys(data).forEach(axis => {
      if (['X', 'Y', 'Z', 'T', 'G'].includes(axis)) {
        axes[axis] = data[axis];
      }
    });
    this.simulateGroupMovement(axes);
  }

  handleHome() {
    console.log('🏠 Homing all axes');
    this.currentPosition = { X: 0, Y: 0, Z: 0, T: 0, G: 0 };
    this.sendResponse('HOMED');
  }

  handleZero() {
    console.log('0️⃣ Zeroing all axes');
    this.currentPosition = { X: 0, Y: 0, Z: 0, T: 0, G: 0 };
    this.sendResponse('ZEROED');
  }

  handleStop() {
    console.log('⏹️ Emergency stop');
    this.isRunning = false;
    this.commandQueue = [];
    this.sendResponse('STOPPED');
  }

  handlePause() {
    console.log('⏸️ Pausing execution');
    this.isRunning = false;
    this.sendResponse('PAUSED');
  }

  handleResume() {
    console.log('▶️ Resuming execution');
    this.isRunning = true;
    this.sendResponse('RESUMED');
  }

  handleSetSpeed(data) {
    console.log('⚡ Setting speeds:', data);
    Object.keys(data).forEach(axis => {
      if (['X', 'Y', 'Z', 'T', 'G'].includes(axis)) {
        this.speed[axis] = data[axis];
      }
    });
    this.sendResponse('SPEED_SET');
  }

  simulateMovement(axis, steps, feedrate = null) {
    setTimeout(() => {
      this.currentPosition[axis] += steps;
      console.log(`✅ ${axis} moved to position: ${this.currentPosition[axis]}`);
      this.sendResponse(`${axis}_MOVED:${this.currentPosition[axis]}`);
    }, 100);
  }

  simulateGroupMovement(axes) {
    setTimeout(() => {
      Object.keys(axes).forEach(axis => {
        this.currentPosition[axis] += axes[axis];
      });
      console.log('✅ Group movement completed:', this.currentPosition);
      this.sendResponse('GROUP_MOVED:' + JSON.stringify(this.currentPosition));
    }, 200);
  }

  sendResponse(message) {
    if (this.connected && this.ws) {
      this.ws.send(message);
      console.log('📤 Sent response:', message);
    }
  }

  sendStatus() {
    const status = {
      type: 'status',
      connected: this.connected,
      position: this.currentPosition,
      speed: this.speed,
      isRunning: this.isRunning,
      queueLength: this.commandQueue.length
    };
    
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify(status));
      console.log('📊 Sent status:', status);
    }
  }

  startStatusUpdates() {
    setInterval(() => {
      if (this.connected) {
        this.sendStatus();
      }
    }, 5000);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

function runSimulator() {
  console.log('🤖 ESP32 Simulator Starting...');
  console.log('================================');
  
  const simulator = new ESP32Simulator();
  
  simulator.connect();
  simulator.startStatusUpdates();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down simulator...');
    simulator.disconnect();
    process.exit(0);
  });
}

if (require.main === module) {
  runSimulator();
}

module.exports = ESP32Simulator;