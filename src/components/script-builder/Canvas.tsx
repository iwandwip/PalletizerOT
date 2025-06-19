'use client'

import { useDroppable } from '@dnd-kit/core'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Play, Download, Eye } from 'lucide-react'
import { Block } from './Block'
import { BlockInstance } from './types'
import { cn } from '@/lib/utils'

interface CanvasProps {
  blocks: BlockInstance[]
  selectedBlockId: string | null
  onBlockSelect: (blockId: string) => void
  onBlockUpdate: (blockId: string, updates: Partial<BlockInstance>) => void
  onBlockDelete: (blockId: string) => void
  onClearAll: () => void
  onGenerateCode: () => void
  onPreviewCode: () => void
  generatedCode?: string
}

export function Canvas({
  blocks,
  selectedBlockId,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onClearAll,
  onGenerateCode,
  onPreviewCode,
  generatedCode
}: CanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
    data: {
      type: 'canvas'
    }
  })

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Script Canvas</h3>
          <Badge variant="outline">
            {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviewCode}
            disabled={blocks.length === 0}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateCode}
            disabled={blocks.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Generate Script
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            disabled={blocks.length === 0}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={setNodeRef}
        className={cn(
          "flex-1 relative overflow-auto bg-gray-50",
          isOver && "bg-blue-50 border-2 border-blue-200 border-dashed"
        )}
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      >
        {blocks.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-medium mb-2">Empty Canvas</h3>
              <p className="text-sm">
                Drag blocks from the palette to start building your script
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 relative min-h-full">
            {blocks.map((block) => (
              <Block
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={onBlockSelect}
                onUpdate={onBlockUpdate}
                onDelete={onBlockDelete}
              />
            ))}
            
            {/* Connection Lines - Placeholder for future implementation */}
            <svg 
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 0 }}
            >
              {/* Connection lines will be rendered here */}
            </svg>
          </div>
        )}

        {/* Drop Zone Indicator */}
        {isOver && (
          <div className="absolute inset-4 border-2 border-blue-400 border-dashed rounded-lg bg-blue-50/50 flex items-center justify-center">
            <div className="text-blue-600 text-center">
              <div className="text-2xl mb-2">📦</div>
              <p className="font-medium">Drop block here</p>
            </div>
          </div>
        )}
      </div>

      {/* Code Preview (if generated) */}
      {generatedCode && (
        <Card className="m-4 mt-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Generated Script</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(generatedCode)}
              >
                Copy
              </Button>
            </div>
            <pre className="bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto max-h-32">
              {generatedCode}
            </pre>
          </div>
        </Card>
      )}
    </div>
  )
}