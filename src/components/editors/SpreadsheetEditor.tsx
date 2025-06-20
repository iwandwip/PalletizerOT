'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, closestCenter, DragOverlay, MouseSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Trash2, 
  Download, 
  Copy,
  Clipboard,
  GripVertical,
  FileSpreadsheet,
  Edit3,
  Move,
  Users,
  Settings,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScriptEngine } from '@/lib/script-engine'
import { SpreadsheetRow, StepCommandData } from '@/lib/script-engine/types/ScriptTypes'
import { 
  MoveCommandModal, 
  GroupMoveModal, 
  SystemCommandModal, 
  WaitCommandModal 
} from './modals'

interface SpreadsheetEditorProps {
  onScriptGenerated?: (script: string) => void
  initialRows?: SpreadsheetRow[]
}

export function SpreadsheetEditor({ onScriptGenerated, initialRows = [] }: SpreadsheetEditorProps) {
  const [commands, setCommands] = useState<SpreadsheetRow[]>(initialRows.length > 0 ? initialRows : [
    { 
      id: '1', 
      step: 1,
      action: 'MOVE', 
      summary: 'X → 0 (1500)', 
      timeout: 5000,
      notes: 'Home X axis',
      data: { axis: 'X', position: 0, speed: 1500 }
    }
  ])
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<SpreadsheetRow | null>(null)
  const [modalType, setModalType] = useState<'MOVE' | 'GROUP_MOVE' | 'SYSTEM' | 'WAIT' | null>(null)

  const scriptEngine = ScriptEngine.getInstance()

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const generateSummary = (action: string, data: StepCommandData): string => {
    switch (action) {
      case 'MOVE':
        return `${data.axis} → ${data.position} (${data.speed})`
      case 'GROUP_MOVE':
        const axesCount = data.axes?.length || 0
        return `${axesCount} axes → positions`
      case 'SYSTEM':
        return data.systemCommand || 'System Command'
      case 'WAIT':
        return `Wait ${data.duration}ms`
      default:
        return 'Unknown command'
    }
  }

  const addCommand = useCallback((actionType: 'MOVE' | 'GROUP_MOVE' | 'SYSTEM' | 'WAIT') => {
    const stepNumber = Math.max(...commands.map(c => c.step), 0) + 1
    
    const defaultData = getDefaultData(actionType)
    const newCommand: SpreadsheetRow = {
      id: Date.now().toString(),
      step: stepNumber,
      action: actionType,
      summary: generateSummary(actionType, defaultData),
      timeout: getDefaultTimeout(actionType),
      notes: '',
      data: defaultData
    }
    setCommands(prev => [...prev, newCommand])
  }, [commands])

  const getDefaultTimeout = (action: string) => {
    switch (action) {
      case 'MOVE': return 5000
      case 'GROUP_MOVE': return 8000
      case 'SYSTEM': return 3000
      case 'WAIT': return 3000
      default: return 5000
    }
  }

  const getDefaultData = (action: string): StepCommandData => {
    switch (action) {
      case 'MOVE': return { axis: 'X', position: 0, speed: 1500 }
      case 'GROUP_MOVE': return { axes: [{ axis: 'X', position: 0, speed: 1500 }] }
      case 'SYSTEM': return { systemCommand: 'GRIPPER_OPEN' }
      case 'WAIT': return { duration: 1000 }
      default: return {}
    }
  }

  const deleteCommands = useCallback((ids: Set<string>) => {
    setCommands(prev => prev.filter(cmd => !ids.has(cmd.id)))
    setSelectedRows(new Set())
  }, [])

  const updateCommand = useCallback((id: string, data: StepCommandData, timeout: number, notes: string) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === id ? { 
        ...cmd, 
        summary: generateSummary(cmd.action, data),
        timeout,
        notes,
        data 
      } : cmd
    ))
  }, [])

  const openEditModal = (row: SpreadsheetRow) => {
    setEditingRow(row)
    setModalType(row.action)
  }

  const closeModal = () => {
    setEditingRow(null)
    setModalType(null)
  }

  const handleModalSave = (data: StepCommandData, timeout: number, notes: string) => {
    if (editingRow) {
      updateCommand(editingRow.id, data, timeout, notes)
    }
    closeModal()
  }

  const generateScript = useCallback(() => {
    try {
      const script = scriptEngine.generateFromSpreadsheet(commands, {
        generatorOptions: {
          includeComments: true,
          indentation: '  '
        }
      })
      console.log('Generated script:', script, typeof script)
      const scriptString = typeof script === 'string' ? script : JSON.stringify(script)
      onScriptGenerated?.(scriptString)
      return scriptString
    } catch (error) {
      console.error('Script generation failed:', error)
      const errorScript = '// Error generating script: ' + (error as Error).message
      onScriptGenerated?.(errorScript)
      return errorScript
    }
  }, [commands, onScriptGenerated, scriptEngine])

  const handleDragStart = useCallback((event: any) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setCommands(prev => {
        const oldIndex = prev.findIndex(cmd => cmd.id === active.id)
        const newIndex = prev.findIndex(cmd => cmd.id === over.id)
        const reordered = arrayMove(prev, oldIndex, newIndex)
        
        // Update step numbers
        return reordered.map((cmd, index) => ({
          ...cmd,
          step: index + 1
        }))
      })
    }
    
    setActiveId(null)
  }, [])

  const copyToClipboard = useCallback(() => {
    const selectedCommands = commands.filter(cmd => selectedRows.has(cmd.id))
    const text = selectedCommands.map(cmd => 
      `${cmd.step}\t${cmd.action}\t${cmd.summary}\t${cmd.timeout}\t${cmd.notes}`
    ).join('\n')
    navigator.clipboard.writeText(text)
  }, [commands, selectedRows])

  const exportCSV = useCallback(() => {
    const headers = ['Step', 'Action', 'Summary', 'Timeout', 'Notes']
    const rows = commands.map(cmd => [
      cmd.step.toString(),
      cmd.action,
      cmd.summary,
      cmd.timeout.toString(),
      cmd.notes
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `palletizer_commands_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [commands])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'MOVE': return <Move className="w-4 h-4" />
      case 'GROUP_MOVE': return <Users className="w-4 h-4" />
      case 'SYSTEM': return <Settings className="w-4 h-4" />
      case 'WAIT': return <Clock className="w-4 h-4" />
      default: return <Move className="w-4 h-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'MOVE': return 'bg-blue-100 text-blue-800'
      case 'GROUP_MOVE': return 'bg-green-100 text-green-800'
      case 'SYSTEM': return 'bg-orange-100 text-orange-800'
      case 'WAIT': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-card border-b shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="font-medium">Command Table</span>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {commands.length} steps
          </Badge>
          
          {selectedRows.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedRows.size} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Add Command Dropdown */}
          <Select onValueChange={(value: any) => addCommand(value)}>
            <SelectTrigger className="w-32 h-8">
              <div className="flex items-center gap-1">
                <Plus className="w-3 h-3" />
                <span className="text-sm">Add Step</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MOVE">
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4" />
                  Single Movement
                </div>
              </SelectItem>
              <SelectItem value="GROUP_MOVE">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Group Movement
                </div>
              </SelectItem>
              <SelectItem value="SYSTEM">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  System Command
                </div>
              </SelectItem>
              <SelectItem value="WAIT">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Wait/Delay
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            disabled={selectedRows.size === 0}
            className="h-8"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-8"
          >
            <Download className="w-3 h-3 mr-1" />
            Export CSV
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
            onClick={() => deleteCommands(selectedRows)}
            disabled={selectedRows.size === 0}
            className="h-8 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-16">Step</TableHead>
                <TableHead className="w-32">Action</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={commands.map(cmd => cmd.id)} strategy={verticalListSortingStrategy}>
                {commands.map((command) => (
                  <SortableRow
                    key={command.id}
                    command={command}
                    isSelected={selectedRows.has(command.id)}
                    onSelect={(id) => {
                      const newSelected = new Set(selectedRows)
                      if (newSelected.has(id)) {
                        newSelected.delete(id)
                      } else {
                        newSelected.add(id)
                      }
                      setSelectedRows(newSelected)
                    }}
                    onEdit={() => openEditModal(command)}
                    onDelete={(id) => deleteCommands(new Set([id]))}
                    getActionIcon={getActionIcon}
                    getActionColor={getActionColor}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
          
          <DragOverlay>
            {activeId ? (
              <div className="bg-background border rounded p-2 shadow-lg opacity-80">
                Step #{commands.findIndex(cmd => cmd.id === activeId) + 1}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      <MoveCommandModal
        open={modalType === 'MOVE'}
        onOpenChange={closeModal}
        onSave={handleModalSave}
        initialData={editingRow?.data}
        initialTimeout={editingRow?.timeout}
        initialNotes={editingRow?.notes}
      />

      <GroupMoveModal
        open={modalType === 'GROUP_MOVE'}
        onOpenChange={closeModal}
        onSave={handleModalSave}
        initialData={editingRow?.data}
        initialTimeout={editingRow?.timeout}
        initialNotes={editingRow?.notes}
      />

      <SystemCommandModal
        open={modalType === 'SYSTEM'}
        onOpenChange={closeModal}
        onSave={handleModalSave}
        initialData={editingRow?.data}
        initialTimeout={editingRow?.timeout}
        initialNotes={editingRow?.notes}
      />

      <WaitCommandModal
        open={modalType === 'WAIT'}
        onOpenChange={closeModal}
        onSave={handleModalSave}
        initialData={editingRow?.data}
        initialTimeout={editingRow?.timeout}
        initialNotes={editingRow?.notes}
      />
    </div>
  )
}

function SortableRow({
  command,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  getActionIcon,
  getActionColor
}: {
  command: SpreadsheetRow
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit: () => void
  onDelete: (id: string) => void
  getActionIcon: (action: string) => React.ReactNode
  getActionColor: (action: string) => string
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
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "hover:bg-muted/50 cursor-pointer",
        isSelected && "bg-primary/10"
      )}
      onClick={onEdit}
    >
      <TableCell className="p-1" onClick={(e) => e.stopPropagation()}>
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
      </TableCell>
      
      <TableCell 
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onSelect(command.id)
        }}
      >
        <Badge variant="outline" className="text-xs">
          {command.step}
        </Badge>
      </TableCell>
      
      <TableCell>
        <Badge className={cn("text-xs", getActionColor(command.action))}>
          <span className="mr-1">{getActionIcon(command.action)}</span>
          {command.action}
        </Badge>
      </TableCell>
      
      <TableCell className="font-mono text-sm">
        {command.summary}
      </TableCell>
      
      <TableCell className="text-sm">
        {command.notes}
      </TableCell>
      
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onEdit}
            className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
            title="Edit command"
          >
            <Edit3 className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => onDelete(command.id)}
            className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
            title="Delete command"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}