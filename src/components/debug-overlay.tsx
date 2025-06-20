'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Terminal, 
  FileOutput, 
  X, 
  Trash2, 
  Copy,
  Download,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DebugMessage {
  id: string
  timestamp: string
  type: 'info' | 'warning' | 'error' | 'success'
  source: 'esp32' | 'compiler' | 'system'
  message: string
}

interface DebugOverlayProps {
  isOpen: boolean
  onClose: () => void
  compileOutput?: string
  onHeightChange?: (height: number) => void
  onMinimizedChange?: (minimized: boolean) => void
}

export function DebugOverlay({ isOpen, onClose, compileOutput, onHeightChange, onMinimizedChange }: DebugOverlayProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'output'>('terminal')
  const [terminalMessages, setTerminalMessages] = useState<DebugMessage[]>([])
  const [outputMessages, setOutputMessages] = useState<DebugMessage[]>([])
  const [isMinimized, setIsMinimized] = useState(false)
  const [height, setHeight] = useState(300)
  const [isResizing, setIsResizing] = useState(false)
  
  const terminalRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalMessages, activeTab])

  useEffect(() => {
    if (activeTab === 'output' && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [outputMessages, activeTab])

  // Add compile output to output messages
  useEffect(() => {
    if (compileOutput) {
      const newMessage: DebugMessage = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: compileOutput.includes('error') ? 'error' : 'success',
        source: 'compiler',
        message: compileOutput
      }
      setOutputMessages(prev => [...prev, newMessage])
      setActiveTab('output')
    }
  }, [compileOutput])

  // Real ESP32 SSE connection
  useEffect(() => {
    if (!isOpen) return

    let eventSource: EventSource | null = null
    
    try {
      eventSource = new EventSource('http://localhost:3006/api/events')
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const newMessage: DebugMessage = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            type: data.type || 'info',
            source: 'esp32',
            message: data.message || event.data
          }
          setTerminalMessages(prev => [...prev.slice(-50), newMessage])
        } catch {
          // If not JSON, treat as plain text
          const newMessage: DebugMessage = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            type: 'info',
            source: 'esp32',
            message: event.data
          }
          setTerminalMessages(prev => [...prev.slice(-50), newMessage])
        }
      }
      
      eventSource.onerror = () => {
        const errorMessage: DebugMessage = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          source: 'system',
          message: 'Device connection lost - Check if control system is running'
        }
        setTerminalMessages(prev => [...prev.slice(-50), errorMessage])
      }
      
      eventSource.onopen = () => {
        const connectMessage: DebugMessage = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          type: 'success',
          source: 'system',
          message: 'Connected to device monitoring'
        }
        setTerminalMessages(prev => [...prev.slice(-50), connectMessage])
      }
      
    } catch (error) {
      const errorMessage: DebugMessage = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'error',
        source: 'system',
        message: 'Failed to connect to device - Control system may be offline'
      }
      setTerminalMessages(prev => [...prev.slice(-50), errorMessage])
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [isOpen])

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newHeight = window.innerHeight - e.clientY
      const clampedHeight = Math.max(200, Math.min(600, newHeight))
      setHeight(clampedHeight)
      onHeightChange?.(clampedHeight)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const clearMessages = () => {
    if (activeTab === 'terminal') {
      setTerminalMessages([])
    } else {
      setOutputMessages([])
    }
  }

  const copyMessages = () => {
    const messages = activeTab === 'terminal' ? terminalMessages : outputMessages
    const text = messages.map(m => `[${m.timestamp}] ${m.message}`).join('\n')
    navigator.clipboard.writeText(text)
  }

  const exportMessages = () => {
    const messages = activeTab === 'terminal' ? terminalMessages : outputMessages
    const text = messages.map(m => `[${m.timestamp}] [${m.source.toUpperCase()}] ${m.message}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-${activeTab}-${new Date().toISOString().slice(0, 10)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getMessageColor = (type: DebugMessage['type']) => {
    switch (type) {
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      case 'success': return 'text-green-400'
      default: return 'text-gray-300'
    }
  }

  const getSourceBadge = (source: DebugMessage['source']) => {
    const colors = {
      esp32: 'bg-blue-500',
      compiler: 'bg-purple-500',
      system: 'bg-gray-500'
    }
    const sourceNames = {
      esp32: 'DEVICE',
      compiler: 'COMPILER',
      system: 'SYSTEM'
    }
    return (
      <Badge className={cn('text-xs px-1 py-0 text-white', colors[source])}>
        {sourceNames[source] || source.toUpperCase()}
      </Badge>
    )
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50"
      style={{ height: isMinimized ? 'auto' : height }}
    >
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="h-1 bg-gray-700 hover:bg-primary cursor-row-resize"
        onMouseDown={() => setIsResizing(true)}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="font-medium text-white">System Monitor</span>
          </div>
          
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-auto">
            <TabsList className="bg-gray-700 border-gray-600">
              <TabsTrigger value="terminal" className="text-xs data-[state=active]:bg-gray-600">
                <Terminal className="w-3 h-3 mr-1" />
                Device Monitor
                {terminalMessages.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1 text-xs">
                    {terminalMessages.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="output" className="text-xs data-[state=active]:bg-gray-600">
                <FileOutput className="w-3 h-3 mr-1" />
                Script Output
                {outputMessages.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1 text-xs">
                    {outputMessages.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={clearMessages}
            className="h-6 text-gray-400 hover:text-white"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={copyMessages}
            className="h-6 text-gray-400 hover:text-white"
          >
            <Copy className="w-3 h-3" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={exportMessages}
            className="h-6 text-gray-400 hover:text-white"
          >
            <Download className="w-3 h-3" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const newMinimized = !isMinimized
              setIsMinimized(newMinimized)
              onMinimizedChange?.(newMinimized)
            }}
            className="h-6 text-gray-400 hover:text-white"
          >
            {isMinimized ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-6 text-gray-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <Tabs value={activeTab} className="h-full">
          <TabsContent value="terminal" className="h-full mt-0">
            <div 
              ref={terminalRef}
              className="h-full overflow-y-auto p-4 bg-gray-900 font-mono text-sm"
            >
              {terminalMessages.length === 0 ? (
                <div className="text-gray-500 italic">No device messages yet...</div>
              ) : (
                terminalMessages.map((message) => (
                  <div key={message.id} className="flex items-start gap-2 mb-1">
                    <span className="text-gray-500 text-xs flex-shrink-0">
                      [{message.timestamp}]
                    </span>
                    {getSourceBadge(message.source)}
                    <span className={cn('flex-1', getMessageColor(message.type))}>
                      {message.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="output" className="h-full mt-0">
            <div 
              ref={outputRef}
              className="h-full overflow-y-auto p-4 bg-gray-900 font-mono text-sm"
            >
              {outputMessages.length === 0 ? (
                <div className="text-gray-500 italic">No script output yet...</div>
              ) : (
                outputMessages.map((message) => (
                  <div key={message.id} className="flex items-start gap-2 mb-1">
                    <span className="text-gray-500 text-xs flex-shrink-0">
                      [{message.timestamp}]
                    </span>
                    {getSourceBadge(message.source)}
                    <pre className={cn('flex-1 whitespace-pre-wrap', getMessageColor(message.type))}>
                      {message.message}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}