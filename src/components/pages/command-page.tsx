a'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Save, 
  Upload, 
  Download, 
  Play, 
  Pause, 
  Square, 
  Home,
  Code2,
  FileUp,
  BookOpen
} from "lucide-react"
import { api } from '@/lib/api'

interface CommandPageProps {
  onError: (message: string, type?: 'error' | 'warning' | 'info') => void
}

const scriptTemplates = {
  basic: `// Basic Movement Example
X(100,d1000,200);
Y(50,d500,100);
Z(10,d2000);`,

  group: `// Simultaneous Movement (GROUP)
GROUP(X(100,d1000,200), Y(50,d500,100), Z(10));
GROUP(X(400,d800), Y(150,d600));`,

  functions: `// Function System Example
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
CALL(PLACE_SEQUENCE);`,

  automation: `// Complete Automation Example
FUNC(HOME_ALL) {
  ZERO;
  SPEED;200;
}

FUNC(PICK_AND_PLACE) {
  GROUP(X(100,d1000,200), Y(50,d500,100));
  Z(5,d1000);
  SET(1);
  Z(80,d500);
  GROUP(X(400,d1000,500), Y(150,d500,200));
  Z(100,d1000);
  SET(0);
}

CALL(HOME_ALL);
CALL(PICK_AND_PLACE);
CALL(PICK_AND_PLACE);
CALL(PICK_AND_PLACE);`
}

export default function CommandPage({ onError }: CommandPageProps) {
  const [commandText, setCommandText] = useState('')
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof scriptTemplates>('basic')
  const [isExecuting, setIsExecuting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveCommands = async () => {
    try {
      await api.saveCommands(commandText)
      onError('Script saved successfully', 'info')
    } catch (error) {
      onError('Failed to save script', 'error')
    }
  }

  const handleLoadCommands = async () => {
    try {
      const commands = await api.loadCommands()
      setCommandText(commands)
      onError('Script loaded successfully', 'info')
    } catch (error) {
      onError('Failed to load script', 'error')
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  const handleUploadFile = async (file: File) => {
    try {
      await api.uploadFile(file)
      onError(`File "${file.name}" uploaded successfully`, 'info')
      handleLoadCommands()
    } catch (error) {
      onError('Failed to upload file', 'error')
    }
  }

  const handleDownloadScript = () => {
    const blob = new Blob([commandText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `palletizer_script_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    onError('Script downloaded', 'info')
  }

  const handleExecutionCommand = async (command: string) => {
    try {
      if (command === 'PLAY') {
        setIsExecuting(true)
      } else if (command === 'STOP' || command === 'PAUSE') {
        setIsExecuting(false)
      }
      
      await api.sendCommand(command)
      onError(`${command} command executed`, 'info')
    } catch (error) {
      setIsExecuting(false)
      onError(`Failed to execute ${command}`, 'error')
    }
  }

  const loadTemplate = (templateKey: keyof typeof scriptTemplates) => {
    setCommandText(scriptTemplates[templateKey])
    setActiveTemplate(templateKey)
    onError(`Loaded ${templateKey} template`, 'info')
  }

  const getLineCount = () => {
    return commandText.split('\n').length
  }

  const getCharacterCount = () => {
    return commandText.length
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <span className="text-2xl">📝</span>
          Script Editor & Command Center
        </h1>
        <p className="text-muted-foreground">Create and execute Modern Script Language commands</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  Script Editor
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{getLineCount()} lines</Badge>
                  <Badge variant="outline">{getCharacterCount()} chars</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                placeholder="Enter Modern Script Language commands here..."
                className="min-h-[400px] font-mono text-sm resize-none"
              />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  File Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleSaveCommands} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleLoadCommands} className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Load
                  </Button>
                </div>
                
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Click to upload script</p>
                  <p className="text-xs text-gray-500">Supports .txt files</p>
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".txt"
                  className="hidden"
                />

                <Button 
                  variant="outline" 
                  onClick={handleDownloadScript} 
                  className="w-full flex items-center gap-2"
                  disabled={!commandText.trim()}
                >
                  <Download className="w-4 h-4" />
                  Download Script
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Execution Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleExecutionCommand('PLAY')}
                    disabled={isExecuting}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    PLAY
                  </Button>
                  <Button
                    onClick={() => handleExecutionCommand('PAUSE')}
                    variant="outline"
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    PAUSE
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleExecutionCommand('STOP')}
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    STOP
                  </Button>
                  <Button
                    onClick={() => handleExecutionCommand('ZERO')}
                    variant="outline"
                    className="border-blue-500 text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    ZERO
                  </Button>
                </div>

                {isExecuting && (
                  <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Script Executing...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Script Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTemplate} onValueChange={(value) => setActiveTemplate(value as keyof typeof scriptTemplates)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="group">Group</TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-2 mt-2">
                  <TabsTrigger value="functions">Functions</TabsTrigger>
                  <TabsTrigger value="automation">Auto</TabsTrigger>
                </TabsList>

                {Object.entries(scriptTemplates).map(([key, template]) => (
                  <TabsContent key={key} value={key} className="mt-4">
                    <div className="space-y-3">
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40">
                        {template}
                      </pre>
                      <Button 
                        size="sm" 
                        onClick={() => loadTemplate(key as keyof typeof scriptTemplates)}
                        className="w-full"
                      >
                        Load Template
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Reference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">Basic Movement:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">X(100,d1000,200);</code>
              </div>
              
              <div>
                <p className="font-medium mb-1">Simultaneous:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">GROUP(X(100), Y(50));</code>
              </div>
              
              <div>
                <p className="font-medium mb-1">Functions:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">FUNC(NAME) { ... }</code>
              </div>
              
              <div>
                <p className="font-medium mb-1">Speed Control:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">SPEED;x;500;</code>
              </div>
              
              <div>
                <p className="font-medium mb-1">Sync:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">SET(1); WAIT;</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}