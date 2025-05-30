'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
  WifiOff
} from 'lucide-react'
import { useDebugMonitor } from '@/lib/hooks'

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
    setFilter,
    setLevelFilter,
    clearMessages, 
    togglePause, 
    exportMessages 
  } = useDebugMonitor()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [minimized, setMinimized] = useState(false)
  const [height, setHeight] = useState(300)
  const [isResizing, setIsResizing] = useState(false)

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
      setHeight(Math.max(100, Math.min(600, newHeight)))
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

  if (minimized) {
    return (
      <Card className="fixed bottom-4 right-4 p-2 flex items-center gap-2 z-50">
        <Terminal className="h-4 w-4" />
        <span className="text-sm font-medium">Debug Terminal</span>
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
      className={`fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur ${className}`}
      style={{ height: `${height}px` }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-primary/20"
        onMouseDown={handleMouseDown}
      />
      
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-2 border-b">
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
          className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-0.5"
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
            messages.map((msg, idx) => (
              <div key={idx} className="flex items-start gap-2 hover:bg-muted/50 px-1 py-0.5 rounded">
                <span className="text-muted-foreground">{formatTimestamp(msg.timestamp)}</span>
                <span className={`font-semibold ${getLevelColor(msg.level)} w-16`}>[{msg.level}]</span>
                <span className="text-primary font-medium">[{msg.source}]</span>
                <span className="text-foreground flex-1 break-all">{msg.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  )
}