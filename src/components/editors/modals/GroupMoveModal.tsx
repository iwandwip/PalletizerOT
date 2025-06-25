'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'
import { StepCommandData } from '../types'

interface GroupMoveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: StepCommandData, timeout: number, notes: string) => void
  initialData?: StepCommandData
  initialTimeout?: number
  initialNotes?: string
}

interface AxisMovement {
  id: string
  axis: string
  position: number
  speed: number
}

export function GroupMoveModal({ 
  open, 
  onOpenChange, 
  onSave, 
  initialData,
  initialTimeout = 8000,
  initialNotes = ''
}: GroupMoveModalProps) {
  const [axes, setAxes] = useState<AxisMovement[]>([])
  const [timeout, setTimeout] = useState(initialTimeout.toString())
  const [notes, setNotes] = useState(initialNotes)

  useEffect(() => {
    if (initialData?.axes) {
      setAxes(initialData.axes.map((axis, index) => ({
        id: `axis_${index}`,
        axis: axis.axis,
        position: axis.position,
        speed: axis.speed || 1500
      })))
    } else {
      setAxes([{
        id: 'axis_0',
        axis: 'X',
        position: 0,
        speed: 1500
      }])
    }
    setTimeout(initialTimeout.toString())
    setNotes(initialNotes)
  }, [initialData, initialTimeout, initialNotes])

  const addAxis = () => {
    const newAxis: AxisMovement = {
      id: `axis_${Date.now()}`,
      axis: 'X',
      position: 0,
      speed: 1500
    }
    setAxes([...axes, newAxis])
  }

  const removeAxis = (id: string) => {
    setAxes(axes.filter(axis => axis.id !== id))
  }

  const updateAxis = (id: string, field: keyof AxisMovement, value: string | number) => {
    setAxes(axes.map(axis => 
      axis.id === id ? { ...axis, [field]: value } : axis
    ))
  }

  const handleSave = () => {
    const data: StepCommandData = {
      axes: axes.map(axis => ({
        axis: axis.axis,
        position: axis.position,
        speed: axis.speed
      }))
    }
    
    onSave(data, parseInt(timeout), notes)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Group Movement</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Axes Movements</Label>
              <Button size="sm" onClick={addAxis} variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Axis
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Axis</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Speed</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {axes.map((axis) => (
                  <TableRow key={axis.id}>
                    <TableCell>
                      <Select 
                        value={axis.axis} 
                        onValueChange={(value) => updateAxis(axis.id, 'axis', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="X">X</SelectItem>
                          <SelectItem value="Y">Y</SelectItem>
                          <SelectItem value="Z">Z</SelectItem>
                          <SelectItem value="T">T</SelectItem>
                          <SelectItem value="G">G</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={axis.position}
                        onChange={(e) => updateAxis(axis.id, 'position', parseInt(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={axis.speed}
                        onChange={(e) => updateAxis(axis.id, 'speed', parseInt(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => removeAxis(axis.id)}
                        disabled={axes.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="timeout" className="text-right">Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(e.target.value)}
              className="col-span-3"
              placeholder="8000"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Optional description"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={axes.length === 0}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}