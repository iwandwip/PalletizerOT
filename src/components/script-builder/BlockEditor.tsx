'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { DndContext, DragEndEvent, closestCenter, MouseSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Layout, 
  Trash2, 
  Download, 
  Eye, 
  ZoomIn,
  ZoomOut,
  Grid,
  Link,
  GitBranch
} from 'lucide-react'
import { BlockPalette } from './BlockPalette'
import { Canvas } from './Canvas'
import { BlockInstance, BlockDefinition, Connection } from './types'
import { generateScriptFromBlocks } from './ScriptGenerator'
import { v4 as uuidv4 } from 'uuid'

interface BlockEditorProps {
  onScriptGenerated?: (script: string) => void
  initialBlocks?: BlockInstance[]
}

export function BlockEditor({ onScriptGenerated, initialBlocks = [] }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<BlockInstance[]>(initialBlocks)
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [showPalette, setShowPalette] = useState(true)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  const [connectionMode, setConnectionMode] = useState(false)
  const [connectionStart, setConnectionStart] = useState<{ blockId: string; port: number; type: 'input' | 'output' } | null>(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })

  // Configure sensors for better drag experience
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  })
  const sensors = useSensors(mouseSensor)

  // Track mouse position globally for accurate drop positioning
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleDragStart = useCallback(() => {
    // Drag start logic can be added here if needed
  }, [])

  const handleDragOver = useCallback(() => {
    // Handle drag over events if needed
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    // Handle dropping palette block onto canvas
    if (active.data.current?.type === 'palette-block' && over.id === 'canvas') {
      const definition = active.data.current.definition as BlockDefinition
      
      // Use current mouse position for more accurate drop
      const canvasElement = document.getElementById('canvas-drop-zone')
      const canvasRect = canvasElement?.getBoundingClientRect()
      
      let dropX = 50
      let dropY = 50 + blocks.length * 80
      
      if (canvasRect && mousePositionRef.current) {
        // Calculate relative position within canvas from mouse position
        dropX = Math.max(20, Math.min(
          (mousePositionRef.current.x - canvasRect.left) / canvasZoom - 120, // Account for block width
          canvasRect.width / canvasZoom - 220
        ))
        dropY = Math.max(20, Math.min(
          (mousePositionRef.current.y - canvasRect.top) / canvasZoom - 40, // Account for block height
          canvasRect.height / canvasZoom - 100
        ))
      }

      const newBlock: BlockInstance = {
        id: uuidv4(),
        definitionId: definition.id,
        position: { x: dropX, y: dropY },
        parameters: definition.parameters.reduce((acc, param) => {
          acc[param.name] = param.default
          return acc
        }, {} as Record<string, unknown>),
        connections: {
          inputs: [],
          outputs: []
        },
        role: 'normal',
        executionOrder: blocks.length + 1
      }
      setBlocks(prev => [...prev, newBlock])
    }

    // Handle repositioning blocks within canvas
    if (active.data.current?.type === 'block' && over.id === 'canvas') {
      const draggedBlockData = active.data.current.block as BlockInstance
      
      // Use current mouse position for repositioning
      const canvasElement = document.getElementById('canvas-drop-zone')
      const canvasRect = canvasElement?.getBoundingClientRect()
      
      if (canvasRect && mousePositionRef.current) {
        const newX = Math.max(20, Math.min(
          (mousePositionRef.current.x - canvasRect.left) / canvasZoom - 120,
          canvasRect.width / canvasZoom - 220
        ))
        const newY = Math.max(20, Math.min(
          (mousePositionRef.current.y - canvasRect.top) / canvasZoom - 40,
          canvasRect.height / canvasZoom - 100
        ))
        
        setBlocks(prev => prev.map(block => 
          block.id === draggedBlockData.id 
            ? { ...block, position: { x: newX, y: newY } }
            : block
        ))
      }
    }

    // Drag end cleanup if needed
  }, [blocks.length, canvasZoom])

  const handleBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId(blockId)
  }, [])

  const handleBlockUpdate = useCallback((blockId: string, updates: Partial<BlockInstance>) => {
    setBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ))
  }, [])

  const handleBlockDelete = useCallback((blockId: string) => {
    setBlocks(prev => prev.filter(block => block.id !== blockId))
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }
  }, [selectedBlockId])

  const handleClearAll = useCallback(() => {
    setBlocks([])
    setConnections([])
    setSelectedBlockId(null)
    setGeneratedCode('')
    setConnectionMode(false)
    setConnectionStart(null)
  }, [])

  const handleConnect = useCallback((blockId: string, port: number, type: 'input' | 'output') => {
    if (!connectionStart) {
      // Start a new connection
      setConnectionStart({ blockId, port, type })
    } else {
      // Complete the connection
      if (connectionStart.blockId !== blockId && connectionStart.type !== type) {
        const newConnection: Connection = {
          id: uuidv4(),
          fromBlockId: connectionStart.type === 'output' ? connectionStart.blockId : blockId,
          toBlockId: connectionStart.type === 'output' ? blockId : connectionStart.blockId,
          fromPort: connectionStart.type === 'output' ? connectionStart.port : port,
          toPort: connectionStart.type === 'output' ? port : connectionStart.port
        }
        setConnections(prev => [...prev, newConnection])
        
        // Update block connections
        setBlocks(prev => prev.map(block => {
          if (block.id === newConnection.fromBlockId) {
            return { ...block, connections: { ...block.connections, outputs: [...block.connections.outputs, newConnection.toBlockId] } }
          }
          if (block.id === newConnection.toBlockId) {
            return { ...block, connections: { ...block.connections, inputs: [...block.connections.inputs, newConnection.fromBlockId] } }
          }
          return block
        }))
      }
      setConnectionStart(null)
    }
  }, [connectionStart])

  const toggleConnectionMode = useCallback(() => {
    setConnectionMode(prev => !prev)
    setConnectionStart(null)
  }, [])

  const updateExecutionOrder = useCallback(() => {
    // Simple topological sort based on connections
    const startBlocks = blocks.filter(block => block.role === 'start' || block.connections.inputs.length === 0)
    const visited = new Set<string>()
    const order: string[] = []
    
    const visit = (blockId: string, currentOrder: number) => {
      if (visited.has(blockId)) return currentOrder
      visited.add(blockId)
      
      const block = blocks.find(b => b.id === blockId)
      if (!block) return currentOrder
      
      setBlocks(prev => prev.map(b => 
        b.id === blockId ? { ...b, executionOrder: currentOrder } : b
      ))
      
      // Visit connected blocks
      block.connections.outputs.forEach(outputBlockId => {
        visit(outputBlockId, currentOrder + 1)
      })
      
      return currentOrder + 1
    }
    
    startBlocks.forEach((startBlock, index) => {
      visit(startBlock.id, index * 100 + 1)
    })
  }, [blocks])

  useEffect(() => {
    updateExecutionOrder()
  }, [connections])

  const handleGenerateCode = useCallback(() => {
    const script = generateScriptFromBlocks(blocks)
    setGeneratedCode(script)
    onScriptGenerated?.(script)
  }, [blocks, onScriptGenerated])

  const handlePreviewCode = useCallback(() => {
    const script = generateScriptFromBlocks(blocks)
    setGeneratedCode(script)
  }, [blocks])

  const handleZoomIn = () => setCanvasZoom(prev => Math.min(prev + 0.1, 2))
  const handleZoomOut = () => setCanvasZoom(prev => Math.max(prev - 0.1, 0.5))

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-card border-b shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant={showPalette ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPalette(!showPalette)}
          >
            <Layout className="w-4 h-4 mr-1" />
            Palette
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {blocks.length} blocks
            </Badge>
            <Badge variant="outline" className="text-xs">
              {connections.length} connections
            </Badge>
            {selectedBlockId && (
              <Badge variant="secondary" className="text-xs">
                1 selected
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Canvas Controls */}
          <div className="flex items-center gap-1 border rounded">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 px-2"
            >
              <ZoomOut className="w-3 h-3" />
            </Button>
            <span className="text-xs px-2 border-x">
              {Math.round(canvasZoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 px-2"
            >
              <ZoomIn className="w-3 h-3" />
            </Button>
          </div>

          <Button
            variant={showGrid ? "default" : "outline"}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            className="h-8"
          >
            <Grid className="w-3 h-3" />
          </Button>
          
          <Button
            variant={connectionMode ? "default" : "outline"}
            size="sm"
            onClick={toggleConnectionMode}
            className="h-8"
          >
            <Link className="w-3 h-3" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Action Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviewCode}
            disabled={blocks.length === 0}
            className="h-8"
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          
          <Button
            size="sm"
            onClick={handleGenerateCode}
            disabled={blocks.length === 0}
            className="h-8"
          >
            <Download className="w-3 h-3 mr-1" />
            Generate
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={blocks.length === 0}
            className="h-8 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Block Palette */}
          {showPalette && (
            <div className="w-64 lg:w-72 border-r bg-card flex-shrink-0">
              <ScrollArea className="h-full">
                <BlockPalette />
              </ScrollArea>
            </div>
          )}

          {/* Main Canvas */}
          <div className="flex-1 flex flex-col">
            <Canvas
              blocks={blocks}
              connections={connections}
              selectedBlockId={selectedBlockId}
              connectionMode={connectionMode}
              connectionStart={connectionStart}
              onBlockSelect={handleBlockSelect}
              onBlockUpdate={handleBlockUpdate}
              onBlockDelete={handleBlockDelete}
              onConnect={handleConnect}
              onClearAll={handleClearAll}
              onGenerateCode={handleGenerateCode}
              onPreviewCode={handlePreviewCode}
              zoom={canvasZoom}
              showGrid={showGrid}
            />
          </div>
        </DndContext>
      </div>

      {/* Code Preview Panel */}
      {generatedCode && (
        <div className="border-t bg-card p-4 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">Generated Script</h4>
              <Badge variant="outline" className="text-xs">
                {generatedCode.split('\n').filter(line => line.trim() && !line.startsWith('//')).length} commands
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(generatedCode)}
              >
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGeneratedCode('')}
              >
                ✕
              </Button>
            </div>
          </div>
          <pre className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
            {generatedCode}
          </pre>
        </div>
      )}
    </div>
  )
}