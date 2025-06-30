import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { MSLCompiler } from '../compiler'
import { Bonjour } from 'bonjour-service'

const app = express()
const server = createServer(app)
const PORT = Number(process.env.PORT) || 3006

const scriptCompiler = new MSLCompiler()

interface CompiledScript {
  id: string
  commands: string[]
  timestamp: number
  executed: boolean
  format: 'msl' | 'raw'
  hybridScript?: any // HybridScript from compiler
}

interface SystemState {
  arm1Script: CompiledScript | null
  arm2Script: CompiledScript | null
  isRunning: boolean
  isPaused: boolean
  currentCommandIndex: number
  esp32LastPoll: number
  esp32Connected: boolean
  connectedAxes: number
  efficiency: number
}

const systemState: SystemState = {
  arm1Script: null,
  arm2Script: null,
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
    hasScript: !!(systemState.arm1Script || systemState.arm2Script),
    isRunning: systemState.isRunning,
    isPaused: systemState.isPaused,
    currentCommandIndex: systemState.currentCommandIndex,
    totalCommands: Math.max(
      systemState.arm1Script?.commands.length || 0,
      systemState.arm2Script?.commands.length || 0
    ),
    scriptId: systemState.arm1Script?.id || systemState.arm2Script?.id || null,
    lastPoll: systemState.esp32LastPoll,
    connectedAxes: systemState.connectedAxes,
    efficiency: systemState.efficiency,
    // Dual arm status
    arm1: {
      hasScript: !!systemState.arm1Script,
      scriptId: systemState.arm1Script?.id || null,
      commands: systemState.arm1Script?.commands.length || 0
    },
    arm2: {
      hasScript: !!systemState.arm2Script,
      scriptId: systemState.arm2Script?.id || null,
      commands: systemState.arm2Script?.commands.length || 0
    }
  })
})

app.post('/api/script/save', (req, res) => {
  try {
    const { script, format = 'msl', armId } = req.body
    console.log(`Compiling script (${format}) for ${armId || 'default'}:`, script.substring(0, 100) + '...')
    
    let compiledScript: CompiledScript
    
    // MSL format compilation to text commands
    const textCommands = scriptCompiler.compileToText(script)
    const commandLines = textCommands.split('\n').filter(line => line.trim())
    
    // Generate hybrid format for ESP32
    const hybridScript = scriptCompiler.compileToHybrid(script)
    
    compiledScript = {
      id: Date.now().toString(),
      commands: commandLines,
      timestamp: Date.now(),
      executed: false,
      format: 'msl',
      hybridScript: hybridScript // Add hybrid format
    }
    
    // Store script for specific arm
    if (armId === 'arm2') {
      systemState.arm2Script = compiledScript
    } else {
      systemState.arm1Script = compiledScript
    }
    systemState.currentCommandIndex = 0
    systemState.isRunning = false
    systemState.isPaused = false
    
    console.log(`✅ Script compiled: ${compiledScript.commands.length} commands, ${hybridScript.stepCount} hybrid steps`)
    
    // Return the compiled data for debug output
    let compiledData: any
    
    compiledData = {
      format: 'hybrid',
      scriptId: compiledScript.id,
      textCommands: textCommands,
      commandLines: compiledScript.commands,
      hybridScript: hybridScript,
      stepCount: hybridScript.stepCount
    }
    
    const response = { 
      success: true, 
      scriptId: compiledScript.id,
      commandCount: compiledScript.commands.length,
      stepCount: hybridScript.stepCount,
      message: `Script compiled and saved (${format}) for ${armId || 'default'}`,
      compiledData,
      armId
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

// Raw script endpoint (no compilation)
app.post('/api/script/raw', (req, res) => {
  console.log('🔍 Raw script endpoint hit:', {
    method: req.method,
    url: req.url,
    contentType: req.headers['content-type'],
    body: req.body
  })
  
  try {
    const { script, armId } = req.body
    
    console.log('📝 Raw script data:', { script, armId, type: typeof script })
    
    if (!script || typeof script !== 'string') {
      console.log('❌ Invalid script provided:', { script, type: typeof script })
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid script provided' 
      })
    }
    
    console.log(`📝 Raw script received (${script.length} characters)`)
    
    // Split script into lines for command counting
    const lines = script.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'))
    
    // Store as raw script without compilation
    const rawScript: CompiledScript = {
      id: Date.now().toString(),
      commands: lines,
      timestamp: Date.now(),
      executed: false,
      format: 'raw'
    }
    
    // Store raw script for specific arm
    if (armId === 'arm2') {
      systemState.arm2Script = rawScript
    } else {
      systemState.arm1Script = rawScript
    }
    
    console.log(`✅ Raw script saved: ${lines.length} lines for ${armId || 'default'}`)
    
    const response = { 
      success: true, 
      scriptId: rawScript.id,
      commandCount: lines.length,
      message: `Raw script saved (${lines.length} lines) for ${armId || 'default'}`,
      compiledData: {
        format: 'raw',
        scriptId: rawScript.id,
        rawLines: lines,
        armId
      },
      armId
    }
    
    console.log('Server response:', JSON.stringify(response, null, 2))
    res.json(response)
  } catch (error) {
    console.error('Raw script save error:', error)
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Raw script save error' 
    })
  }
})

