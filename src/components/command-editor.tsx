'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Upload, Download, Play, Cpu, Loader2, MonitorSpeaker, Layers3 } from "lucide-react"
import { api } from "@/lib/api"
import { TextEditor } from "./editors"
import { useScriptData } from "@/hooks/useScriptData"

interface CompilationResult {
  success: boolean
  commands?: unknown[]
  error?: string
  commandCount?: number
}

interface CommandEditorProps {
  onNotification?: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void
  onCompileOutput?: (output: string) => void
  simulationMode?: boolean
  onSimulationModeChange?: (enabled: boolean) => void
}

export function CommandEditor({ 
  onNotification, 
  onCompileOutput, 
  simulationMode = false, 
  onSimulationModeChange 
}: CommandEditorProps) {
  const scriptData = useScriptData()
  
  // Active arm state
  const [activeArm, setActiveArm] = useState<1 | 2>(1)
  
  // Separate states for each arm - initialize from global store
  const [commandText1, setCommandText1] = useState(scriptData.arm1Script)
  const [commandText2, setCommandText2] = useState(scriptData.arm2Script)
  const [compilationResult1, setCompilationResult1] = useState<CompilationResult | null>(null)
  const [compilationResult2, setCompilationResult2] = useState<CompilationResult | null>(null)
  const [isProcessing1, setIsProcessing1] = useState(false)
  const [isProcessing2, setIsProcessing2] = useState(false)
  const [isExecuting1, setIsExecuting1] = useState(false)
  const [isExecuting2, setIsExecuting2] = useState(false)
  const [autoCompile1, setAutoCompile1] = useState(false)
  const [autoCompile2, setAutoCompile2] = useState(false)
  const [processingMode1, setProcessingMode1] = useState<'MSL' | 'RAW'>('MSL')
  const [processingMode2, setProcessingMode2] = useState<'MSL' | 'RAW'>('MSL')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Helper functions to get current arm state
  const getCurrentCommandText = () => activeArm === 1 ? commandText1 : commandText2
  const setCurrentCommandText = (text: string) => {
    if (activeArm === 1) {
      setCommandText1(text)
      scriptData.setArm1Script(text)
    } else {
      setCommandText2(text)
      scriptData.setArm2Script(text)
    }
  }
  const getCurrentCompilationResult = () => activeArm === 1 ? compilationResult1 : compilationResult2
  const setCurrentCompilationResult = (result: CompilationResult | null) => 
    activeArm === 1 ? setCompilationResult1(result) : setCompilationResult2(result)
  const getCurrentIsProcessing = () => activeArm === 1 ? isProcessing1 : isProcessing2
  const setCurrentIsProcessing = (processing: boolean) => 
    activeArm === 1 ? setIsProcessing1(processing) : setIsProcessing2(processing)
  const getCurrentIsExecuting = () => activeArm === 1 ? isExecuting1 : isExecuting2
  const setCurrentIsExecuting = (executing: boolean) => 
    activeArm === 1 ? setIsExecuting1(executing) : setIsExecuting2(executing)
  const getCurrentAutoCompile = () => activeArm === 1 ? autoCompile1 : autoCompile2
  const setCurrentAutoCompile = (auto: boolean) => 
    activeArm === 1 ? setAutoCompile1(auto) : setAutoCompile2(auto)
  const getCurrentProcessingMode = () => activeArm === 1 ? processingMode1 : processingMode2
  const setCurrentProcessingMode = (mode: 'MSL' | 'RAW') => {
    if (activeArm === 1) {
      setProcessingMode1(mode)
      scriptData.setArm1Mode(mode) // Sync to global state
    } else {
      setProcessingMode2(mode)
      scriptData.setArm2Mode(mode) // Sync to global state
    }
  }

  const checkConnectionStatus = async () => {
    try {
      const status = await api.getStatus()
      setConnectionStatus(status.esp32Connected ? 'connected' : 'disconnected')
    } catch (error) {
      setConnectionStatus('disconnected')
      if (connectionStatus !== 'disconnected') {
        onNotification?.('🔌 Control system disconnected', 'warning')
      }
    }
  }

  const handleProcessScript = useCallback(async (scriptText?: string) => {
    const currentCommandText = getCurrentCommandText()
    const currentProcessingMode = getCurrentProcessingMode()
    
    let textToProcess = ''
    if (scriptText !== undefined) {
      textToProcess = typeof scriptText === 'string' ? scriptText : String(scriptText)
    } else {
      textToProcess = typeof currentCommandText === 'string' ? currentCommandText : String(currentCommandText)
    }
    
    if (!textToProcess.trim()) {
      setCurrentCompilationResult(null)
      return
    }

    setCurrentIsProcessing(true)
    try {
      let result
      
      if (simulationMode) {
        // Simulation mode - bypass server calls, just do local compilation
        const commandCount = textToProcess.split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).length
        
        result = {
          success: true,
          scriptId: `sim_${Date.now()}`,
          commandCount: commandCount,
          compiledData: {
            format: currentProcessingMode === 'RAW' ? 'raw' : 'text',
            textCommands: currentProcessingMode === 'RAW' ? textToProcess : `// Simulated MSL compilation\n${textToProcess}`,
            commandLines: textToProcess.split('\n').filter(line => line.trim())
          }
        }
      } else {
        // Hardware mode - normal server calls
        if (currentProcessingMode === 'RAW') {
          result = await api.saveRawScript(textToProcess, `arm${activeArm}`)
        } else {
          result = await api.saveScript(textToProcess, 'msl', `arm${activeArm}`)
        }
      }
      
      setCurrentCompilationResult({
        success: result.success,
        commands: [],
        error: result.error,
        commandCount: result.commandCount || 0
      })
      
      const scriptForOutput = typeof textToProcess === 'string' ? textToProcess : JSON.stringify(textToProcess)
      let output = ''
      
      if (result.success) {
        const modePrefix = simulationMode ? '🎮 [SIMULATION]' : '🔌 [HARDWARE]'
        
        if (currentProcessingMode === 'RAW') {
          output = `✅ ${modePrefix} Raw script processed successfully!\n\nArm: ${activeArm}\nMode: RAW\nScript ID: ${result.scriptId}\n\nInput script:\n${scriptForOutput}`
        } else {
          let textOutput = ''
          if (result.compiledData) {
            const data = result.compiledData as any
            if (data.format === 'text' && data.textCommands) {
              textOutput = `📋 Generated Text Commands:\n${data.textCommands}`
            } else {
              textOutput = `📋 Generated Commands:\n${JSON.stringify(result.compiledData, null, 2)}`
            }
          }
          
          output = `✅ ${modePrefix} Script processed successfully!\n\nArm: ${activeArm}\nMode: MSL\nGenerated ${result.commandCount} commands\nScript ID: ${result.scriptId}\n\nInput script:\n${scriptForOutput}\n\n${textOutput}`
          
          if (simulationMode) {
            output += `\n\n💡 Simulation mode active - Script ready for virtual execution`
          }
        }
      } else {
        const modeText = currentProcessingMode === 'RAW' ? 'Raw script processing' : 'Script compilation'
        output = `❌ ${modeText} failed!\n\nArm: ${activeArm}\nMode: ${currentProcessingMode}\nError: ${result.error}\n\nInput script:\n${scriptForOutput}`
      }
      
      onCompileOutput?.(output)
      
    } catch (error) {
      let errorMsg = error instanceof Error ? error.message : 'Script processing failed'
      
      if (errorMsg.includes('fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
        errorMsg = 'Control system is not running - Please check the system connection'
        onNotification?.('⚠️ Control system is not running. Please check your connection.', 'warning')
      }
      
      setCurrentCompilationResult({
        success: false,
        error: errorMsg,
        commandCount: 0
      })
      
      const scriptForError = typeof textToProcess === 'string' ? textToProcess : JSON.stringify(textToProcess)
      const modeText = currentProcessingMode === 'RAW' ? 'Raw script processing' : 'Script compilation'
      onCompileOutput?.(
        `❌ ${modeText} error!\n\nArm: ${activeArm}\nMode: ${currentProcessingMode}\nError: ${errorMsg}\n\nInput script:\n${scriptForError}\n\n💡 Solution: Check system connection and try again`
      )
    } finally {
      setCurrentIsProcessing(false)
    }
  }, [activeArm, commandText1, commandText2, processingMode1, processingMode2, simulationMode, onCompileOutput])

  // Sync local state with global store
  useEffect(() => {
    setCommandText1(scriptData.arm1Script)
    setCommandText2(scriptData.arm2Script)
  }, [scriptData.arm1Script, scriptData.arm2Script])

  const handleExecuteScript = async () => {
    const scriptToExecute = (getCurrentCommandText() || '').toString()
    if (!scriptToExecute.trim()) {
      onNotification?.(`No script to execute for Arm ${activeArm}`, 'warning')
      return
    }

    setCurrentIsExecuting(true)
    try {
      if (simulationMode) {
        // Simulation mode - mock execution
        const modePrefix = '🎮 [SIMULATION]'
        onNotification?.(`${modePrefix} Arm ${activeArm} script execution started`, 'info')
        
        // Simulate execution time
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        onNotification?.(`${modePrefix} Arm ${activeArm} script executed successfully (simulated)`, 'success')
      } else {
        // Hardware mode - real execution
        const result = await api.executeScript(scriptToExecute, `arm${activeArm}`)
        
        if (result.success) {
          onNotification?.(`🔌 [HARDWARE] Arm ${activeArm} script executed successfully`, 'success')
        } else {
          throw new Error(result.error || 'Execution failed')
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Script execution error'
      const modePrefix = simulationMode ? '🎮 [SIMULATION]' : '🔌 [HARDWARE]'
      onNotification?.(`${modePrefix} Arm ${activeArm}: ${errorMsg}`, 'error')
    } finally {
      setCurrentIsExecuting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCurrentCommandText(content)
        onNotification?.(`File ${file.name} loaded to Arm ${activeArm}`, 'success')
      }
      reader.readAsText(file)
    }
  }

  const handleSaveToFile = () => {
    const scriptToSave = (getCurrentCommandText() || '').toString()
    const blob = new Blob([scriptToSave], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `palletizer_arm${activeArm}_script_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onNotification?.(`Arm ${activeArm} script saved to file`, 'success')
  }

  // Sync script changes to global script data
  useEffect(() => {
    scriptData.setArm1Script(commandText1)
  }, [commandText1, scriptData.setArm1Script])

  useEffect(() => {
    scriptData.setArm2Script(commandText2)
  }, [commandText2, scriptData.setArm2Script])

  useEffect(() => {
    if (!simulationMode) {
      checkConnectionStatus()
      const interval = setInterval(checkConnectionStatus, 3000)
      return () => clearInterval(interval)
    }
  }, [simulationMode])

  useEffect(() => {
    const textToCheck = (getCurrentCommandText() || '').toString()
    if (getCurrentAutoCompile() && textToCheck.trim()) {
      const timeoutId = setTimeout(() => {
        handleProcessScript()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [activeArm, commandText1, commandText2, autoCompile1, autoCompile2, handleProcessScript])

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Palletizer Arms:</span>
              <div className="flex rounded-lg border bg-background p-1">
                <Button
                  size="sm"
                  variant={activeArm === 1 ? "default" : "ghost"}
                  onClick={() => setActiveArm(1)}
                  className="h-8 px-4 text-sm relative"
                >
                  Arm 1
                  {(commandText1 || compilationResult1?.success) && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant={activeArm === 2 ? "default" : "ghost"}
                  onClick={() => setActiveArm(2)}
                  className="h-8 px-4 text-sm relative"
                >
                  Arm 2
                  {(commandText2 || compilationResult2?.success) && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Active: <span className="font-medium text-foreground">Arm {activeArm}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Script Editor - Arm {activeArm}</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Mode:</span>
                <div className="flex rounded-md border bg-background p-1">
                  <Button
                    size="sm"
                    variant={getCurrentProcessingMode() === 'MSL' ? "default" : "ghost"}
                    onClick={() => setCurrentProcessingMode('MSL')}
                    className="h-6 px-3 text-xs"
                  >
                    MSL
                  </Button>
                  <Button
                    size="sm"
                    variant={getCurrentProcessingMode() === 'RAW' ? "default" : "ghost"}
                    onClick={() => setCurrentProcessingMode('RAW')}
                    className="h-6 px-3 text-xs"
                  >
                    RAW
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Simulation</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={simulationMode}
                    onCheckedChange={onSimulationModeChange}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <Badge 
                    variant={simulationMode ? "default" : "secondary"}
                    className={simulationMode 
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                    }
                  >
                    {simulationMode ? (
                      <>
                        <Layers3 className="h-3 w-3 mr-1" />
                        Virtual
                      </>
                    ) : (
                      <>
                        <MonitorSpeaker className="h-3 w-3 mr-1" />
                        Hardware
                      </>
                    )}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Auto-process</span>
                <Button
                  size="sm"
                  variant={getCurrentAutoCompile() ? "default" : "outline"}
                  onClick={() => setCurrentAutoCompile(!getCurrentAutoCompile())}
                  className="h-7 px-3 text-xs"
                >
                  {getCurrentAutoCompile() ? "ON" : "OFF"}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TextEditor
            value={getCurrentCommandText()}
            onChange={setCurrentCommandText}
            placeholder={getCurrentProcessingMode() === 'RAW' 
              ? `Enter raw ESP32 commands for Arm ${activeArm}...

📝 Raw Command Examples:
X100                             // Move X to position 100
Y50                              // Move Y to position 50
G600                             // Move gripper to position 600
T9900                            // Move turntable to position 9900
HOME                             // Home all axes
ZERO                             // Zero all axes
SPEED 2000                       // Set speed
DELAY 1000                       // Wait 1000ms
GRIP 1                           // Gripper open
GRIP 0                           // Gripper close

⚠️ RAW MODE: Commands sent directly to ESP32 without compilation!
🤖 Currently editing: ARM ${activeArm}`
              : `Enter Modern Script Language commands for Arm ${activeArm}...

🤖 Currently editing: ARM ${activeArm}

📝 Basic Movement:
X(100);                           // Move X to position 100
Y(50, 150);                      // Move Y to 50 then 150
Z(10, 100, 200);                 // Move Z through multiple positions
G(600);                          // Move gripper to position 600
T(9900);                         // Move turntable to position 9900

🔄 Group Commands:
GROUP(X(100), Y(50), Z(10));     // Asynchronous movement
GROUP(X(500, 600), Y(300));      // Multi-parameter coordination
GROUPSYNC(X(100, 200), Y(50));   // Synchronized matrix movement

⚙️ System Commands:
HOME();                          // Home all axes
HOME(X);                         // Home specific axis
ZERO();                          // Zero all axes
SPEED(2000);                     // Set global speed
SPEED(X, 1500);                 // Set axis speed

🔧 Sync & Timing:
SET(1);                          // Set sync pin HIGH
WAIT();                          // Wait for sync
DETECT();                        // Wait for detection
DELAY(1000);                     // Wait 1000ms

⚙️ Functions:
FUNC(pickup) {
  Z(100);
  X(200, 300);
  G(400);
  DELAY(500);
}

CALL(pickup);

💡 Three movement types: MOVE (trajectory), GROUP (async), GROUPSYNC (matrix)!`
            }
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          onClick={() => handleProcessScript()}
          disabled={getCurrentIsProcessing() || !(getCurrentCommandText() && getCurrentCommandText().toString().trim())}
          variant="outline"
          className="h-12 flex-col gap-1 hover:bg-primary/5 hover:border-primary/30"
        >
          {getCurrentIsProcessing() ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Cpu className="w-4 h-4" />
          )}
          <span className="text-xs">{getCurrentProcessingMode() === 'RAW' ? 'Send Raw' : 'Process Script'}</span>
        </Button>

        <Button
          onClick={handleExecuteScript}
          disabled={getCurrentIsExecuting() || !getCurrentCompilationResult()?.success || (!simulationMode && connectionStatus !== 'connected')}
          className="h-12 flex-col gap-1 bg-primary hover:bg-primary/90"
        >
          {getCurrentIsExecuting() ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span className="text-xs">Execute Arm {activeArm}</span>
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="h-12 flex-col gap-1 hover:bg-primary/5 hover:border-primary/30"
        >
          <Upload className="w-4 h-4" />
          <span className="text-xs">Load</span>
        </Button>

        <Button
          onClick={handleSaveToFile}
          variant="outline"
          className="h-12 flex-col gap-1 hover:bg-primary/5 hover:border-primary/30"
        >
          <Download className="w-4 h-4" />
          <span className="text-xs">Save</span>
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.script"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  )
}