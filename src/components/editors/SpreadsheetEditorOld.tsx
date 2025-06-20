'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, closestCenter, DragOverlay, MouseSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
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

  const addCommand = useCallback((actionType: 'MOVE' | 'GROUP_MOVE' | 'SYSTEM' | 'WAIT') => {
    const stepNumber = Math.max(...commands.map(c => c.step), 0) + 1
    
    const newCommand: SpreadsheetRow = {
      id: Date.now().toString(),
      step: stepNumber,
      action: actionType,
      summary: getDefaultSummary(actionType),
      timeout: getDefaultTimeout(actionType),
      notes: '',
      data: getDefaultData(actionType)
    }
    setCommands(prev => [...prev, newCommand])
  }, [commands])

  const getDefaultSummary = (action: string) => {
    switch (action) {
      case 'MOVE': return 'X → 0 (1500)'
      case 'GROUP_MOVE': return '1 axis → positions'
      case 'SYSTEM': return 'GRIPPER_OPEN'
      case 'WAIT': return 'Wait 1000ms'
      default: return 'New command'
    }
  }

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

  const updateCommand = useCallback((id: string, field: keyof SpreadsheetRow, value: string) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === id ? { ...cmd, [field]: value } : cmd
    ))
  }, [])

  const generateScript = useCallback(() => {
    try {
      const script = scriptEngine.generateFromSpreadsheet(commands, {
        generatorOptions: {
          includeComments: true,
          indentation: '  '
        }
      })
      onScriptGenerated?.(script)
      return script
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
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
    
    setActiveId(null)
  }, [])

  const copyToClipboard = useCallback(() => {
    const selectedCommands = commands.filter(cmd => selectedRows.has(cmd.id))
    const text = selectedCommands.map(cmd => 
      `${cmd.command}\t${cmd.axis || ''}\t${cmd.position || ''}\t${cmd.speed || ''}\t${cmd.notes || ''}`
    ).join('\n')
    navigator.clipboard.writeText(text)
  }, [commands, selectedRows])

  const pasteFromClipboard = useCallback(async () => {
    const text = await navigator.clipboard.readText()
    const lines = text.split('\n').filter(line => line.trim())
    const newCommands: SpreadsheetRow[] = lines.map(line => {
      const [command, axis, position, speed, notes] = line.split('\t')
      return {
        id: Date.now().toString() + Math.random(),
        command: command as SpreadsheetRow['command'],
        axis,
        position,
        speed,
        notes
      }
    })
    setCommands(prev => [...prev, ...newCommands])
  }, [])

  const exportCSV = useCallback(() => {
    const headers = ['Command', 'Axis', 'Position', 'Speed', 'Notes']
    const rows = commands.map(cmd => [
      cmd.command,
      cmd.axis || '',
      cmd.position || '',
      cmd.speed || '',
      cmd.notes || ''
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-card border-b shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="font-medium">Spreadsheet Editor</span>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {commands.length} rows
          </Badge>
          
          {selectedRows.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedRows.size} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addCommand}
            className="h-8"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Row
          </Button>
          
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
            onClick={pasteFromClipboard}
            className="h-8"
          >
            <Clipboard className="w-3 h-3 mr-1" />
            Paste
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

      {/* Spreadsheet Table */}
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
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-32">Command</TableHead>
                <TableHead className="w-24">Axis</TableHead>
                <TableHead className="w-32">Position</TableHead>
                <TableHead className="w-32">Speed</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={commands.map(cmd => cmd.id)} strategy={verticalListSortingStrategy}>
                {commands.map((command, index) => (
                  <SortableRow
                    key={command.id}
                    command={command}
                    index={index}
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
                    onUpdate={updateCommand}
                    editingCell={editingCell}
                    onEditCell={setEditingCell}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
          
          <DragOverlay>
            {activeId ? (
              <div className="bg-background border rounded p-2 shadow-lg opacity-80">
                Row #{commands.findIndex(cmd => cmd.id === activeId) + 1}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}

function SortableRow({
  command,
  index,
  isSelected,
  onSelect,
  onUpdate,
  editingCell,
  onEditCell
}: {
  command: SpreadsheetRow
  index: number
  isSelected: boolean
  onSelect: (id: string) => void
  onUpdate: (id: string, field: keyof SpreadsheetRow, value: string) => void
  editingCell: { row: string; column: string } | null
  onEditCell: (cell: { row: string; column: string } | null) => void
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

  const isEditing = (column: string) => 
    editingCell?.row === command.id && editingCell?.column === column

  const handleCellClick = (column: string) => {
    onEditCell({ row: command.id, column })
  }

  const handleCellBlur = () => {
    onEditCell(null)
  }

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "hover:bg-muted/50",
        isSelected && "bg-primary/10"
      )}
    >
      <TableCell className="p-1">
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
        onClick={() => onSelect(command.id)}
      >
        <Badge variant="outline" className="text-xs">
          {index + 1}
        </Badge>
      </TableCell>
      
      <TableCell>
        {isEditing('command') ? (
          <Select
            value={command.command}
            onValueChange={(value) => {
              onUpdate(command.id, 'command', value)
              onEditCell(null)
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MOVE">MOVE</SelectItem>
              <SelectItem value="GROUP">GROUP</SelectItem>
              <SelectItem value="HOME">HOME</SelectItem>
              <SelectItem value="ZERO">ZERO</SelectItem>
              <SelectItem value="GRIPPER">GRIPPER</SelectItem>
              <SelectItem value="WAIT">WAIT</SelectItem>
              <SelectItem value="SPEED">SPEED</SelectItem>
              <SelectItem value="FUNC">FUNC</SelectItem>
              <SelectItem value="CALL">CALL</SelectItem>
              <SelectItem value="LOOP">LOOP</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div 
            className="px-2 py-1 cursor-pointer hover:bg-muted rounded"
            onClick={() => handleCellClick('command')}
          >
            {command.command}
          </div>
        )}
      </TableCell>
      
      <TableCell>
        {isEditing('axis') ? (
          <Input
            value={command.axis || ''}
            onChange={(e) => onUpdate(command.id, 'axis', e.target.value)}
            onBlur={handleCellBlur}
            className="h-8"
            autoFocus
          />
        ) : (
          <div 
            className="px-2 py-1 cursor-pointer hover:bg-muted rounded min-h-[32px]"
            onClick={() => handleCellClick('axis')}
          >
            {command.axis || '-'}
          </div>
        )}
      </TableCell>
      
      <TableCell>
        {isEditing('position') ? (
          <Input
            value={command.position || ''}
            onChange={(e) => onUpdate(command.id, 'position', e.target.value)}
            onBlur={handleCellBlur}
            className="h-8"
            autoFocus
          />
        ) : (
          <div 
            className="px-2 py-1 cursor-pointer hover:bg-muted rounded min-h-[32px]"
            onClick={() => handleCellClick('position')}
          >
            {command.position || '-'}
          </div>
        )}
      </TableCell>
      
      <TableCell>
        {isEditing('speed') ? (
          <Input
            value={command.speed || ''}
            onChange={(e) => onUpdate(command.id, 'speed', e.target.value)}
            onBlur={handleCellBlur}
            className="h-8"
            autoFocus
          />
        ) : (
          <div 
            className="px-2 py-1 cursor-pointer hover:bg-muted rounded min-h-[32px]"
            onClick={() => handleCellClick('speed')}
          >
            {command.speed || '-'}
          </div>
        )}
      </TableCell>
      
      <TableCell>
        {isEditing('notes') ? (
          <Input
            value={command.notes || ''}
            onChange={(e) => onUpdate(command.id, 'notes', e.target.value)}
            onBlur={handleCellBlur}
            className="h-8"
            autoFocus
          />
        ) : (
          <div 
            className="px-2 py-1 cursor-pointer hover:bg-muted rounded min-h-[32px]"
            onClick={() => handleCellClick('notes')}
          >
            {command.notes || ''}
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}