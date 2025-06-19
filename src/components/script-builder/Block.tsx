'use client'

import { useDraggable } from '@dnd-kit/core'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Settings, X, GripVertical, Maximize2, Play, Square, MoreVertical, Link } from 'lucide-react'
import { BlockInstance, Parameter } from './types'
import { getBlockDefinition } from './BlockTypes'
import { cn } from '@/lib/utils'
import React from 'react'

interface BlockProps {
  block: BlockInstance
  isSelected?: boolean
  onSelect?: (blockId: string) => void
  onUpdate?: (blockId: string, updates: Partial<BlockInstance>) => void
  onDelete?: (blockId: string) => void
  onConnect?: (blockId: string, port: number, type: 'input' | 'output') => void
  connectionMode?: boolean
  isDraggable?: boolean
  style?: React.CSSProperties
}

export function Block({ 
  block, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onDelete,
  onConnect,
  connectionMode = false,
  isDraggable = true,
  style
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

  const dragStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const handleParameterChange = (paramName: string, value: unknown) => {
    if (onUpdate) {
      onUpdate(block.id, {
        parameters: {
          ...block.parameters,
          [paramName]: value
        }
      })
    }
  }

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSelect) {
      onSelect(block.id)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(block.id)
    }
  }

  const handleRoleChange = (role: 'start' | 'end' | 'normal') => {
    if (onUpdate) {
      onUpdate(block.id, { role })
    }
  }

  const handlePortClick = (port: number, type: 'input' | 'output') => {
    if (connectionMode && onConnect) {
      onConnect(block.id, port, type)
    }
  }

  const getRoleIcon = () => {
    switch (block.role) {
      case 'start': return <Play className="w-3 h-3 text-green-500" />
      case 'end': return <Square className="w-3 h-3 text-red-500" />
      default: return null
    }
  }

  const getRoleBadge = () => {
    switch (block.role) {
      case 'start': return <Badge variant="default" className="text-xs bg-green-500">START</Badge>
      case 'end': return <Badge variant="default" className="text-xs bg-red-500">END</Badge>
      default: return <Badge variant="outline" className="text-xs">#{block.executionOrder || 'N/A'}</Badge>
    }
  }

  return (
    <div 
      ref={setNodeRef} 
      style={{ ...style, ...dragStyle }}
      className={cn(
        "block-container",
        isDragging && "opacity-50 z-50"
      )}
    >
      <Card 
        className={cn(
          "w-48 cursor-pointer border-2 transition-all select-none hover:shadow-md bg-card",
          isSelected ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border hover:border-primary/50",
          `border-l-4 border-l-${definition.color.split('-')[1]}-500`
        )}
        onClick={handleSelect}
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn("p-1.5 rounded text-white flex-shrink-0", definition.color)}>
                {definition.icon}
              </div>
              <span className="font-medium text-sm truncate">{definition.label}</span>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {isDraggable && (
                <div 
                  {...attributes} 
                  {...listeners} 
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
              
              <ParameterPopover
                definition={definition}
                parameters={block.parameters}
                onParameterChange={handleParameterChange}
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRoleChange('start')}>
                    <Play className="w-3 h-3 mr-2 text-green-500" />
                    Set as Start
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRoleChange('end')}>
                    <Square className="w-3 h-3 mr-2 text-red-500" />
                    Set as End
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRoleChange('normal')}>
                    <Link className="w-3 h-3 mr-2" />
                    Set as Normal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <X className="w-3 h-3 mr-2" />
                    Delete Block
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick Parameters Display */}
          {definition.parameters.length > 0 && (
            <div className="space-y-1 mb-2">
              {definition.parameters.slice(0, 2).map((param) => {
                const value = block.parameters[param.name] ?? param.default
                return (
                  <div key={param.name} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate mr-2">{param.label}:</span>
                    <span className="font-mono text-foreground truncate">
                      {param.type === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </span>
                  </div>
                )
              })}
              {definition.parameters.length > 2 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{definition.parameters.length - 2} more...
                </div>
              )}
            </div>
          )}

          {/* Connection Points */}
          <div className="flex justify-between items-center pt-2 border-t border-border">
            {/* Input Port */}
            <div className="flex items-center">
              {definition.inputs > 0 && (
                <div 
                  className={cn(
                    "w-3 h-3 rounded-full border-2 border-background -ml-6 shadow-sm transition-colors",
                    connectionMode ? "bg-blue-500 cursor-pointer hover:bg-blue-600" : "bg-muted"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePortClick(0, 'input')
                  }}
                />
              )}
            </div>
            
            {/* Block Role/Order Badge */}
            <div className="flex items-center gap-1">
              {getRoleIcon()}
              {getRoleBadge()}
            </div>
            
            {/* Output Port */}
            <div className="flex items-center">
              {definition.outputs > 0 && (
                <div 
                  className={cn(
                    "w-3 h-3 rounded-full border-2 border-background -mr-6 shadow-sm transition-colors",
                    connectionMode ? "bg-green-500 cursor-pointer hover:bg-green-600" : "bg-muted"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePortClick(0, 'output')
                  }}
                />
              )}
            </div>
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
  parameters: Record<string, unknown>
  onParameterChange: (name: string, value: unknown) => void
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
      <PopoverContent 
        className="w-80" 
        onClick={(e) => e.stopPropagation()}
        side="right"
        align="start"
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              <Maximize2 className="w-4 h-4" />
              {definition.label} Settings
            </h4>
            {definition.description && (
              <p className="text-sm text-muted-foreground mt-1">{definition.description}</p>
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
  value: unknown
  onChange: (value: unknown) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {parameter.label}
        {parameter.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      {parameter.type === 'number' && (
        <Input
          type="number"
          value={typeof value === 'number' ? value.toString() : ''}
          onChange={(e) => onChange(Number(e.target.value))}
          min={parameter.min}
          max={parameter.max}
          className="h-8"
          placeholder={parameter.default?.toString()}
        />
      )}
      
      {parameter.type === 'text' && (
        <Input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-8"
          placeholder={parameter.default?.toString()}
        />
      )}
      
      {parameter.type === 'select' && (
        <Select value={typeof value === 'string' ? value : ''} onValueChange={onChange}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select option" />
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
            checked={typeof value === 'boolean' ? value : false}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">
            {(typeof value === 'boolean' ? value : false) ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      )}
    </div>
  )
}