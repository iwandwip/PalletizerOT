'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Terminal, 
  Trash2, 
  Download, 
  Pause, 
  Play, 
  Filter,
  Minimize2,
  Maximize2,
  X,
  Wifi,
  WifiOff,
  ChevronRight,
  Activity,
  Clock,
  Search,
  Copy
} from 'lucide-react'

interface DebugMessage {
  id: string
  timestamp: number
  level: 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG'
  source: string
  message: string
  type?: 'progress' | 'sequence' | 'function' | 'motion' | 'sync' | 'parser' | 'performance'
  data?: any
}

interface ExecutionState {
  isExecuting: boolean
  totalCommands: number
  currentCommand: number
  currentFunction: string
  functionStack: string[]
  progress: number
  startTime: number
}

interface DebugTerminalProps {
  messages?: DebugMessage[]
  connected?: boolean
  executionState?: ExecutionState
  onClearMessages?: () => void
  onExportMessages?: () => void
  onTogglePause?: () => void
  onToggle?: () => void
  paused?: boolean
  className?: string
  defaultMinimized?: boolean
}

export default function DebugTerminal({
  messages = [],
  connected = true,
  executionState = {
    isExecuting: false,
    totalCommands: 0,
    currentCommand: 0,
    currentFunction: '',
    functionStack: [],
    progress: 0,
    startTime: 0
  },
  onClearMessages = () => {},
  onExportMessages = () => {},
  onTogglePause = () => {},
  onToggle = () => {},
  paused = false,
  className = '',
  defaultMinimized = false
}: DebugTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [minimized, setMinimized] = useState(defaultMinimized)
  const [height, setHeight] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const [filter, setFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (autoScroll && scrollRef.current && !paused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, autoScroll, paused])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newHeight = window.innerHeight - e.clientY - 20
      setHeight(Math.max(150, Math.min(800, newHeight)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing])

  const getLevelColor = (level: string) => {
    switch(level) {
      case 'ERROR': return 'text-red-500'
      case 'WARNING': return 'text-yellow-500'
      case 'INFO': return 'text-blue-500'
      case 'DEBUG': return 'text-gray-500'
      default: return 'text-gray-400'
    }
  }

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const filteredMessages = messages.filter(msg => {
    if (levelFilter !== 'ALL' && msg.level !== levelFilter) return false
    if (filter && !msg.message.toLowerCase().includes(filter.toLowerCase()) && 
        !msg.source.toLowerCase().includes(filter.toLowerCase())) return false
    if (searchTerm && !msg.message.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const renderMessage = (msg: DebugMessage, idx: number) => {
    const isSpecialType = msg.type && ['sequence', 'function', 'motion', 'sync', 'parser', 'performance', 'progress'].includes(msg.type)
    
    return (
      <div 
        key={msg.id || idx} 
        className={`flex items-start gap-2 hover:bg-muted/50 px-2 py-1 rounded group ${isSpecialType ? 'font-medium' : ''}`}
      >
        <span className="text-muted-foreground text-xs w-20 font-mono">{formatTimestamp(msg.timestamp)}</span>
        <span className={`${getLevelColor(msg.level)} w-16 text-xs font-bold`}>[{msg.level}]</span>
        <span className="text-primary font-medium w-20 text-xs">[{msg.source}]</span>
        <span className="text-foreground flex-1 break-all text-sm">
          {msg.message}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 w-6 h-6 p-0"
          onClick={() => copyToClipboard(`[${msg.level}] [${msg.source}] ${msg.message}`)}
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    )
  }

  if (minimized) {
    return (
      <Card className="fixed bottom-4 right-4 p-2 flex items-center gap-2 z-50 shadow-lg">
        <Terminal className="h-4 w-4" />
        <span className="text-sm font-medium">Debug Terminal</span>
        {executionState.isExecuting && (
          <Badge variant="default" className="text-xs">
            {executionState.currentCommand}/{executionState.totalCommands}
          </Badge>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setMinimized(false)}
          className="h-6 w-6 p-0"
        >
          <Maximize2 className="h-3 w-3" />
        </Button>
      </Card>
    )
  }

  return (
    <Card 
      className={`fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur shadow-2xl ${className}`}
      style={{ height: `${height}px` }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-primary/20 transition-colors"
        onMouseDown={handleMouseDown}
      />
      
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <div className="flex items-center gap-3">
            <Terminal className="h-4 w-4" />
            <span className="font-semibold text-sm">Debug Terminal</span>
            <Badge variant={connected ? "default" : "destructive"} className="text-xs">
              {connected ? <><Wifi className="h-3 w-3 mr-1" />Connected</> : <><WifiOff className="h-3 w-3 mr-1" />Disconnected</>}
            </Badge>
            {paused && <Badge variant="secondary" className="text-xs">Paused</Badge>}
            <span className="text-xs text-muted-foreground">({filteredMessages.length} messages)</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearMessages}
              className="h-7 w-7 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onExportMessages}
              className="h-7 w-7 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onTogglePause}
              className="h-7 w-7 p-0"
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMinimized(true)}
              className="h-7 w-7 p-0"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggle}
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {executionState.isExecuting && (
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-sm font-medium">Execution Progress</span>
                <Badge variant="outline" className="text-xs">
                  {executionState.currentCommand}/{executionState.totalCommands}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatElapsedTime(Date.now() - executionState.startTime)}
              </div>
            </div>
            <Progress value={executionState.progress} className="h-2" />
            {executionState.functionStack.length > 0 && (
              <div className="text-xs space-y-0.5 font-mono ml-4">
                <div className="text-muted-foreground">Current Position:</div>
                {executionState.functionStack.map((func, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-muted-foreground">
                      {Array(i + 1).fill('  ').join('')}{i === executionState.functionStack.length - 1 ? '└─' : '├─'}
                    </span>
                    <span className="text-primary">{func}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 p-2 border-b">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Filter messages..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-7 text-xs flex-1"
          />
          <div className="flex items-center gap-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 text-xs w-24"
            />
          </div>
          <Tabs value={levelFilter} onValueChange={setLevelFilter} className="h-7">
            <TabsList className="h-7">
              <TabsTrigger value="ALL" className="text-xs h-6 px-2">All</TabsTrigger>
              <TabsTrigger value="ERROR" className="text-xs h-6 px-2">Error</TabsTrigger>
              <TabsTrigger value="WARNING" className="text-xs h-6 px-2">Warn</TabsTrigger>
              <TabsTrigger value="INFO" className="text-xs h-6 px-2">Info</TabsTrigger>
              <TabsTrigger value="DEBUG" className="text-xs h-6 px-2">Debug</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-0.5 bg-background"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement
            const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight
            setAutoScroll(isAtBottom)
          }}
        >
          {filteredMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {messages.length === 0 ? 'No debug messages yet...' : 'No messages match current filters'}
            </div>
          ) : (
            filteredMessages.map((msg, idx) => renderMessage(msg, idx))
          )}
        </div>

        {!autoScroll && (
          <div className="absolute bottom-4 right-4">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                  setAutoScroll(true)
                }
              }}
              className="shadow-lg"
            >
              <ChevronRight className="h-3 w-3 mr-1 rotate-90" />
              Scroll to bottom
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}