'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
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
  Grid
} from 'lucide-react'
import { BlockPalette } from './BlockPalette'
import { Canvas } from './Canvas'
import { BlockInstance, BlockDefinition } from './types'
import { generateScriptFromBlocks } from './codeGenerator'
import { v4 as uuidv4 } from 'uuid'

interface BlockEditorProps {
  onScriptGenerated?: (script: string) => void
  initialBlocks?: BlockInstance[]
}

export function BlockEditor({ onScriptGenerated, initialBlocks = [] }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<BlockInstance[]>(initialBlocks)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [showPalette, setShowPalette] = useState(true)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)

  const handleDragStart = useCallback(() => {
    // Drag start logic can be added here if needed
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    // Handle dropping palette block onto canvas
    if (active.data.current?.type === 'palette-block' && over.id === 'canvas') {
      const definition = active.data.current.definition as BlockDefinition
      const newBlock: BlockInstance = {
        id: uuidv4(),
        definitionId: definition.id,
        position: { 
          x: Math.max(20, Math.random() * 400), 
          y: Math.max(20, Math.random() * 300 + blocks.length * 80) 
        },
        parameters: definition.parameters.reduce((acc, param) => {
          acc[param.name] = param.default
          return acc
        }, {} as Record<string, unknown>),
        connections: {
          inputs: [],
          outputs: []
        }
      }
      setBlocks(prev => [...prev, newBlock])
    }

    // Handle reordering blocks within canvas
    if (active.data.current?.type === 'block' && over.id === 'canvas') {
      const draggedBlockData = active.data.current.block as BlockInstance
      // For now, just update position slightly - real positioning will be handled by canvas
      setBlocks(prev => prev.map(block => 
        block.id === draggedBlockData.id 
          ? { ...block, position: { x: block.position.x + 10, y: block.position.y + 10 } }
          : block
      ))
    }
  }, [blocks.length])

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
    setSelectedBlockId(null)
    setGeneratedCode('')
  }, [])

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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b shadow-sm">
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
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Block Palette */}
          {showPalette && (
            <div className="w-64 lg:w-72 border-r bg-white flex-shrink-0">
              <ScrollArea className="h-full">
                <BlockPalette />
              </ScrollArea>
            </div>
          )}

          {/* Main Canvas */}
          <div className="flex-1 flex flex-col">
            <Canvas
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onBlockSelect={handleBlockSelect}
              onBlockUpdate={handleBlockUpdate}
              onBlockDelete={handleBlockDelete}
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
        <div className="border-t bg-white p-4 max-h-48 overflow-y-auto">
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
          <pre className="bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto text-gray-800">
            {generatedCode}
          </pre>
        </div>
      )}
    </div>
  )
}