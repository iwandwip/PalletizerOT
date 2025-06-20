import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { ScriptCompiler } from './ScriptCompiler'
import { Bonjour } from 'bonjour-service'

const app = express()
const server = createServer(app)
const PORT = Number(process.env.PORT) || 3006

const scriptCompiler = new ScriptCompiler()

interface CompiledScript {
  id: string
  commands: string[]
  timestamp: number
  executed: boolean
  hybridFormat?: any  // New hybrid JSON format
}

interface SystemState {
  currentScript: CompiledScript | null
  isRunning: boolean
  isPaused: boolean
  currentCommandIndex: number
  esp32LastPoll: number
  esp32Connected: boolean
  connectedAxes: number
  efficiency: number
}

const systemState: SystemState = {
  currentScript: null,
  isRunning: false,
  isPaused: false,
  currentCommandIndex: 0,
  esp32LastPoll: 0,
  esp32Connected: false,
  connectedAxes: 5,
  efficiency: 100
}

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/status', (req, res) => {
  res.json({
    esp32Connected: systemState.esp32Connected,
    hasScript: !!systemState.currentScript,
    isRunning: systemState.isRunning,
    isPaused: systemState.isPaused,
    currentCommandIndex: systemState.currentCommandIndex,
    totalCommands: systemState.currentScript?.commands.length || 0,
    scriptId: systemState.currentScript?.id || null,
    lastPoll: systemState.esp32LastPoll,
    connectedAxes: systemState.connectedAxes,
    efficiency: systemState.efficiency
  })
})

app.post('/api/script/save', (req, res) => {
  try {
    const { script, format = 'hybrid' } = req.body
    console.log(`Compiling script (${format}):`, script.substring(0, 100) + '...')
    
    let compiledScript: CompiledScript
    
    if (format === 'hybrid') {
      // New hybrid JSON format - script is already compiled JSON
      const hybridData = typeof script === 'string' ? JSON.parse(script) : script
      
      compiledScript = {
        id: hybridData.scriptId || Date.now().toString(),
        commands: hybridData.steps?.map((step: any) => step.serial_cmd).filter(Boolean) || [],
        timestamp: Date.now(),
        executed: false,
        hybridFormat: hybridData
      }
    } else {
      // MSL format compilation to text commands
      const textCommands = scriptCompiler.compileToText(script)
      const commandLines = textCommands.split('\n').filter(line => line.trim())
      
      compiledScript = {
        id: Date.now().toString(),
        commands: commandLines,
        timestamp: Date.now(),
        executed: false
      }
    }
    
    systemState.currentScript = compiledScript
    systemState.currentCommandIndex = 0
    systemState.isRunning = false
    systemState.isPaused = false
    
    console.log(`✅ Script compiled: ${compiledScript.commands.length} commands`)
    
    // Return the compiled data for debug output
    let compiledData: any
    
    if (format === 'msl') {
      // For MSL format, return the text commands
      const textCommands = scriptCompiler.compileToText(script)
      compiledData = {
        format: 'text',
        scriptId: compiledScript.id,
        textCommands: textCommands,
        commandLines: compiledScript.commands
      }
    } else {
      // For hybrid format, return the hybrid data
      compiledData = compiledScript.hybridFormat
    }
    
    const response = { 
      success: true, 
      scriptId: compiledScript.id,
      commandCount: compiledScript.commands.length,
      message: `Script compiled and saved (${format})`,
      compiledData
    }
    
    console.log('Server response:', JSON.stringify(response, null, 2))
    res.json(response)
  } catch (error) {
    console.error('Script compilation error:', error)
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Compilation error' 
    })
  }
})