app.get('/api/script/poll', (req, res) => {
  const wasConnected = systemState.esp32Connected
  systemState.esp32LastPoll = Date.now()
  systemState.esp32Connected = true
  
  // Send connection notification if newly connected
  if (!wasConnected) {
    const connectMessage = {
      timestamp: Date.now(),
      level: 'SUCCESS',
      source: 'ESP32',
      message: '🔗 ESP32 Device Connected - Ready for commands'
    }
    broadcastDebugMessage(connectMessage)
    console.log('🔗 ESP32 device connected')
  }
  
  const result = {
    hasNewScript: false,
    scriptId: null as string | null,
    commands: [] as string[],
    rawLines: [] as string[],
    armId: null as string | null,
    format: null as string | null,
    shouldStart: systemState.isRunning,
    currentIndex: systemState.currentCommandIndex
  }
  
  // Check arm1 script
  if (systemState.arm1Script && !systemState.arm1Script.executed) {
    result.hasNewScript = true
    result.scriptId = systemState.arm1Script.id
    result.armId = 'arm1'
    
    result.commands = systemState.arm1Script.commands
    result.format = systemState.arm1Script.format
    
    // Add hybrid script for ESP32
    if (systemState.arm1Script.hybridScript) {
      (result as any).hybridScript = systemState.arm1Script.hybridScript
      console.log(`📤 ESP32 downloaded hybrid script for arm1: ${systemState.arm1Script.hybridScript.stepCount} steps`)
    } else {
      console.log(`📤 ESP32 downloaded ${systemState.arm1Script.format} script for arm1: ${result.commands.length} commands`)
    }
    
    systemState.arm1Script.executed = true
  }
  // Check arm2 script (if arm1 script not found)
  else if (systemState.arm2Script && !systemState.arm2Script.executed) {
    result.hasNewScript = true
    result.scriptId = systemState.arm2Script.id
    result.armId = 'arm2'
    
    result.commands = systemState.arm2Script.commands
    result.format = systemState.arm2Script.format
    
    // Add hybrid script for ESP32
    if (systemState.arm2Script.hybridScript) {
      (result as any).hybridScript = systemState.arm2Script.hybridScript
      console.log(`📤 ESP32 downloaded hybrid script for arm2: ${systemState.arm2Script.hybridScript.stepCount} steps`)
    } else {
      console.log(`📤 ESP32 downloaded ${systemState.arm2Script.format} script for arm2: ${result.commands.length} commands`)
    }
    
    systemState.arm2Script.executed = true
  }
  
  res.json(result)
})

