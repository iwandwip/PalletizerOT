'use client'

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Save, Download, FileText, Settings, Play, Compile, CheckCircle, AlertCircle, Clock } from "lucide-react"
import ScriptCompiler from "@/lib/compiler/ScriptCompiler"
import CommandUploader from "@/lib/uploader/CommandUploader"
import { CompilationResult, UploadResult, UploadProgress, TimeoutConfig } from "@/lib/types"

interface CommandEditorProps {
  commandText: string
  onCommandTextChange: (text: string) => void
  onSaveCommands: () => void
  onLoadCommands: () => void
  onUploadFile: (file: File) => void
  timeoutConfig: TimeoutConfig
  onTimeoutConfigChange: (config: TimeoutConfig) => void
  onSaveTimeoutConfig: () => void
  onExecute?: () => void
}

export default function CommandEditor({
  commandText,
  onCommandTextChange,
  onSaveCommands,
  onLoadCommands,
  onUploadFile,
  timeoutConfig,
  onTimeoutConfigChange,
  onSaveTimeoutConfig,
  onExecute
}: CommandEditorProps) {
  const [activeTab, setActiveTab] = useState("editor")
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [autoCompile, setAutoCompile] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const compilerRef = useRef(new ScriptCompiler())
  const uploaderRef = useRef(new CommandUploader())

  const strategyOptions = [
    { value: 0, label: 'Skip & Continue' },
    { value: 1, label: 'Pause System' },
    { value: 2, label: 'Abort & Reset' },
    { value: 3, label: 'Retry with Backoff' }
  ]

  useEffect(() => {
    if (autoCompile && commandText.trim()) {
      const timeoutId = setTimeout(() => {
        handleCompile()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [commandText, autoCompile])

  const handleCompile = async () => {
    if (!commandText.trim()) {
      setCompilationResult(null)
      return
    }

    setIsCompiling(true)
    try {
      const result = compilerRef.current.compile(commandText)
      setCompilationResult(result)
    } catch (error) {
      setCompilationResult({
        success: false,
        commands: [],
        errors: [`Compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        functions: [],
        totalCommands: 0
      })
    } finally {
      setIsCompiling(false)
    }
  }

  const handleUploadToESP32 = async () => {
    if (!compilationResult || !compilationResult.success) {
      return
    }

    setIsUploading(true)
    setUploadProgress({ stage: 'uploading', progress: 0 })

    try {
      const result = await uploaderRef.current.uploadCompiledScript(
        compilationResult,
        (progress) => setUploadProgress(progress)
      )
      setUploadResult(result)
      setUploadProgress({ stage: 'completed', progress: 100 })
    } catch (error) {
      setUploadProgress({ 
        stage: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'Upload failed' 
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCompileAndUpload = async () => {
    await handleCompile()
    
    setTimeout(async () => {
      if (compilationResult?.success) {
        await handleUploadToESP32()
      }
    }, 500)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUploadFile(file)
    }
  }

  const updateTimeoutConfig = (updates: Partial<TimeoutConfig>) => {
    onTimeoutConfigChange({ ...timeoutConfig, ...updates })
  }

  const formatEstimatedTime = (commands: string[]) => {
    const estimatedMs = uploaderRef.current.estimateExecutionTime(commands)
    return uploaderRef.current.formatEstimatedTime(estimatedMs)
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="editor">
          <FileText className="w-4 h-4 mr-2" />
          Editor
        </TabsTrigger>
        <TabsTrigger value="compile">
          <Compile className="w-4 h-4 mr-2" />
          Compile
        </TabsTrigger>
        <TabsTrigger value="upload">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </TabsTrigger>
        <TabsTrigger value="config">
          <Settings className="w-4 h-4 mr-2" />
          Config
        </TabsTrigger>
      </TabsList>

      <TabsContent value="editor" className="space-y-4 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Switch
            checked={autoCompile}
            onCheckedChange={setAutoCompile}
          />
          <Label>Auto-compile on change</Label>
          
          {compilationResult && (
            <Badge variant={compilationResult.success ? "default" : "destructive"}>
              {compilationResult.success ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {compilationResult.totalCommands} commands
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {compilationResult.errors.length} errors
                </>
              )}
            </Badge>
          )}
        </div>

        <Textarea
          value={commandText}
          onChange={(e) => onCommandTextChange(e.target.value)}
          placeholder={`Enter Modern Script Language commands here...

BASIC MOVEMENT:
X(100);
Y(50);
Z(10);

SIMULTANEOUS MOVEMENT (GROUP):
GROUP(X(100), Y(50), Z(10));

FUNCTION SYSTEM:
FUNC(PICK_SEQUENCE) {
  GROUP(X(100), Y(50));
  Z(10);
}

CALL(PICK_SEQUENCE);

SPEED CONTROL:
SPEED;200;          // All axes
SPEED;x;500;        // Single axis

SYSTEM CONTROL:
ZERO; PLAY; PAUSE; STOP; IDLE;

SYNCHRONIZATION:
SET(1); SET(0); WAIT; DETECT;`}
          className="min-h-[300px] font-mono text-sm"
        />
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={onSaveCommands}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={onLoadCommands}>
            <Download className="w-4 h-4 mr-2" />
            Load
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".txt"
          className="hidden"
        />
      </TabsContent>

      <TabsContent value="compile" className="space-y-4 mt-4">
        <div className="flex items-center gap-2">
          <Button onClick={handleCompile} disabled={isCompiling || !commandText.trim()}>
            {isCompiling ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Compile className="w-4 h-4 mr-2" />
            )}
            Compile Script
          </Button>
          
          {compilationResult && compilationResult.success && (
            <Badge variant="outline">
              {compilationResult.functions.length} functions, {compilationResult.totalCommands} commands
            </Badge>
          )}
        </div>

        {compilationResult && (
          <div className="space-y-4">
            {!compilationResult.success && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Compilation Errors:</div>
                    {compilationResult.errors.map((error, index) => (
                      <div key={index} className="text-sm">{error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {compilationResult.success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">Compilation Successful!</div>
                    <div className="text-sm space-y-1">
                      <div>• Total Commands: {compilationResult.totalCommands}</div>
                      <div>• Functions: {compilationResult.functions.length}</div>
                      <div>• Estimated Time: {formatEstimatedTime(compilationResult.commands)}</div>
                      {compilationResult.functions.length > 0 && (
                        <div>• Function List: {compilationResult.functions.join(', ')}</div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {compilationResult.success && (
              <div className="bg-muted p-4 rounded-md">
                <Label className="text-sm font-medium mb-2 block">Generated Commands:</Label>
                <div className="bg-background border rounded p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {compilationResult.commands.join('\n')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="upload" className="space-y-4 mt-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleUploadToESP32} 
            disabled={!compilationResult?.success || isUploading}
          >
            {isUploading ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload to ESP32
          </Button>

          <Button 
            onClick={handleCompileAndUpload}
            disabled={!commandText.trim() || isCompiling || isUploading}
            variant="outline"
          >
            <Compile className="w-4 h-4 mr-2" />
            Compile & Upload
          </Button>

          {uploadResult?.success && onExecute && (
            <Button onClick={onExecute} variant="default">
              <Play className="w-4 h-4 mr-2" />
              Execute
            </Button>
          )}
        </div>

        {uploadProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="capitalize">{uploadProgress.stage}</span>
              <span>{uploadProgress.progress}%</span>
            </div>
            <Progress value={uploadProgress.progress} />
            {uploadProgress.message && (
              <p className="text-sm text-muted-foreground">{uploadProgress.message}</p>
            )}
          </div>
        )}

        {uploadResult && (
          <Alert variant={uploadResult.success ? "default" : "destructive"}>
            {uploadResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {uploadResult.success ? (
                <div className="space-y-1">
                  <div className="font-medium">Upload Successful!</div>
                  <div className="text-sm">
                    • Commands: {uploadResult.data.lines}
                  </div>
                  <div className="text-sm">
                    • Size: {uploadResult.data.size}
                  </div>
                  <div className="text-sm">
                    • Upload Time: {uploadResult.uploadTime}ms
                  </div>
                </div>
              ) : (
                <div className="font-medium">Upload Failed!</div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </TabsContent>

      <TabsContent value="config" className="space-y-6 mt-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Wait Timeout: {timeoutConfig.maxWaitTime / 1000}s</Label>
            <Slider
              value={[timeoutConfig.maxWaitTime]}
              onValueChange={(value) => updateTimeoutConfig({ maxWaitTime: value[0] })}
              min={5000}
              max={300000}
              step={1000}
            />
          </div>

          <div className="space-y-2">
            <Label>Timeout Strategy</Label>
            <div className="grid grid-cols-2 gap-2">
              {strategyOptions.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={timeoutConfig.strategy === option.value ? "default" : "outline"}
                  onClick={() => updateTimeoutConfig({ strategy: option.value })}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Warning Threshold</Label>
              <Input
                type="number"
                value={timeoutConfig.maxTimeoutWarning}
                onChange={(e) => updateTimeoutConfig({ maxTimeoutWarning: parseInt(e.target.value) || 1 })}
                min={1}
                max={20}
              />
            </div>

            <div className="space-y-2">
              <Label>Auto Retry Count</Label>
              <Input
                type="number"
                value={timeoutConfig.autoRetryCount}
                onChange={(e) => updateTimeoutConfig({ autoRetryCount: parseInt(e.target.value) || 0 })}
                min={0}
                max={5}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={timeoutConfig.saveToFile}
              onCheckedChange={(checked) => updateTimeoutConfig({ saveToFile: checked })}
            />
            <Label>Auto-save configuration</Label>
          </div>

          <Button onClick={onSaveTimeoutConfig} className="w-full">
            Save Configuration
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  )
}