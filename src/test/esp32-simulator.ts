import http from 'http'

interface ScriptData {
  id: string
  commands: string[]
  totalCommands: number
}

class ESP32Simulator {
  private serverHost: string
  private serverPort: number
  private isRunning: boolean
  private currentScript: ScriptData | null
  private currentCommandIndex: number
  private totalCommands: number
  private intervalId: NodeJS.Timeout | null

  constructor(serverHost = 'localhost', serverPort = 3006) {
    this.serverHost = serverHost
    this.serverPort = serverPort
    this.isRunning = false
    this.currentScript = null
    this.currentCommandIndex = 0
    this.totalCommands = 0
    this.intervalId = null

    console.log(`ESP32 Simulator initialized`)
    console.log(`Target server: http://${this.serverHost}:${this.serverPort}`)
  }

  start() {
    console.log('Starting ESP32 Simulator...')
    this.registerWithServer()
    this.startStatusReporting()
  }

  stop() {
    console.log('Stopping ESP32 Simulator...')
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private registerWithServer() {
    const postData = JSON.stringify({
      esp32Id: 'simulator-001',
      version: '1.0.0',
      capabilities: ['movement', 'scripting']
    })

    const options = {
      hostname: this.serverHost,
      port: this.serverPort,
      path: '/api/esp32/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        console.log('Registration response:', data)
      })
    })

    req.on('error', () => {
      console.log('Failed to register with server')
    })

    req.write(postData)
    req.end()
  }

  private startStatusReporting() {
    this.intervalId = setInterval(() => {
      this.reportStatus()
    }, 2000)
  }

  private reportStatus() {
    const status = {
      esp32Connected: true,
      hasScript: this.currentScript !== null,
      isRunning: this.isRunning,
      currentCommandIndex: this.currentCommandIndex,
      totalCommands: this.totalCommands,
      scriptId: this.currentScript?.id || null,
      lastPoll: Date.now()
    }

    const postData = JSON.stringify(status)

    const options = {
      hostname: this.serverHost,
      port: this.serverPort,
      path: '/api/esp32/status',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = http.request(options, (res) => {
      res.on('data', () => {
        // Handle response data if needed
      })
      res.on('end', () => {
        // Handle server response if needed
      })
    })

    req.on('error', () => {
      // Silently handle connection errors
    })

    req.write(postData)
    req.end()
  }

  executeScript(scriptData: ScriptData) {
    console.log(`Executing script: ${scriptData.id}`)
    this.currentScript = scriptData
    this.totalCommands = scriptData.totalCommands
    this.currentCommandIndex = 0
    this.isRunning = true

    // Simulate script execution
    const executeNextCommand = () => {
      if (this.currentCommandIndex < this.totalCommands && this.isRunning) {
        console.log(`Executing command ${this.currentCommandIndex + 1}/${this.totalCommands}`)
        this.currentCommandIndex++
        
        setTimeout(executeNextCommand, 1000) // 1 second per command
      } else {
        this.isRunning = false
        console.log('Script execution completed')
      }
    }

    executeNextCommand()
  }

  pauseExecution() {
    this.isRunning = false
    console.log('Script execution paused')
  }

  resumeExecution() {
    if (this.currentScript && this.currentCommandIndex < this.totalCommands) {
      this.isRunning = true
      console.log('Script execution resumed')
    }
  }

  stopExecution() {
    this.isRunning = false
    this.currentCommandIndex = 0
    this.currentScript = null
    this.totalCommands = 0
    console.log('Script execution stopped')
  }
}

// Start the simulator
const simulator = new ESP32Simulator()
simulator.start()

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down ESP32 Simulator...')
  simulator.stop()
  process.exit(0)
})

export default ESP32Simulator