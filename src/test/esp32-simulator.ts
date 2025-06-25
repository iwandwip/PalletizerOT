import http from 'http'

interface ScriptData {
  id: string
  commands: string[]
  rawLines?: string[]
  armId?: string
  format?: 'msl' | 'raw'
}

interface SimulatorStatus {
  esp32Connected: boolean
  hasScript: boolean
  isRunning: boolean
  isPaused: boolean
  currentCommandIndex: number
  totalCommands: number
  scriptId: string | null
  lastPoll: number
  connectedAxes: number
  efficiency: number
}

class ESP32Simulator {
  private serverHost: string
  private serverPort: number
  
  // Dual arm support
  private arm1Script: ScriptData | null
  private arm2Script: ScriptData | null
  private arm1Running: boolean
  private arm2Running: boolean
  private arm1Paused: boolean
  private arm2Paused: boolean
  private arm1CommandIndex: number
  private arm2CommandIndex: number
  
  private intervalId: NodeJS.Timeout | null
  private pollIntervalId: NodeJS.Timeout | null
  private executionIntervals: Map<string, NodeJS.Timeout>

  constructor(serverHost = 'localhost', serverPort = 3006) {
    this.serverHost = serverHost
    this.serverPort = serverPort
    
    // Initialize dual arm states
    this.arm1Script = null
    this.arm2Script = null
    this.arm1Running = false
    this.arm2Running = false
    this.arm1Paused = false
    this.arm2Paused = false
    this.arm1CommandIndex = 0
    this.arm2CommandIndex = 0
    
    this.intervalId = null
    this.pollIntervalId = null
    this.executionIntervals = new Map()

    console.log(`🤖 ESP32 Dual-Arm Simulator initialized`)
    console.log(`🎯 Target server: http://${this.serverHost}:${this.serverPort}`)
    console.log(`🦾 Supporting: Arm 1 & Arm 2`)
  }

  start() {
    console.log('🚀 Starting ESP32 Dual-Arm Simulator...')
    
    // Send startup notification
    const startupMessage = {
      timestamp: Date.now(),
      level: 'INFO',
      source: 'ESP32-SIMULATOR',
      message: '🤖 ESP32 Dual-Arm Simulator Started - Connecting to server...'
    }
    this.sendDebugMessage(startupMessage)
    
    this.startPolling()
    console.log('✅ Simulator started - Polling for scripts...')
  }