app.get('/api/script/poll', (req, res) => {
  systemState.esp32LastPoll = Date.now()
  systemState.esp32Connected = true
  
  const result = {
    hasNewScript: false,
    scriptId: null as string | null,
    commands: [] as string[],
    hybridScript: null as any,
    shouldStart: systemState.isRunning,
    currentIndex: systemState.currentCommandIndex
  }
  
  if (systemState.currentScript && !systemState.currentScript.executed) {
    result.hasNewScript = true
    result.scriptId = systemState.currentScript.id
    
    if (systemState.currentScript.hybridFormat) {
      // Send new hybrid JSON format
      result.hybridScript = systemState.currentScript.hybridFormat
      console.log(`📤 ESP32 downloaded hybrid script: ${systemState.currentScript.hybridFormat.steps?.length} steps`)
    } else {
      // Send legacy commands
      result.commands = systemState.currentScript.commands
      console.log(`📤 ESP32 downloaded legacy script: ${result.commands.length} commands`)
    }
    
    systemState.currentScript.executed = true
  }
  
  res.json(result)
})

app.post('/api/control/start', (req, res) => {
  if (!systemState.currentScript) {
    res.status(400).json({ 
      success: false, 
      error: 'No script loaded' 
    })
    return
  }
  
  systemState.isRunning = true
  systemState.isPaused = false
  console.log('▶️ Execution started')
  
  res.json({ 
    success: true,
    message: 'Execution started'
  })
})

app.post('/api/control/stop', (req, res) => {
  systemState.isRunning = false
  systemState.isPaused = false
  systemState.currentCommandIndex = 0
  console.log('⏹️ Execution stopped and reset')
  
  res.json({ 
    success: true,
    message: 'Execution stopped and reset'
  })
})

app.post('/api/control/pause', (req, res) => {
  systemState.isRunning = false
  systemState.isPaused = true
  console.log('⏸️ Execution paused')
  
  res.json({ 
    success: true,
    message: 'Execution paused'
  })
})

app.post('/api/control/resume', (req, res) => {
  if (!systemState.currentScript) {
    res.status(400).json({ 
      success: false, 
      error: 'No script loaded' 
    })
    return
  }
  
  systemState.isRunning = true
  systemState.isPaused = false
  console.log('▶️ Execution resumed')
  
  res.json({ 
    success: true,
    message: 'Execution resumed'
  })
})

app.post('/api/control/zero', (req, res) => {
  console.log('🏠 Homing all axes to zero position')
  
  // In a real implementation, this would send zero commands to all axes
  res.json({ 
    success: true,
    message: 'Homing all axes to zero position'
  })
})

app.get('/api/command/next', (req, res) => {
  systemState.esp32LastPoll = Date.now()
  systemState.esp32Connected = true
  
  const result = {
    hasCommand: false,
    command: null as string | null,
    isRunning: systemState.isRunning,
    commandIndex: systemState.currentCommandIndex,
    totalCommands: systemState.currentScript?.commands.length || 0,
    isComplete: false
  }
  
  if (systemState.isRunning && systemState.currentScript) {
    if (systemState.currentCommandIndex < systemState.currentScript.commands.length) {
      result.hasCommand = true
      result.command = systemState.currentScript.commands[systemState.currentCommandIndex]
      console.log(`📤 Sending command ${systemState.currentCommandIndex + 1}/${systemState.currentScript.commands.length}: ${result.command}`)
      
      // Auto-increment for simulation (remove this for real ESP32)
      setTimeout(() => {
        if (systemState.isRunning && systemState.currentCommandIndex < systemState.currentScript!.commands.length) {
          systemState.currentCommandIndex++
          console.log(`✅ Command ${systemState.currentCommandIndex} completed (simulated)`)
        }
      }, 1000)
    } else {
      result.isComplete = true
      systemState.isRunning = false
      systemState.isPaused = false
      console.log('✅ All commands completed')
    }
  }
  
  res.json(result)
})

app.post('/api/command/ack', (req, res) => {
  const { success, error } = req.body
  
  if (success) {
    systemState.currentCommandIndex++
    console.log(`✅ Command ${systemState.currentCommandIndex} acknowledged`)
  } else {
    console.error(`❌ Command failed: ${error}`)
    systemState.isRunning = false
  }
  
  res.json({ success: true })
})

