'use client'

import { useDraggable } from '@dnd-kit/core'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, X, GripVertical } from 'lucide-react'
import { BlockInstance, Parameter } from './types'
import { getBlockDefinition } from './BlockTypes'
import { cn } from '@/lib/utils'

interface BlockProps {
  block: BlockInstance
  isSelected?: boolean
  onSelect?: (blockId: string) => void
  onUpdate?: (blockId: string, updates: Partial<BlockInstance>) => void
  onDelete?: (blockId: string) => void
  isDraggable?: boolean
}

export function Block({ 
  block, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onDelete,
  isDraggable = true 
}: BlockProps) {
  const definition = getBlockDefinition(block.definitionId)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: block.id,
    disabled: !isDraggable,
    data: {
      type: 'block',
      block
    }
  })

  if (!definition) return null

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const handleParameterChange = (paramName: string, value: any) => {
    if (onUpdate) {
      onUpdate(block.id, {
        parameters: {
          ...block.parameters,
          [paramName]: value
        }
      })
    }
  }

  const handleSelect = () => {
    if (onSelect) {
      onSelect(block.id)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(block.id)
    }
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "absolute",
        isDragging && "opacity-50"
      )}
    >
      <Card 
        className={cn(
          "w-48 cursor-pointer border-2 transition-all",
          isSelected ? "border-blue-500 shadow-lg" : "border-gray-200 hover:border-gray-300",
          definition.color.replace('bg-', 'border-l-4 border-l-')
        )}
        onClick={handleSelect}
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn("p-1 rounded text-white", definition.color)}>
                {definition.icon}
              </div>
              <span className="font-medium text-sm">{definition.label}</span>
            </div>
            <div className="flex items-center gap-1">
              {isDraggable && (
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
                  <GripVertical className="w-3 h-3 text-gray-400" />
                </div>
              )}
              <ParameterPopover
                definition={definition}
                parameters={block.parameters}
                onParameterChange={handleParameterChange}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Quick Parameters Display */}
          {definition.parameters.length > 0 && (
            <div className="space-y-1">
              {definition.parameters.slice(0, 2).map((param) => {
                const value = block.parameters[param.name] ?? param.default
                return (
                  <div key={param.name} className="flex justify-between text-xs">
                    <span className="text-gray-500">{param.label}:</span>
                    <span className="font-mono">
                      {param.type === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </span>
                  </div>
                )
              })}
              {definition.parameters.length > 2 && (
                <div className="text-xs text-gray-400">
                  +{definition.parameters.length - 2} more...
                </div>
              )}
            </div>
          )}

          {/* Connection Points */}
          <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
            {/* Input Port */}
            {definition.inputs > 0 && (
              <div className="w-3 h-3 bg-gray-300 rounded-full border-2 border-white -ml-6 mt-1" />
            )}
            
            {/* Output Port */}
            {definition.outputs > 0 && (
              <div className="w-3 h-3 bg-gray-300 rounded-full border-2 border-white -mr-6 mt-1 ml-auto" />
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

function ParameterPopover({ 
  definition, 
  parameters, 
  onParameterChange 
}: {
  definition: {
    label: string
    description?: string
    parameters: Parameter[]
  }
  parameters: Record<string, any>
  onParameterChange: (name: string, value: any) => void
}) {
  if (definition.parameters.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
          onClick={(e) => e.stopPropagation()}
        >
          <Settings className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">{definition.label} Settings</h4>
            {definition.description && (
              <p className="text-sm text-gray-500 mt-1">{definition.description}</p>
            )}
          </div>
          
          <div className="space-y-3">
            {definition.parameters.map((param: Parameter) => (
              <ParameterInput
                key={param.name}
                parameter={param}
                value={parameters[param.name] ?? param.default}
                onChange={(value) => onParameterChange(param.name, value)}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ParameterInput({ 
  parameter, 
  value, 
  onChange 
}: {
  parameter: Parameter
  value: any
  onChange: (value: any) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{parameter.label}</Label>
      {parameter.type === 'number' && (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={parameter.min}
          max={parameter.max}
          className="h-8"
        />
      )}
      {parameter.type === 'text' && (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8"
        />
      )}
      {parameter.type === 'select' && (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {parameter.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {parameter.type === 'boolean' && (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">{value ? 'Enabled' : 'Disabled'}</span>
        </div>
      )}
    </div>
  )
}