  stop() {
    console.log('🛑 Stopping ESP32 Simulator...')
    
    // Send shutdown notification
    const shutdownMessage = {
      timestamp: Date.now(),
      level: 'WARN',
      source: 'ESP32-SIMULATOR',
      message: '🛑 ESP32 Dual-Arm Simulator Shutdown - Disconnecting from server'
    }
    this.sendDebugMessage(shutdownMessage)
    
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId)
      this.pollIntervalId = null
    }
    
    // Stop all execution intervals
    this.executionIntervals.forEach((interval) => {
      clearInterval(interval)
    })
    this.executionIntervals.clear()
  }

  private startPolling() {
    // Poll for scripts every 2 seconds
    this.pollIntervalId = setInterval(() => {
      this.pollForScript()
    }, 2000)
    
    // Initial poll
    this.pollForScript()
  }

  private async pollForScript() {
    const options = {
      hostname: this.serverHost,
      port: this.serverPort,
      path: '/api/script/poll',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          if (response.hasNewScript) {
            this.handleNewScript(response)
          }
          
          // Check if we should start execution
          if (response.shouldStart) {
            const armId = response.armId || 'arm1'
            if (armId === 'arm1' && !this.arm1Running) {
              this.startExecution('arm1')
            } else if (armId === 'arm2' && !this.arm2Running) {
              this.startExecution('arm2')
            }
          }
        } catch (error) {
          console.error('❌ Error parsing poll response:', error)
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ Poll request error:', error.message)
    })

    req.end()
  }

  private handleNewScript(response: any) {
    const scriptData: ScriptData = {
      id: response.scriptId,
      commands: response.commands || [],
      rawLines: response.rawLines,
      armId: response.armId || 'arm1',
      format: response.format || 'msl'
    }

    console.log(`📥 New script received for ${scriptData.armId}:`)
    console.log(`   - ID: ${scriptData.id}`)
    console.log(`   - Format: ${scriptData.format}`)
    console.log(`   - Commands: ${scriptData.commands.length}`)
    
    // Show preview of commands
    if (scriptData.commands.length > 0) {
      console.log(`   - Preview:`)
      const previewCommands = scriptData.commands.slice(0, 3)
      previewCommands.forEach((cmd, index) => {
        console.log(`     ${index + 1}. ${cmd}`)
      })
      if (scriptData.commands.length > 3) {
        console.log(`     ... and ${scriptData.commands.length - 3} more commands`)
      }
    }
    
    // Show raw lines if available
    if (scriptData.rawLines && scriptData.rawLines.length > 0) {
      console.log(`   - Raw Script Lines: ${scriptData.rawLines.length}`)
      const previewLines = scriptData.rawLines.slice(0, 2)
      previewLines.forEach((line, index) => {
        console.log(`     ${index + 1}. ${line.trim()}`)
      })
      if (scriptData.rawLines.length > 2) {
        console.log(`     ... and ${scriptData.rawLines.length - 2} more lines`)
      }
    }
    
    if (scriptData.armId === 'arm2') {
      this.arm2Script = scriptData
      this.arm2CommandIndex = 0
    } else {
      this.arm1Script = scriptData
      this.arm1CommandIndex = 0
    }
  }

  private startExecution(armId: string) {
    const isArm1 = armId === 'arm1'
    const script = isArm1 ? this.arm1Script : this.arm2Script
    
    if (!script) {
      console.log(`⚠️ No script loaded for ${armId}`)
      return
    }

    console.log(`▶️ Starting execution for ${armId}`)
    
    if (isArm1) {
      this.arm1Running = true
      this.arm1Paused = false
    } else {
      this.arm2Running = true
      this.arm2Paused = false
    }

    // Clear any existing execution interval for this arm
    const existingInterval = this.executionIntervals.get(armId)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    // Simulate command execution
    const interval = setInterval(() => {
      this.executeNextCommand(armId)
    }, 1000) // Execute one command per second

    this.executionIntervals.set(armId, interval)
  }

  private executeNextCommand(armId: string) {
    const isArm1 = armId === 'arm1'
    const script = isArm1 ? this.arm1Script : this.arm2Script
    const currentIndex = isArm1 ? this.arm1CommandIndex : this.arm2CommandIndex
    const isRunning = isArm1 ? this.arm1Running : this.arm2Running
    const isPaused = isArm1 ? this.arm1Paused : this.arm2Paused
    
    if (!script || !isRunning || isPaused) {
      return
    }

    const totalCommands = script.commands.length || 0
    
    if (currentIndex >= totalCommands) {
      console.log(`✅ ${armId} execution completed`)
      this.stopExecution(armId)
      return
    }

    const command = script.commands[currentIndex]
    console.log(`🔄 ${armId} [${currentIndex + 1}/${totalCommands}] Executing: ${command}`)
    
    // Send execution update
    this.sendExecutionUpdate(armId, currentIndex, command)
    
    // Increment command index
    if (isArm1) {
      this.arm1CommandIndex++
    } else {
      this.arm2CommandIndex++
    }
  }

  private sendExecutionUpdate(armId: string, commandIndex: number, command: string) {
    const debugMessage = {
      timestamp: Date.now(),
      level: 'INFO',
      source: `ESP32-${armId}`,
      message: `🔄 [${commandIndex + 1}/${this.getTotalCommands(armId)}] Executing: ${command}`
    }

    const postData = JSON.stringify(debugMessage)

    const options = {
      hostname: this.serverHost,
      port: this.serverPort,
      path: '/api/debug',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = http.request(options, (res) => {
      res.on('data', () => {})
      res.on('end', () => {})
    })

    req.on('error', () => {})
    req.write(postData)
    req.end()
  }

  private getTotalCommands(armId: string): number {
    const script = armId === 'arm1' ? this.arm1Script : this.arm2Script
    return script?.commands.length || 0
  }

  pauseExecution(armId: string) {
    if (armId === 'arm1') {
      this.arm1Paused = true
      console.log('⏸️ Arm 1 execution paused')
    } else {
      this.arm2Paused = true
      console.log('⏸️ Arm 2 execution paused')
    }
  }

  resumeExecution(armId: string) {
    if (armId === 'arm1' && this.arm1Script) {
      this.arm1Paused = false
      console.log('▶️ Arm 1 execution resumed')
    } else if (armId === 'arm2' && this.arm2Script) {
      this.arm2Paused = false
      console.log('▶️ Arm 2 execution resumed')
    }
  }

  stopExecution(armId: string) {
    const interval = this.executionIntervals.get(armId)
    if (interval) {
      clearInterval(interval)
      this.executionIntervals.delete(armId)
    }

    if (armId === 'arm1') {
      this.arm1Running = false
      this.arm1Paused = false
      this.arm1CommandIndex = 0
      console.log('⏹️ Arm 1 execution stopped')
    } else {
      this.arm2Running = false
      this.arm2Paused = false
      this.arm2CommandIndex = 0
      console.log('⏹️ Arm 2 execution stopped')
    }

    // Send completion message
    const debugMessage = {
      timestamp: Date.now(),
      level: 'INFO',
      source: `ESP32-${armId}`,
      message: `✅ EXECUTION COMPLETED for ${armId}`
    }

    this.sendDebugMessage(debugMessage)
  }

  private sendDebugMessage(message: any) {
    const postData = JSON.stringify(message)

    const options = {
      hostname: this.serverHost,
      port: this.serverPort,
      path: '/api/debug',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = http.request(options, (res) => {
      res.on('data', () => {})
      res.on('end', () => {})
    })

    req.on('error', () => {})
    req.write(postData)
    req.end()
  }

  // Get current status for debugging
  getStatus(): SimulatorStatus {
    return {
      esp32Connected: true,
      hasScript: !!(this.arm1Script || this.arm2Script),
      isRunning: this.arm1Running || this.arm2Running,
      isPaused: this.arm1Paused || this.arm2Paused,
      currentCommandIndex: Math.max(this.arm1CommandIndex, this.arm2CommandIndex),
      totalCommands: Math.max(this.getTotalCommands('arm1'), this.getTotalCommands('arm2')),
      scriptId: this.arm1Script?.id || this.arm2Script?.id || null,
      lastPoll: Date.now(),
      connectedAxes: 5,
      efficiency: 100
    }
  }

  // Command line interface
  handleCommand(command: string) {
    const [cmd, ...args] = command.trim().split(' ')
    
    switch (cmd) {
      case 'start':
        const armToStart = args[0] || 'arm1'
        this.startExecution(armToStart)
        break
      case 'pause':
        const armToPause = args[0] || 'arm1'
        this.pauseExecution(armToPause)
        break
      case 'resume':
        const armToResume = args[0] || 'arm1'
        this.resumeExecution(armToResume)
        break
      case 'stop':
        const armToStop = args[0] || 'arm1'
        this.stopExecution(armToStop)
        break
      case 'status':
        console.log('📊 Current Status:')
        console.log(`   Arm 1: ${this.arm1Running ? 'Running' : 'Stopped'} - Command ${this.arm1CommandIndex}/${this.getTotalCommands('arm1')}`)
        console.log(`   Arm 2: ${this.arm2Running ? 'Running' : 'Stopped'} - Command ${this.arm2CommandIndex}/${this.getTotalCommands('arm2')}`)
        break
      case 'help':
        console.log('📚 Available commands:')
        console.log('   start [arm1|arm2] - Start execution')
        console.log('   pause [arm1|arm2] - Pause execution')
        console.log('   resume [arm1|arm2] - Resume execution')
        console.log('   stop [arm1|arm2] - Stop execution')
        console.log('   status - Show current status')
        console.log('   help - Show this help')
        break
      default:
        console.log('❓ Unknown command. Type "help" for available commands.')
    }
  }
}

// Start the simulator
const simulator = new ESP32Simulator()
simulator.start()

// Handle command line input
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  
  let inputBuffer = ''
  
  process.stdin.on('data', (key) => {
    if (key === '\u0003') { // Ctrl+C
      process.exit()
    } else if (key === '\r' || key === '\n') { // Enter
      if (inputBuffer.trim()) {
        simulator.handleCommand(inputBuffer)
        inputBuffer = ''
      }
      process.stdout.write('\n> ')
    } else if (key === '\u007f') { // Backspace
      if (inputBuffer.length > 0) {
        inputBuffer = inputBuffer.slice(0, -1)
        process.stdout.write('\b \b')
      }
    } else {
      inputBuffer += key
      process.stdout.write(key)
    }
  })
  
  console.log('\n💡 Type "help" for available commands')
  process.stdout.write('> ')
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ESP32 Dual-Arm Simulator...')
  simulator.stop()
  process.exit(0)
})

export default ESP32Simulator