'use client'

import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Block } from './Block'
import { BlockInstance, Connection } from './types'
import { cn } from '@/lib/utils'

interface CanvasProps {
  blocks: BlockInstance[]
  connections: Connection[]
  selectedBlockId: string | null
  connectionMode?: boolean
  connectionStart?: { blockId: string; port: number; type: 'input' | 'output' } | null
  onBlockSelect: (blockId: string) => void
  onBlockUpdate: (blockId: string, updates: Partial<BlockInstance>) => void
  onBlockDelete: (blockId: string) => void
  onConnect: (blockId: string, port: number, type: 'input' | 'output') => void
  onClearAll: () => void
  onGenerateCode: () => void
  onPreviewCode: () => void
  zoom?: number
  showGrid?: boolean
}

export function Canvas({
  blocks,
  connections,
  selectedBlockId,
  connectionMode = false,
  connectionStart,
  onBlockSelect,
  onBlockUpdate,
  onBlockDelete,
  onConnect,
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
    <div className="flex-1 relative bg-background">
      {/* Canvas Area */}
      <div 
        id="canvas-drop-zone"
        ref={setNodeRef}
        className={cn(
          "w-full h-full relative overflow-auto",
          isOver && "bg-primary/10",
          showGrid && "bg-grid-pattern"
        )}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          backgroundImage: showGrid ? `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          ` : undefined,
          backgroundSize: showGrid ? '20px 20px' : undefined,
        }}
      >
        {blocks.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-medium mb-2">Empty Canvas</h3>
              <p className="text-sm max-w-sm mx-auto">
                Drag blocks from the palette to start building your script.
                {connectionMode ? 'Click ports to connect blocks.' : 'Enable connection mode to link blocks.'}
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
                onConnect={onConnect}
                connectionMode={connectionMode}
                style={{
                  position: 'absolute',
                  left: block.position.x,
                  top: block.position.y,
                  zIndex: selectedBlockId === block.id ? 10 : index,
                }}
              />
            ))}
            
            {/* Connection Lines */}
            <svg 
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 0 }}
            >
              {connections.map((connection) => {
                const fromBlock = blocks.find(b => b.id === connection.fromBlockId)
                const toBlock = blocks.find(b => b.id === connection.toBlockId)
                
                if (!fromBlock || !toBlock) return null
                
                const fromX = fromBlock.position.x + 192 // Block width
                const fromY = fromBlock.position.y + 60   // Output port position
                const toX = toBlock.position.x            // Input port position
                const toY = toBlock.position.y + 60
                
                // Calculate bezier curve control points for smooth connections
                const controlX1 = fromX + 50
                const controlY1 = fromY
                const controlX2 = toX - 50
                const controlY2 = toY
                
                return (
                  <g key={connection.id}>
                    {/* Connection line */}
                    <path
                      d={`M ${fromX} ${fromY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${toX} ${toY}`}
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      fill="none"
                      opacity="0.8"
                    />
                    {/* Arrow head */}
                    <polygon
                      points={`${toX-8},${toY-4} ${toX},${toY} ${toX-8},${toY+4}`}
                      fill="hsl(var(--primary))"
                      opacity="0.8"
                    />
                  </g>
                )
              })}
              
              {/* Preview connection line while connecting */}
              {connectionStart && (
                <g>
                  <line
                    x1={connectionStart.type === 'output' ? 
                      (blocks.find(b => b.id === connectionStart.blockId)?.position.x || 0) + 192 :
                      (blocks.find(b => b.id === connectionStart.blockId)?.position.x || 0)
                    }
                    y1={(blocks.find(b => b.id === connectionStart.blockId)?.position.y || 0) + 60}
                    x2={connectionStart.type === 'output' ? 
                      (blocks.find(b => b.id === connectionStart.blockId)?.position.x || 0) + 250 :
                      (blocks.find(b => b.id === connectionStart.blockId)?.position.x || 0) - 50
                    }
                    y2={(blocks.find(b => b.id === connectionStart.blockId)?.position.y || 0) + 60}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.5"
                  />
                </g>
              )}
            </svg>
          </div>
        )}

        {/* Drop Zone Indicator */}
        {isOver && (
          <div className="absolute inset-4 border-2 border-primary border-dashed rounded-lg bg-primary/20 flex items-center justify-center pointer-events-none">
            <div className="text-primary text-center">
              <div className="text-3xl mb-2">📦</div>
              <p className="font-medium">Drop block here to add to canvas</p>
            </div>
          </div>
        )}
        
        {/* Connection Mode Indicator */}
        {connectionMode && (
          <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg">
            <p className="text-sm font-medium">
              🔗 Connection Mode Active
            </p>
            <p className="text-xs opacity-90">
              Click ports to connect blocks
            </p>
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
      
      {/* Connection Mode Helper */}
      {connectionMode && connectionStart && (
        <div className="absolute bottom-20 left-4 bg-card border rounded-lg p-3 shadow-lg max-w-xs">
          <p className="text-sm font-medium mb-1">
            Connecting from: Block #{connectionStart.blockId.slice(-4)}
          </p>
          <p className="text-xs text-muted-foreground">
            Click on a {connectionStart.type === 'output' ? 'blue input' : 'green output'} port to complete the connection
          </p>
        </div>
      )}
    </div>
  )
}