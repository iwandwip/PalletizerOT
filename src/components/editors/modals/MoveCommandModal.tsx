'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { StepCommandData } from '@/lib/script-engine/types/ScriptTypes'

interface MoveCommandModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: StepCommandData, timeout: number, notes: string) => void
  initialData?: StepCommandData
  initialTimeout?: number
  initialNotes?: string
}

export function MoveCommandModal({ 
  open, 
  onOpenChange, 
  onSave, 
  initialData,
  initialTimeout = 5000,
  initialNotes = ''
}: MoveCommandModalProps) {
  const [axis, setAxis] = useState(initialData?.axis || 'X')
  const [position, setPosition] = useState(initialData?.position?.toString() || '0')
  const [speed, setSpeed] = useState(initialData?.speed?.toString() || '1500')
  const [timeout, setTimeout] = useState(initialTimeout.toString())
  const [notes, setNotes] = useState(initialNotes)

  useEffect(() => {
    if (initialData) {
      setAxis(initialData.axis || 'X')
      setPosition(initialData.position?.toString() || '0')
      setSpeed(initialData.speed?.toString() || '1500')
    }
    setTimeout(initialTimeout.toString())
    setNotes(initialNotes)
  }, [initialData, initialTimeout, initialNotes])

  const handleSave = () => {
    const data: StepCommandData = {
      axis,
      position: parseInt(position),
      speed: parseInt(speed)
    }
    
    onSave(data, parseInt(timeout), notes)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Move Command</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="axis" className="text-right">Axis</Label>
            <Select value={axis} onValueChange={setAxis}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="X">X - Horizontal</SelectItem>
                <SelectItem value="Y">Y - Vertical</SelectItem>
                <SelectItem value="Z">Z - Depth</SelectItem>
                <SelectItem value="T">T - Turntable</SelectItem>
                <SelectItem value="G">G - Gripper</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="position" className="text-right">Position</Label>
            <Input
              id="position"
              type="number"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="col-span-3"
              placeholder="0"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="speed" className="text-right">Speed</Label>
            <Input
              id="speed"
              type="number"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="col-span-3"
              placeholder="1500"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="timeout" className="text-right">Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(e.target.value)}
              className="col-span-3"
              placeholder="5000"
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
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}