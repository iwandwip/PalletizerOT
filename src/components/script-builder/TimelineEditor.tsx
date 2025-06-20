'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, closestCenter, DragOverlay, MouseSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  GripVertical, 
  Clock, 
  Settings,
  Download,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineCommand {
  id: string
  type: 'move' | 'home' | 'zero' | 'gripper' | 'wait' | 'speed'
  label: string
  parameters: Record<string, unknown>
  duration: number // estimated duration in ms
  color: string
}

interface TimelineEditorProps {
  onScriptGenerated?: (script: string) => void
  initialCommands?: TimelineCommand[]
}

export function TimelineEditor({ onScriptGenerated, initialCommands = [] }: TimelineEditorProps) {
  const [commands, setCommands] = useState<TimelineCommand[]>(initialCommands)
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [editingCommand, setEditingCommand] = useState<TimelineCommand | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const addCommand = useCallback((type: TimelineCommand['type']) => {
    const newCommand: TimelineCommand = {
      id: `cmd-${Date.now()}`,
      type,
      label: getCommandLabel(type),
      parameters: getDefaultParameters(type),
      duration: getEstimatedDuration(type),
      color: getCommandColor(type)
    }
    setCommands(prev => [...prev, newCommand])
  }, [])

  const updateCommand = useCallback((id: string, updates: Partial<TimelineCommand>) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === id ? { ...cmd, ...updates } : cmd
    ))
  }, [])

  const deleteCommand = useCallback((id: string) => {
    setCommands(prev => prev.filter(cmd => cmd.id !== id))
    if (selectedCommandId === id) {
      setSelectedCommandId(null)
    }
  }, [selectedCommandId])

  const handleDragStart = useCallback((event: any) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setCommands(prev => {
        const oldIndex = prev.findIndex(cmd => cmd.id === active.id)
        const newIndex = prev.findIndex(cmd => cmd.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
    
    setActiveId(null)
  }, [])

  const generateScript = useCallback(() => {
    const script = generateTimelineScript(commands)
    onScriptGenerated?.(script)
    return script
  }, [commands, onScriptGenerated])

  const clearAll = useCallback(() => {
    setCommands([])
    setSelectedCommandId(null)
    setCurrentTime(0)
  }, [])

  // Calculate total duration
  const calculatedDuration = commands.reduce((total, cmd) => total + cmd.duration, 0)

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-card border-b shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-medium">Timeline Editor</span>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {commands.length} commands
            </Badge>
            <Badge variant="outline" className="text-xs">
              {Math.round(calculatedDuration / 1000)}s duration
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            disabled={commands.length === 0}
            className="h-8"
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          
          <Button
            size="sm"
            onClick={generateScript}
            disabled={commands.length === 0}
            className="h-8"
          >
            <Download className="w-3 h-3 mr-1" />
            Generate
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={commands.length === 0}
            className="h-8 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Command Palette */}
        <div className="w-64 border-r bg-card flex-shrink-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Add Commands</h3>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCommand('move')}
                    className="justify-start"
                  >
                    <div className="w-3 h-3 bg-blue-500 rounded mr-2 flex-shrink-0" />
                    Move Axis
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCommand('home')}
                    className="justify-start"
                  >
                    <div className="w-3 h-3 bg-green-500 rounded mr-2 flex-shrink-0" />
                    Home
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCommand('gripper')}
                    className="justify-start"
                  >
                    <div className="w-3 h-3 bg-purple-500 rounded mr-2 flex-shrink-0" />
                    Gripper
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCommand('wait')}
                    className="justify-start"
                  >
                    <div className="w-3 h-3 bg-yellow-500 rounded mr-2 flex-shrink-0" />
                    Wait/Sync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCommand('speed')}
                    className="justify-start"
                  >
                    <div className="w-3 h-3 bg-orange-500 rounded mr-2 flex-shrink-0" />
                    Set Speed
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Timeline View */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Timeline Header */}
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Execution Timeline</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant={isPlaying ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={commands.length === 0}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            
            {/* Timeline Progress Bar */}
            <div className="relative h-2 bg-background rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: calculatedDuration > 0 ? `${(currentTime / calculatedDuration) * 100}%` : '0%' }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{Math.round(currentTime / 1000)}s</span>
              <span>{Math.round(calculatedDuration / 1000)}s</span>
            </div>
          </div>

          {/* Commands List */}
          <ScrollArea className="flex-1">
            {commands.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Empty Timeline</h3>
                  <p className="text-sm max-w-sm mx-auto">
                    Add commands from the palette to build your sequence.
                    Commands will execute in order from top to bottom.
                  </p>
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="p-4">
                  <SortableContext items={commands.map(cmd => cmd.id)} strategy={verticalListSortingStrategy}>
                    {commands.map((command, index) => (
                      <TimelineCommandItem
                        key={command.id}
                        command={command}
                        index={index}
                        isSelected={selectedCommandId === command.id}
                        onSelect={setSelectedCommandId}
                        onUpdate={updateCommand}
                        onDelete={deleteCommand}
                        onEdit={setEditingCommand}
                      />
                    ))}
                  </SortableContext>
                </div>
                
                <DragOverlay>
                  {activeId ? (
                    <TimelineCommandItem
                      command={commands.find(cmd => cmd.id === activeId)!}
                      index={-1}
                      isSelected={false}
                      onSelect={() => {}}
                      onUpdate={() => {}}
                      onDelete={() => {}}
                      onEdit={() => {}}
                      isDragging
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </ScrollArea>
        </div>
      </div>
      
      {/* Command Edit Dialog */}
      {editingCommand && (
        <CommandEditDialog
          command={editingCommand}
          onClose={() => setEditingCommand(null)}
          onSave={(updates) => {
            updateCommand(editingCommand.id, updates)
            setEditingCommand(null)
          }}
        />
      )}
    </div>
  )
}

function TimelineCommandItem({
  command,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onEdit,
  isDragging = false
}: {
  command: TimelineCommand
  index: number
  isSelected: boolean
  onSelect: (id: string) => void
  onUpdate: (id: string, updates: Partial<TimelineCommand>) => void
  onDelete: (id: string) => void
  onEdit?: (command: TimelineCommand) => void
  isDragging?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: command.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("mb-3", isDragging && "opacity-50")}>
      <Card 
        className={cn(
          "p-3 transition-all cursor-pointer hover:shadow-md",
          isSelected ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border hover:border-primary/50"
        )}
        onClick={() => onSelect(command.id)}
      >
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* Command Number */}
          <div className="flex-shrink-0">
            <Badge variant="outline" className="text-xs w-8 justify-center">
              {index + 1}
            </Badge>
          </div>

          {/* Command Color Indicator */}
          <div className={cn("w-3 h-3 rounded-full flex-shrink-0", command.color)} />

          {/* Command Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate">{command.label}</span>
              <span className="text-xs text-muted-foreground">
                {Math.round(command.duration / 1000)}s
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {getParametersDisplay(command)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(command)
              }}
            >
              <Settings className="w-3 h-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(command.id)
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Timeline Bar */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full", command.color)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

// Helper functions
function getCommandLabel(type: TimelineCommand['type']): string {
  switch (type) {
    case 'move': return 'Move Axis'
    case 'home': return 'Home All Axes'
    case 'zero': return 'Zero Position'
    case 'gripper': return 'Gripper Action'
    case 'wait': return 'Wait/Sync'
    case 'speed': return 'Set Speed'
    default: return 'Unknown Command'
  }
}

function getDefaultParameters(type: TimelineCommand['type']): Record<string, unknown> {
  switch (type) {
    case 'move': return { axis: 'X', position: 100, speed: 1500 }
    case 'home': return {}
    case 'zero': return {}
    case 'gripper': return { action: 'close' }
    case 'wait': return { duration: 1000 }
    case 'speed': return { axis: 'all', speed: 1500 }
    default: return {}
  }
}

function getEstimatedDuration(type: TimelineCommand['type']): number {
  switch (type) {
    case 'move': return 2000
    case 'home': return 5000
    case 'zero': return 1000
    case 'gripper': return 500
    case 'wait': return 1000
    case 'speed': return 100
    default: return 1000
  }
}

function getCommandColor(type: TimelineCommand['type']): string {
  switch (type) {
    case 'move': return 'bg-blue-500'
    case 'home': return 'bg-green-500'
    case 'zero': return 'bg-green-600'
    case 'gripper': return 'bg-purple-500'
    case 'wait': return 'bg-yellow-500'
    case 'speed': return 'bg-orange-500'
    default: return 'bg-gray-500'
  }
}

function getParametersDisplay(command: TimelineCommand): string {
  switch (command.type) {
    case 'move': 
      return `${command.parameters.axis}${command.parameters.position} F${command.parameters.speed}`
    case 'gripper':
      return `Action: ${command.parameters.action}`
    case 'wait':
      return `Duration: ${command.parameters.duration}ms`
    case 'speed':
      return `${command.parameters.axis}: ${command.parameters.speed}`
    default:
      return 'Ready to execute'
  }
}

function generateTimelineScript(commands: TimelineCommand[]): string {
  const lines: string[] = []
  
  lines.push('// Generated from Timeline Editor')
  lines.push('// Modern Script Language (MSL) for Palletizer')
  lines.push('')

  commands.forEach((command, index) => {
    lines.push(`// Step ${index + 1}: ${command.label}`)
    
    switch (command.type) {
      case 'move':
        const speed = command.parameters.speed !== 1500 ? ` F${command.parameters.speed}` : ''
        lines.push(`${command.parameters.axis}${command.parameters.position}${speed}`)
        break
      case 'home':
        lines.push('HOME')
        break
      case 'zero':
        lines.push('ZERO')
        break
      case 'gripper':
        lines.push(command.parameters.action === 'open' ? 'G0' : 'G1')
        break
      case 'wait':
        lines.push('SYNC')
        break
      case 'speed':
        if (command.parameters.axis === 'all') {
          lines.push(`SPEED ALL ${command.parameters.speed}`)
        } else {
          lines.push(`SPEED ${String(command.parameters.axis).toUpperCase()} ${command.parameters.speed}`)
        }
        break
    }
    lines.push('')
  })

  return lines.join('\n')
}

// Command Edit Dialog Component
function CommandEditDialog({
  command,
  onClose,
  onSave
}: {
  command: TimelineCommand
  onClose: () => void
  onSave: (updates: Partial<TimelineCommand>) => void
}) {
  const [parameters, setParameters] = useState(command.parameters)
  
  const handleSave = () => {
    onSave({ parameters })
  }
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {command.label}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {command.type === 'move' && (
            <>
              <div>
                <Label>Axis</Label>
                <Select
                  value={parameters.axis as string}
                  onValueChange={(value) => setParameters({ ...parameters, axis: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X">X Axis</SelectItem>
                    <SelectItem value="Y">Y Axis</SelectItem>
                    <SelectItem value="Z">Z Axis</SelectItem>
                    <SelectItem value="T">T Axis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Position</Label>
                <Input
                  type="number"
                  value={parameters.position as number}
                  onChange={(e) => setParameters({ ...parameters, position: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div>
                <Label>Speed</Label>
                <Input
                  type="number"
                  value={parameters.speed as number}
                  onChange={(e) => setParameters({ ...parameters, speed: parseInt(e.target.value) || 1500 })}
                />
              </div>
            </>
          )}
          
          {command.type === 'gripper' && (
            <div>
              <Label>Action</Label>
              <Select
                value={parameters.action as string}
                onValueChange={(value) => setParameters({ ...parameters, action: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="close">Close</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {command.type === 'wait' && (
            <div>
              <Label>Duration (ms)</Label>
              <Input
                type="number"
                value={parameters.duration as number}
                onChange={(e) => setParameters({ ...parameters, duration: parseInt(e.target.value) || 1000 })}
              />
            </div>
          )}
          
          {command.type === 'speed' && (
            <>
              <div>
                <Label>Axis</Label>
                <Select
                  value={parameters.axis as string}
                  onValueChange={(value) => setParameters({ ...parameters, axis: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Axes</SelectItem>
                    <SelectItem value="X">X Axis</SelectItem>
                    <SelectItem value="Y">Y Axis</SelectItem>
                    <SelectItem value="Z">Z Axis</SelectItem>
                    <SelectItem value="T">T Axis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Speed</Label>
                <Input
                  type="number"
                  value={parameters.speed as number}
                  onChange={(e) => setParameters({ ...parameters, speed: parseInt(e.target.value) || 1500 })}
                />
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}