'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BlockPalette } from './BlockPalette'
import { Canvas } from './Canvas'
import { BlockInstance, BlockDefinition } from './types'
import { getBlockDefinition } from './BlockTypes'
import { generateScriptFromBlocks } from './codeGenerator'
import { v4 as uuidv4 } from 'uuid'

interface BlockEditorProps {
  onScriptGenerated?: (script: string) => void
  initialBlocks?: BlockInstance[]
}

export function BlockEditor({ onScriptGenerated, initialBlocks = [] }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<BlockInstance[]>(initialBlocks)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string>('')

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggedBlock(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setDraggedBlock(null)

    if (!over) return

    // Handle dropping palette block onto canvas
    if (active.data.current?.type === 'palette-block' && over.id === 'canvas') {
      const definition = active.data.current.definition as BlockDefinition
      const newBlock: BlockInstance = {
        id: uuidv4(),
        definitionId: definition.id,
        position: { x: 100, y: 100 + blocks.length * 120 },
        parameters: definition.parameters.reduce((acc, param) => {
          acc[param.name] = param.default
          return acc
        }, {} as Record<string, any>),
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
      // Update position based on drop location (simplified positioning)
      setBlocks(prev => prev.map(block => 
        block.id === draggedBlockData.id 
          ? { ...block, position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 } }
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

  return (
    <div className="h-full flex bg-white">
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Block Palette */}
        <div className="flex-shrink-0">
          <BlockPalette />
        </div>

        <Separator orientation="vertical" className="mx-0" />

        {/* Main Canvas */}
        <Canvas
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onBlockSelect={handleBlockSelect}
          onBlockUpdate={handleBlockUpdate}
          onBlockDelete={handleBlockDelete}
          onClearAll={handleClearAll}
          onGenerateCode={handleGenerateCode}
          onPreviewCode={handlePreviewCode}
          generatedCode={generatedCode}
        />
      </DndContext>
    </div>
  )
}