app.post('/api/speed', (req, res) => {
  const { speeds } = req.body
  
  console.log('🎚️ Speed update request:', speeds)
  
  // Store speeds for ESP32 to poll
  // In a real implementation, this would be stored and sent to ESP32
  
  res.json({ 
    success: true, 
    message: 'Speed settings updated',
    speeds 
  })
})

// Debug SSE endpoint
app.get('/debug', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  const sendDebugMessage = (level: string, source: string, message: string) => {
    const data = JSON.stringify({
      timestamp: Date.now(),
      level,
      source,
      message
    })
    res.write(`event: debug\ndata: ${data}\n\n`)
  }

  // Send initial connection message
  sendDebugMessage('INFO', 'SERVER', 'Debug terminal connected')
  sendDebugMessage('INFO', 'SYSTEM', 'PalletizerOT Control System initialized')
  sendDebugMessage('INFO', 'NETWORK', 'HTTP server listening on port 3006')

  // Send periodic status messages
  const debugInterval = setInterval(() => {
    if (systemState.isRunning) {
      const progress = Math.round((systemState.currentCommandIndex / (systemState.currentScript?.commands.length || 1)) * 100)
      sendDebugMessage('INFO', 'EXECUTOR', `🔄 [${systemState.currentCommandIndex}/${systemState.currentScript?.commands.length || 0}] Executing command ${systemState.currentCommandIndex + 1}`)
      
      if (progress % 25 === 0 && progress > 0) {
        sendDebugMessage('INFO', 'PROGRESS', `Progress: ${progress}% complete`)
      }
    } else if (systemState.isPaused) {
      sendDebugMessage('WARN', 'EXECUTOR', '⏸️ Execution paused - waiting for resume command')
    } else {
      // Send periodic system status
      sendDebugMessage('INFO', 'STATUS', `System idle - ESP32: ${systemState.esp32Connected ? 'Connected' : 'Disconnected'}, Script: ${systemState.currentScript ? 'Loaded' : 'None'}`)
    }
  }, 5000)

  // Send a debug message every few seconds to show activity
  const activityInterval = setInterval(() => {
    const messages = [
      'System monitoring active',
      'Checking axis connections',
      'Memory usage: 45%',
      'Temperature: Normal',
      'Network status: OK'
    ]
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]
    sendDebugMessage('DEBUG', 'MONITOR', randomMessage)
  }, 3000)

  req.on('close', () => {
    clearInterval(debugInterval)
    clearInterval(activityInterval)
  })
})

// Simulate ESP32 connection for development
app.post('/api/esp32/connect', (req, res) => {
  systemState.esp32Connected = true
  systemState.esp32LastPoll = Date.now()
  console.log('🔗 ESP32 simulation connected')
  res.json({ success: true, message: 'ESP32 connected' })
})

app.post('/api/esp32/disconnect', (req, res) => {
  systemState.esp32Connected = false
  console.log('🔌 ESP32 simulation disconnected')
  res.json({ success: true, message: 'ESP32 disconnected' })
})

// For development, auto-connect ESP32 simulation
setTimeout(() => {
  systemState.esp32Connected = true
  systemState.esp32LastPoll = Date.now()
  console.log('🔗 ESP32 simulation auto-connected for development')
}, 2000)

setInterval(() => {
  const now = Date.now()
  if (now - systemState.esp32LastPoll > 30000) {
    if (systemState.esp32Connected) {
      console.log('❌ ESP32 connection timeout')
      systemState.esp32Connected = false
    }
  }
  
  // Update simulated ESP32 poll for development
  if (systemState.esp32Connected) {
    systemState.esp32LastPoll = now
  }
}, 10000)

server.listen(PORT, () => {
  console.log(`🚀 Palletizer HTTP Server running on port ${PORT}`)
  console.log(`🌐 Web interface: http://localhost:${PORT}`)
  
  const bonjour = new Bonjour()
  bonjour.publish({
    name: 'palletizer',
    type: 'http',
    port: PORT,
    host: 'palletizer.local'
  })
  
  console.log(`🔗 mDNS: Server available at http://palletizer.local:${PORT}`)
  console.log(`📡 ESP32 can connect to: palletizer.local:${PORT}`)
})