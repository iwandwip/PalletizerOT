'use client'

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Upload, Save, Download, FileText, Settings } from "lucide-react"

interface TimeoutConfig {
  maxWaitTime: number
  strategy: number
  maxTimeoutWarning: number
  autoRetryCount: number
  saveToFile: boolean
}

interface CommandEditorProps {
  commandText: string
  onCommandTextChange: (text: string) => void
  onSaveCommands: () => void
  onLoadCommands: () => void
  onUploadFile: (file: File) => void
  timeoutConfig: TimeoutConfig
  onTimeoutConfigChange: (config: TimeoutConfig) => void
  onSaveTimeoutConfig: () => void
}

export default function CommandEditor({
  commandText,
  onCommandTextChange,
  onSaveCommands,
  onLoadCommands,
  onUploadFile,
  timeoutConfig,
  onTimeoutConfigChange,
  onSaveTimeoutConfig
}: CommandEditorProps) {
  const [activeTab, setActiveTab] = useState("editor")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const strategyOptions = [
    { value: 0, label: 'Skip & Continue' },
    { value: 1, label: 'Pause System' },
    { value: 2, label: 'Abort & Reset' },
    { value: 3, label: 'Retry with Backoff' }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUploadFile(file)
    }
  }

  const updateTimeoutConfig = (updates: Partial<TimeoutConfig>) => {
    onTimeoutConfigChange({ ...timeoutConfig, ...updates })
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="editor">
          <FileText className="w-4 h-4 mr-2" />
          Editor
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
        <Textarea
          value={commandText}
          onChange={(e) => onCommandTextChange(e.target.value)}
          placeholder={`Enter Modern Script Language commands here...

BASIC MOVEMENT:
X(100,d1000,200);
Y(50,d500,100);
Z(10,d2000);

SIMULTANEOUS MOVEMENT (GROUP):
GROUP(X(100,d1000,200), Y(50,d500,100), Z(10));

FUNCTION SYSTEM:
FUNC(PICK_SEQUENCE) {
  GROUP(X(100,d500), Y(50,d300));
  Z(10,d1000);
}

FUNC(PLACE_SEQUENCE) {
  Z(80,d500);
  GROUP(X(400,d800), Y(150,d600));
  Z(100,d1000);
}

CALL(PICK_SEQUENCE);
SET(1);
SET(0);
CALL(PLACE_SEQUENCE);

SPEED CONTROL:
SPEED;200;          // All axes
SPEED;x;500;        // Single axis

SYSTEM CONTROL:
ZERO; PLAY; PAUSE; STOP; IDLE;

SYNCHRONIZATION:
SET(1); SET(0); WAIT;`}
          className="min-h-[200px] font-mono text-sm"
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
          <Button variant="outline" asChild>
            <a href="/download_commands">
              <Download className="w-4 h-4 mr-2" />
              Download
            </a>
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="upload" className="space-y-4 mt-4">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Click to upload script file</p>
          <p className="text-sm text-gray-500">Supports .txt files with Modern Script Language</p>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".txt"
          className="hidden"
        />
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