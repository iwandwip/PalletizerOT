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
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react'
import { useDebugMonitor, ParsedMessage } from '@/lib/hooks'

interface DebugTerminalProps {
  className?: string
}

export default function DebugTerminal({ className }: DebugTerminalProps) {
  const { 
    messages, 
    connected, 
    paused, 
    filter, 
    levelFilter,
    executionState,
    setFilter,
    setLevelFilter,
    clearMessages, 
    togglePause, 
    exportMessages 
  } = useDebugMonitor()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [minimized, setMinimized] = useState(false)
  const [height, setHeight] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const [showExecutionTree, setShowExecutionTree] = useState(true)

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

  const getLevelIcon = (level: string) => {
    switch(level) {
      case 'ERROR': return <AlertCircle className="h-3 w-3" />
      case 'WARNING': return <AlertCircle className="h-3 w-3" />
      case 'INFO': return <Info className="h-3 w-3" />
      case 'DEBUG': return <Info className="h-3 w-3" />
      default: return null
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

  const renderMessage = (msg: ParsedMessage, idx: number) => {
    const isSpecialType = msg.type && ['sequence', 'function', 'motion', 'sync', 'parser', 'performance', 'progress'].includes(msg.type)
    
    return (
      <div 
        key={idx} 
        className={`flex items-start gap-2 hover:bg-muted/50 px-1 py-0.5 rounded ${isSpecialType ? 'font-medium' : ''}`}
      >
        <span className="text-muted-foreground text-xs w-20">{formatTimestamp(msg.timestamp)}</span>
        <span className={`${getLevelColor(msg.level)} w-4`}>{getLevelIcon(msg.level)}</span>
        <span className={`font-semibold ${getLevelColor(msg.level)} w-16 text-xs`}>[{msg.level}]</span>
        <span className="text-primary font-medium w-20 text-xs">[{msg.source}]</span>
        <span className="text-foreground flex-1 break-all">
          {msg.type === 'parser' && msg.data?.parsingResults && (
            <div className="space-y-1">
              <div>{msg.message}</div>
              {msg.data.parsingResults.functions && (
                <div className="ml-4 text-xs space-y-0.5">
                  <div>Functions Found: {msg.data.parsingResults.functions.length}</div>
                  {msg.data.parsingResults.functions.map((func, i) => (
                    <div key={i} className="ml-4">
                      {i === msg.data.parsingResults.functions!.length - 1 ? '└─' : '├─'} {func.name} ({func.commands} commands)
                    </div>
                  ))}
                  {msg.data.parsingResults.totalCommands && (
                    <div>Total Commands: {msg.data.parsingResults.totalCommands}</div>
                  )}
                </div>
              )}
            </div>
          )}
          {msg.type === 'performance' && msg.data?.performanceData && (
            <div className="space-y-1">
              <div>{msg.message}</div>
              <div className="ml-4 text-xs space-y-0.5 text-green-500">
                {msg.data.performanceData.totalTime && <div>├─ Total Time: {msg.data.performanceData.totalTime}</div>}
                {msg.data.performanceData.commandsExecuted && <div>├─ Commands Executed: {msg.data.performanceData.commandsExecuted}</div>}
                {msg.data.performanceData.successRate !== undefined && <div>├─ Success Rate: {msg.data.performanceData.successRate}%</div>}
                {msg.data.performanceData.avgCommandTime && <div>└─ Avg Command Time: {msg.data.performanceData.avgCommandTime}</div>}
              </div>
            </div>
          )}
          {(!msg.type || !['parser', 'performance'].includes(msg.type)) && msg.message}
        </span>
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
        <div className="flex items-center justify-between p-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span className="font-semibold text-sm">Debug Terminal</span>
            <Badge variant={connected ? "default" : "destructive"} className="text-xs">
              {connected ? <><Wifi className="h-3 w-3 mr-1" />Connected</> : <><WifiOff className="h-3 w-3 mr-1" />Disconnected</>}
            </Badge>
            {paused && <Badge variant="secondary" className="text-xs">Paused</Badge>}
            <span className="text-xs text-muted-foreground">({messages.length} messages)</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowExecutionTree(!showExecutionTree)}
              title="Toggle execution tree"
              className="h-7 w-7 p-0"
            >
              <Activity className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearMessages}
              title="Clear messages"
              className="h-7 w-7 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={exportMessages}
              title="Export log"
              className="h-7 w-7 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={togglePause}
              title={paused ? "Resume" : "Pause"}
              className="h-7 w-7 p-0"
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMinimized(true)}
              title="Minimize"
              className="h-7 w-7 p-0"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {executionState.isExecuting && (
          <div className="p-2 border-b bg-muted/30 space-y-2">
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
            {showExecutionTree && executionState.functionStack.length > 0 && (
              <div className="text-xs space-y-0.5 font-mono ml-4">
                <div className="text-muted-foreground">📍 Current Position:</div>
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
            className="h-7 text-xs"
          />
          <Tabs value={levelFilter} onValueChange={setLevelFilter} className="h-7">
            <TabsList className="h-7">
              <TabsTrigger value="ALL" className="text-xs h-6 px-2">All</TabsTrigger>
              <TabsTrigger value="ERROR" className="text-xs h-6 px-2">Error</TabsTrigger>
              <TabsTrigger value="WARNING" className="text-xs h-6 px-2">Warning</TabsTrigger>
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
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No debug messages yet...
            </div>
          ) : (
            messages.map((msg, idx) => renderMessage(msg, idx))
          )}
        </div>

        {!autoScroll && (
          <div className="absolute bottom-20 right-4">
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