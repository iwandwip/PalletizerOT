'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Download, FileText, Play, Cpu, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { TextEditor } from "./editors"
import { cn } from "@/lib/utils"

interface CompilationResult {
  success: boolean;
  commands?: unknown[];
  error?: string;
  commandCount?: number;
}

interface CommandEditorProps {
  onNotification?: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void
  onCompileOutput?: (output: string) => void
}

export function CommandEditor({ onNotification, onCompileOutput }: CommandEditorProps) {
  // Active arm state
  const [activeArm, setActiveArm] = useState<1 | 2>(1)
  
  // Separate states for each arm
  const [commandText1, setCommandText1] = useState('')
  const [commandText2, setCommandText2] = useState('')
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
  
  // Helper functions to get current arm state
  const getCurrentCommandText = () => activeArm === 1 ? commandText1 : commandText2
  const setCurrentCommandText = (text: string) => activeArm === 1 ? setCommandText1(text) : setCommandText2(text)
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
  const setCurrentProcessingMode = (mode: 'MSL' | 'RAW') => 
    activeArm === 1 ? setProcessingMode1(mode) : setProcessingMode2(mode)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const checkConnectionStatus = async () => {
    try {
      const status = await api.getStatus()
      setConnectionStatus(status.esp32Connected ? 'connected' : 'disconnected')
    } catch (error) {
      setConnectionStatus('disconnected')
      // Show notification only once when server goes offline
      if (connectionStatus !== 'disconnected') {
        onNotification?.('🔌 Control system disconnected', 'warning')
      }
    }
  }

  const handleProcessScript = useCallback(async (scriptText?: string) => {
    const currentCommandText = getCurrentCommandText()
    const currentProcessingMode = getCurrentProcessingMode()
    
    // Ensure we're working with a string
    let textToProcess = ''
    if (scriptText !== undefined) {
      textToProcess = typeof scriptText === 'string' ? scriptText : String(scriptText)
    } else {
      textToProcess = typeof currentCommandText === 'string' ? currentCommandText : String(currentCommandText)
    }
    
    console.log('Process debug:', { activeArm, scriptText, currentCommandText, textToProcess, currentProcessingMode, type: typeof currentCommandText })
    
    if (!textToProcess.trim()) {
      setCurrentCompilationResult(null)
      return
    }

    setCurrentIsProcessing(true)
    try {
      let result
      
      if (currentProcessingMode === 'RAW') {
        // Raw mode: send script directly without compilation
        result = await api.saveRawScript(textToProcess, `arm${activeArm}`)
      } else {
        // MSL mode: compile the script first
        result = await api.saveScript(textToProcess, 'msl', `arm${activeArm}`)
      }
      
      console.log('API response:', result)
      
      setCurrentCompilationResult({
        success: result.success,
        commands: [],
        error: result.error,
        commandCount: result.commandCount || 0
      })
      
      // Send process output to debug overlay
      const scriptForOutput = typeof textToProcess === 'string' ? textToProcess : JSON.stringify(textToProcess)
      let output = ''
      
      if (result.success) {
        if (currentProcessingMode === 'RAW') {
          output = `✅ Raw script sent successfully!\n\nArm: ${activeArm}\nMode: RAW (No compilation)\nScript ID: ${result.scriptId}\n\nInput script:\n${scriptForOutput}`
        } else {
          // Format the compiled data as text commands
          let textOutput = ''
          if (result.compiledData) {
            const data = result.compiledData as any
            if (data.format === 'text' && data.textCommands) {
              textOutput = `📋 Generated Text Commands:\n${data.textCommands}`
            } else {
              textOutput = `📋 Generated Commands:\n${JSON.stringify(result.compiledData, null, 2)}`
            }
          }
          
          output = `✅ Script processed successfully!\n\nArm: ${activeArm}\nMode: MSL (Compiled)\nGenerated ${result.commandCount} commands\nScript ID: ${result.scriptId}\n\nInput script:\n${scriptForOutput}\n\n${textOutput}`
        }
      } else {
        const modeText = currentProcessingMode === 'RAW' ? 'Raw script processing' : 'Script compilation'
        output = `❌ ${modeText} failed!\n\nArm: ${activeArm}\nMode: ${currentProcessingMode}\nError: ${result.error}\n\nInput script:\n${scriptForOutput}`
      }
      
      onCompileOutput?.(output)
      
    } catch (error) {
      let errorMsg = error instanceof Error ? error.message : 'Script processing failed'
      
      // Check if it's a network error (server not running)
      if (errorMsg.includes('fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
        errorMsg = 'Control system is not running - Please check the system connection'
        onNotification?.('⚠️ Control system is not running. Please check your connection.', 'warning')
      }
      
      setCurrentCompilationResult({
        success: false,
        error: errorMsg,
        commandCount: 0
      })
      
      // Send error to debug overlay
      const scriptForError = typeof textToProcess === 'string' ? textToProcess : JSON.stringify(textToProcess)
      const modeText = currentProcessingMode === 'RAW' ? 'Raw script processing' : 'Script compilation'
      onCompileOutput?.(
        `❌ ${modeText} error!\n\nArm: ${activeArm}\nMode: ${currentProcessingMode}\nError: ${errorMsg}\n\nInput script:\n${scriptForError}\n\n💡 Solution: Check system connection and try again`
      )
    } finally {
      setCurrentIsProcessing(false)
    }
  }, [activeArm, commandText1, commandText2, processingMode1, processingMode2, onCompileOutput])

  // Check connection status periodically
  useEffect(() => {
    checkConnectionStatus()
    const interval = setInterval(checkConnectionStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  // Auto-process when text changes
  useEffect(() => {
    const textToCheck = (getCurrentCommandText() || '').toString()
    if (getCurrentAutoCompile() && textToCheck.trim()) {
      const timeoutId = setTimeout(() => {
        handleProcessScript()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [activeArm, commandText1, commandText2, autoCompile1, autoCompile2, handleProcessScript])

  const handleExecuteScript = async () => {
    const scriptToExecute = (getCurrentCommandText() || '').toString()
    if (!scriptToExecute.trim()) {
      onNotification?.(`No script to execute for Arm ${activeArm}`, 'warning')
      return
    }

    setCurrentIsExecuting(true)
    try {
      const result = await api.executeScript(scriptToExecute, `arm${activeArm}`)
      
      if (result.success) {
        onNotification?.(`Arm ${activeArm} script executed successfully`, 'success')
      } else {
        throw new Error(result.error || 'Execution failed')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Script execution error'
      onNotification?.(`Arm ${activeArm}: ${errorMsg}`, 'error')
    } finally {
      setCurrentIsExecuting(false)
    }
  }

  const handleProcessAndExecute = async () => {
    await handleProcessScript()
    
    // Wait a bit for compilation to complete, then execute if successful
    setTimeout(() => {
      if (getCurrentCompilationResult()?.success) {
        handleExecuteScript()
      }
    }, 500)
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

  const handleSaveToMemory = async () => {
    try {
      const scriptToSave = (getCurrentCommandText() || '').toString()
      await api.saveCommands(scriptToSave, `arm${activeArm}`)
      onNotification?.(`Arm ${activeArm} script saved to memory`, 'success')
    } catch {
      onNotification?.(`Failed to save Arm ${activeArm} script`, 'error')
    }
  }

  const handleLoadFromMemory = async () => {
    try {
      const commands = await api.loadCommands(`arm${activeArm}`)
      setCurrentCommandText(commands)
      onNotification?.(`Arm ${activeArm} script loaded from memory`, 'success')
    } catch {
      onNotification?.(`Failed to load Arm ${activeArm} script`, 'error')
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'disconnected': return 'bg-red-500'
      case 'connecting': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Device Connected'
      case 'disconnected': return 'Control System Offline'
      case 'connecting': return 'Connecting...'
      default: return 'Unknown'
    }
  }

  return (
    <div className="space-y-6">
      {/* Text Editor */}
      <Card className="border-0 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          {/* Arm Tabs */}
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
              {/* Processing Mode Selector */}
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
              
              {/* Auto-process Toggle */}
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
              ? `Enter raw ESP32 commands for Arm ${activeArm}...\n\n📝 Raw Command Examples:\nX100                             // Move X to position 100\nY50                              // Move Y to position 50\nG600                             // Move gripper to position 600\nT9900                            // Move turntable to position 9900\nHOME                             // Home all axes\nZERO                             // Zero all axes\nSPEED 2000                       // Set speed\nDELAY 1000                       // Wait 1000ms\nGRIP 1                           // Gripper open\nGRIP 0                           // Gripper close\n\n⚠️ RAW MODE: Commands sent directly to ESP32 without compilation!\n🤖 Currently editing: ARM ${activeArm}`
              : `Enter Modern Script Language commands for Arm ${activeArm}...\n\n🤖 Currently editing: ARM ${activeArm}\n\n📝 Basic Movement:\nX(100);                           // Move X to position 100\nY(50, 150);                      // Move Y to 50 then 150\nZ(10, 100, 200);                 // Move Z through multiple positions\nG(600);                          // Move gripper to position 600\nT(9900);                         // Move turntable to position 9900\n\n🔄 Group Commands:\nGROUP(X(100), Y(50), Z(10));     // Asynchronous movement\nGROUP(X(500, 600), Y(300));      // Multi-parameter coordination\nGROUPSYNC(X(100, 200), Y(50));   // Synchronized matrix movement\n\n⚙️ System Commands:\nHOME();                          // Home all axes\nHOME(X);                         // Home specific axis\nZERO();                          // Zero all axes\nSPEED(2000);                     // Set global speed\nSPEED(X, 1500);                 // Set axis speed\n\n🔧 Sync & Timing:\nSET(1);                          // Set sync pin HIGH\nWAIT();                          // Wait for sync\nDETECT();                        // Wait for detection\nDELAY(1000);                     // Wait 1000ms\n\n⚙️ Functions:\nFUNC(pickup) {\n  Z(100);\n  X(200, 300);\n  G(400);\n  DELAY(500);\n}\n\nCALL(pickup);\n\n💡 Three movement types: MOVE (trajectory), GROUP (async), GROUPSYNC (matrix)!"
            }
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
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
          disabled={getCurrentIsExecuting() || !getCurrentCompilationResult()?.success || connectionStatus !== 'connected'}
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