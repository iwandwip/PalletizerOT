'use client'

import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
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
  zoom?: number
  showGrid?: boolean
}

export function Canvas({
  blocks,
  selectedBlockId,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onGenerateCode,
  onPreviewCode,
  zoom = 1,
  showGrid = true
}: CanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
    data: {
      type: 'canvas'
    }
  })

  return (
    <div className="flex-1 relative bg-white">
      {/* Canvas Area */}
      <div 
        ref={setNodeRef}
        className={cn(
          "w-full h-full relative overflow-auto",
          isOver && "bg-blue-50",
          showGrid && "bg-grid-pattern"
        )}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          backgroundImage: showGrid ? `
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
          ` : undefined,
          backgroundSize: showGrid ? '20px 20px' : undefined,
        }}
      >
        {blocks.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-medium mb-2">Empty Canvas</h3>
              <p className="text-sm max-w-sm mx-auto">
                Drag blocks from the palette to start building your script.
                Connect blocks to create a sequential workflow.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative min-h-full p-4">
            {blocks.map((block, index) => (
              <Block
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={onBlockSelect}
                onUpdate={onBlockUpdate}
                onDelete={onBlockDelete}
                style={{
                  position: 'absolute',
                  left: block.position.x,
                  top: block.position.y,
                  zIndex: selectedBlockId === block.id ? 10 : index,
                }}
              />
            ))}
            
            {/* Connection Lines - Placeholder for future wire implementation */}
            <svg 
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 0 }}
            >
              {/* Future: Wire connections between blocks will be rendered here */}
              {blocks.map((block, index) => {
                if (index === blocks.length - 1) return null
                const nextBlock = blocks[index + 1]
                return (
                  <line
                    key={`connection-${block.id}-${nextBlock.id}`}
                    x1={block.position.x + 192} // Block width + some offset
                    y1={block.position.y + 40}  // Block center
                    x2={nextBlock.position.x}
                    y2={nextBlock.position.y + 40}
                    stroke="#e5e7eb"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                )
              })}
            </svg>
          </div>
        )}

        {/* Drop Zone Indicator */}
        {isOver && (
          <div className="absolute inset-4 border-2 border-blue-400 border-dashed rounded-lg bg-blue-50/50 flex items-center justify-center pointer-events-none">
            <div className="text-blue-600 text-center">
              <div className="text-3xl mb-2">📦</div>
              <p className="font-medium">Drop block here to add to canvas</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Fab Actions */}
      <div className="md:hidden absolute bottom-4 right-4 space-y-2">
        {blocks.length > 0 && (
          <>
            <Button
              size="sm"
              onClick={onPreviewCode}
              className="w-full shadow-lg"
            >
              Preview
            </Button>
            <Button
              size="sm"
              onClick={onGenerateCode}
              className="w-full shadow-lg"
            >
              Generate
            </Button>
          </>
        )}
      </div>
    </div>
  )
}