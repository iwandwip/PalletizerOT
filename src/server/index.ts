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
}

interface SystemState {
  currentScript: CompiledScript | null
  isRunning: boolean
  currentCommandIndex: number
  esp32LastPoll: number
  esp32Connected: boolean
}

const systemState: SystemState = {
  currentScript: null,
  isRunning: false,
  currentCommandIndex: 0,
  esp32LastPoll: 0,
  esp32Connected: false
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
    currentCommandIndex: systemState.currentCommandIndex,
    totalCommands: systemState.currentScript?.commands.length || 0,
    scriptId: systemState.currentScript?.id || null,
    lastPoll: systemState.esp32LastPoll
  })
})

app.post('/api/script/save', (req, res) => {
  try {
    const { script } = req.body
    console.log('Compiling script:', script.substring(0, 100) + '...')
    
    const commands = scriptCompiler.compileScript(script)
    
    const compiledScript: CompiledScript = {
      id: Date.now().toString(),
      commands: commands.map(cmd => `${cmd.type} ${JSON.stringify(cmd.data || {})}`),
      timestamp: Date.now(),
      executed: false
    }
    
    systemState.currentScript = compiledScript
    systemState.currentCommandIndex = 0
    systemState.isRunning = false
    
    console.log(`✅ Script compiled: ${commands.length} commands`)
    
    res.json({ 
      success: true, 
      scriptId: compiledScript.id,
      commandCount: commands.length,
      message: 'Script compiled and saved'
    })
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
    shouldStart: systemState.isRunning,
    currentIndex: systemState.currentCommandIndex
  }
  
  if (systemState.currentScript && !systemState.currentScript.executed) {
    result.hasNewScript = true
    result.scriptId = systemState.currentScript.id
    result.commands = systemState.currentScript.commands
    systemState.currentScript.executed = true
    console.log(`📤 ESP32 downloaded script: ${result.commands.length} commands`)
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
  console.log('▶️ Execution started')
  
  res.json({ 
    success: true,
    message: 'Execution started'
  })
})

app.post('/api/control/stop', (req, res) => {
  systemState.isRunning = false
  systemState.currentCommandIndex = 0
  console.log('⏹️ Execution stopped and reset')
  
  res.json({ 
    success: true,
    message: 'Execution stopped and reset'
  })
})

app.post('/api/control/pause', (req, res) => {
  systemState.isRunning = false
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
  console.log('▶️ Execution resumed')
  
  res.json({ 
    success: true,
    message: 'Execution resumed'
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
    } else {
      result.isComplete = true
      systemState.isRunning = false
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

setInterval(() => {
  const now = Date.now()
  if (now - systemState.esp32LastPoll > 30000) {
    if (systemState.esp32Connected) {
      console.log('❌ ESP32 connection timeout')
      systemState.esp32Connected = false
    }
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