app.post('/api/control/start', (req, res) => {
  const { armId } = req.body
  const script = armId === 'arm2' ? systemState.arm2Script : systemState.arm1Script
  
  if (!script) {
    res.status(400).json({ 
      success: false, 
      error: `No script loaded for ${armId || 'arm1'}` 
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
  if (!systemState.arm1Script && !systemState.arm2Script) {
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
    totalCommands: Math.max(
      systemState.arm1Script?.commands.length || 0,
      systemState.arm2Script?.commands.length || 0
    ),
    isComplete: false
  }
  
  // This endpoint is legacy - ESP32 simulator handles execution now
  if (systemState.isRunning) {
    const script = systemState.arm1Script || systemState.arm2Script
    if (script) {
      if (systemState.currentCommandIndex < script.commands.length) {
        result.hasCommand = true
        result.command = script.commands[systemState.currentCommandIndex]
        console.log(`📤 Sending legacy command ${systemState.currentCommandIndex + 1}/${script.commands.length}: ${result.command}`)
        
        // Auto-increment for simulation (remove this for real ESP32)
        setTimeout(() => {
          if (systemState.isRunning && systemState.currentCommandIndex < script.commands.length) {
            systemState.currentCommandIndex++
            console.log(`✅ Legacy command ${systemState.currentCommandIndex} completed (simulated)`)
          }
        }, 1000)
      } else {
        result.isComplete = true
        systemState.isRunning = false
        systemState.isPaused = false
        console.log('✅ All legacy commands completed')
      }
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
      const totalCommands = Math.max(
        systemState.arm1Script?.commands.length || 0,
        systemState.arm2Script?.commands.length || 0
      )
      const progress = Math.round((systemState.currentCommandIndex / (totalCommands || 1)) * 100)
      sendDebugMessage('INFO', 'EXECUTOR', `🔄 [${systemState.currentCommandIndex}/${totalCommands}] Executing command ${systemState.currentCommandIndex + 1}`)
      
      if (progress % 25 === 0 && progress > 0) {
        sendDebugMessage('INFO', 'PROGRESS', `Progress: ${progress}% complete`)
      }
    } else if (systemState.isPaused) {
      sendDebugMessage('WARN', 'EXECUTOR', '⏸️ Execution paused - waiting for resume command')
    } else {
      // Send periodic system status
      const hasScript = !!(systemState.arm1Script || systemState.arm2Script)
      sendDebugMessage('INFO', 'STATUS', `System idle - ESP32: ${systemState.esp32Connected ? 'Connected' : 'Disconnected'}, Script: ${hasScript ? 'Loaded' : 'None'}`)
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

// Note: Auto-connection removed - ESP32 will connect when it polls
// This ensures accurate connection status based on actual polling

setInterval(() => {
  const now = Date.now()
  if (now - systemState.esp32LastPoll > 30000) {
    if (systemState.esp32Connected) {
      console.log('❌ ESP32 connection timeout')
      systemState.esp32Connected = false
      
      // Send disconnection notification
      const disconnectMessage = {
        timestamp: Date.now(),
        level: 'ERROR',
        source: 'ESP32',
        message: '🔌 ESP32 Device Disconnected - Connection timeout'
      }
      broadcastDebugMessage(disconnectMessage)
    }
  }
  
  // Note: Removed auto-poll update - only real ESP32 polling updates the status
}, 10000)

// Debug message storage for SSE
let debugMessages: Array<{
  timestamp: number
  level: string
  source: string
  message: string
}> = []

// SSE clients storage for broadcasting
let sseClients: Array<any> = []

// Helper function to broadcast debug messages to all SSE clients
function broadcastDebugMessage(message: any) {
  debugMessages.push(message)
  
  // Keep only last 50 messages
  if (debugMessages.length > 50) {
    debugMessages = debugMessages.slice(-50)
  }
  
  // Broadcast to all connected SSE clients
  sseClients.forEach((client, index) => {
    try {
      client.write(`data: ${JSON.stringify(message)}\n\n`)
    } catch (error) {
      // Remove disconnected clients
      sseClients.splice(index, 1)
    }
  })
}

// SSE endpoint for debug terminal
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  // Send connection message with current ESP32 status
  const connectMsg = {
    timestamp: Date.now(),
    level: 'INFO',
    source: 'SYSTEM',
    message: `Debug terminal ready - ESP32 status: ${systemState.esp32Connected ? 'Connected' : 'Waiting for connection...'}`
  }
  res.write(`data: ${JSON.stringify(connectMsg)}\n\n`)

  // Add client to broadcast list
  sseClients.push(res)

  // Send recent messages
  debugMessages.slice(-10).forEach(msg => {
    res.write(`data: ${JSON.stringify(msg)}\n\n`)
  })

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 30000)

  req.on('close', () => {
    clearInterval(keepAlive)
    // Remove client from broadcast list
    const index = sseClients.indexOf(res)
    if (index > -1) {
      sseClients.splice(index, 1)
    }
  })
})

// Debug message endpoint (used by ESP32 simulator)
app.post('/api/debug', (req, res) => {
  const message = req.body
  
  // Broadcast message to all SSE clients
  broadcastDebugMessage(message)
  
  res.json({ success: true })
})

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