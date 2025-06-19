'use client'

import { useDraggable } from '@dnd-kit/core'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BLOCK_DEFINITIONS, BLOCK_CATEGORIES, getBlocksByCategory } from './BlockTypes'
import { BlockDefinition } from './types'
import { cn } from '@/lib/utils'

interface BlockPaletteProps {
  onBlockSelect?: (definition: BlockDefinition) => void
}

export function BlockPalette({ onBlockSelect }: BlockPaletteProps) {
  return (
    <TooltipProvider>
      <Card className="w-64 h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Block Palette</h3>
          <p className="text-sm text-gray-500 mt-1">
            Drag blocks to the canvas to build your script
          </p>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {BLOCK_CATEGORIES.map((category) => {
              const blocks = getBlocksByCategory(category)
              if (blocks.length === 0) return null
              
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {category}
                    </Badge>
                    <Separator className="flex-1" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {blocks.map((definition) => (
                      <PaletteBlock
                        key={definition.id}
                        definition={definition}
                        onSelect={onBlockSelect}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </Card>
    </TooltipProvider>
  )
}

function PaletteBlock({ 
  definition, 
  onSelect 
}: { 
  definition: BlockDefinition
  onSelect?: (definition: BlockDefinition) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `palette-${definition.id}`,
    data: {
      type: 'palette-block',
      definition
    }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={cn(
            "cursor-grab active:cursor-grabbing",
            isDragging && "opacity-50"
          )}
          onClick={() => onSelect?.(definition)}
        >
          <Card className={cn(
            "p-3 hover:shadow-md transition-all border-l-4",
            definition.color.replace('bg-', 'border-l-'),
            "hover:scale-105"
          )}>
            <div className="flex flex-col items-center text-center gap-2">
              <div className={cn("p-2 rounded text-white", definition.color)}>
                {definition.icon}
              </div>
              <span className="text-xs font-medium leading-tight">
                {definition.label}
              </span>
            </div>
          </Card>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <div className="max-w-xs">
          <div className="font-medium">{definition.label}</div>
          {definition.description && (
            <div className="text-sm text-gray-500 mt-1">
              {definition.description}
            </div>
          )}
          {definition.parameters.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium">Parameters:</div>
              <ul className="text-xs mt-1 space-y-1">
                {definition.parameters.map((param) => (
                  <li key={param.name}>
                    <span className="font-mono">{param.name}</span>
                    {param.required && <span className="text-red-500">*</span>}
                    : {param.type}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}