const http = require('http');
const fs = require('fs');

class ESP32Simulator {
  constructor(serverHost = 'localhost', serverPort = 3001) {
    this.serverHost = serverHost;
    this.serverPort = serverPort;
    this.isRunning = false;
    this.currentScript = null;
    this.currentCommandIndex = 0;
    this.scriptStorage = new Map();
    this.lastPollTime = 0;
    this.pollInterval = 2000;
    this.commandInterval = 1000;
    this.lastCommandTime = 0;
  }

  start() {
    console.log('🤖 ESP32 Simulator Starting...');
    console.log('================================');
    console.log(`📡 Server: ${this.serverHost}:${this.serverPort}`);
    
    this.startPollingLoop();
    this.startCommandLoop();
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down simulator...');
      process.exit(0);
    });
  }

  startPollingLoop() {
    setInterval(() => {
      this.pollForScript();
    }, this.pollInterval);
  }

  startCommandLoop() {
    setInterval(() => {
      if (this.isRunning) {
        this.processNextCommand();
      }
    }, this.commandInterval);
  }

  async pollForScript() {
    try {
      const response = await this.httpGet('/api/script/poll');
      
      if (response.hasNewScript) {
        console.log(`📥 New script received: ${response.scriptId}`);
        console.log(`📋 Commands: ${response.commands.length}`);
        
        this.scriptStorage.set(response.scriptId, response.commands);
        this.currentScript = response.commands;
        this.currentCommandIndex = 0;
        
        console.log('💾 Script saved to local storage');
      }
      
      if (response.shouldStart && !this.isRunning) {
        this.isRunning = true;
        console.log('▶️ Execution started');
      } else if (!response.shouldStart && this.isRunning) {
        this.isRunning = false;
        console.log('⏸️ Execution paused');
      }
      
    } catch (error) {
      console.error('❌ Poll error:', error.message);
    }
  }

  async processNextCommand() {
    try {
      const response = await this.httpGet('/api/command/next');
      
      if (response.hasCommand) {
        console.log(`📤 Command ${response.commandIndex + 1}/${response.totalCommands}: ${response.command}`);
        
        const result = await this.simulateArduinoExecution(response.command);
        
        await this.httpPost('/api/command/ack', {
          success: result.success,
          error: result.error
        });
        
        if (result.success) {
          console.log(`✅ Command completed: ${response.command}`);
        } else {
          console.log(`❌ Command failed: ${result.error}`);
          this.isRunning = false;
        }
        
      } else if (response.isComplete) {
        this.isRunning = false;
        console.log('🏁 All commands completed');
      }
      
    } catch (error) {
      console.error('❌ Command processing error:', error.message);
    }
  }

  async simulateArduinoExecution(command) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (command.startsWith('M') || command.startsWith('G')) {
          console.log(`🎯 Simulating motor movement: ${command}`);
          resolve({ success: true });
        } else if (command === 'H') {
          console.log('🏠 Simulating homing');
          resolve({ success: true });
        } else if (command === 'Z') {
          console.log('0️⃣ Simulating zero');
          resolve({ success: true });
        } else if (command.startsWith('V')) {
          console.log('⚡ Simulating speed change');
          resolve({ success: true });
        } else {
          console.log(`❓ Unknown command: ${command}`);
          resolve({ success: false, error: 'Unknown command' });
        }
      }, Math.random() * 500 + 200);
    });
  }

  httpGet(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.serverHost,
        port: this.serverPort,
        path: path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  httpPost(path, data) {
    return new Promise((resolve, reject) => {
      const jsonData = JSON.stringify(data);
      
      const options = {
        hostname: this.serverHost,
        port: this.serverPort,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(jsonData)
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseData));
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(jsonData);
      req.end();
    });
  }
}

function runSimulator() {
  const simulator = new ESP32Simulator();
  simulator.start();
}

if (require.main === module) {
  runSimulator();
}

module.exports = ESP32Simulator;