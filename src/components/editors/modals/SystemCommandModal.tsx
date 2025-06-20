'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { StepCommandData } from '@/lib/script-engine/types/ScriptTypes'

interface SystemCommandModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: StepCommandData, timeout: number, notes: string) => void
  initialData?: StepCommandData
  initialTimeout?: number
  initialNotes?: string
}

export function SystemCommandModal({ 
  open, 
  onOpenChange, 
  onSave, 
  initialData,
  initialTimeout = 3000,
  initialNotes = ''
}: SystemCommandModalProps) {
  const [systemCommand, setSystemCommand] = useState<'GRIPPER_OPEN' | 'GRIPPER_CLOSE' | 'HOME' | 'ZERO'>(
    initialData?.systemCommand || 'GRIPPER_OPEN'
  )
  const [timeout, setTimeout] = useState(initialTimeout.toString())
  const [notes, setNotes] = useState(initialNotes)

  useEffect(() => {
    if (initialData?.systemCommand) {
      setSystemCommand(initialData.systemCommand)
    }
    setTimeout(initialTimeout.toString())
    setNotes(initialNotes)
  }, [initialData, initialTimeout, initialNotes])

  const handleSave = () => {
    const data: StepCommandData = {
      systemCommand
    }
    
    onSave(data, parseInt(timeout), notes)
    onOpenChange(false)
  }

  const getCommandDescription = (cmd: string) => {
    switch (cmd) {
      case 'GRIPPER_OPEN': return 'Open the gripper mechanism'
      case 'GRIPPER_CLOSE': return 'Close the gripper mechanism'
      case 'HOME': return 'Move all axes to home position'
      case 'ZERO': return 'Set current position as zero reference'
      default: return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit System Command</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="command" className="text-right">Command</Label>
            <Select value={systemCommand} onValueChange={(value: any) => setSystemCommand(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRIPPER_OPEN">Gripper Open</SelectItem>
                <SelectItem value="GRIPPER_CLOSE">Gripper Close</SelectItem>
                <SelectItem value="HOME">Home All Axes</SelectItem>
                <SelectItem value="ZERO">Zero Position</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="col-span-4 text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            {getCommandDescription(systemCommand)}
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="timeout" className="text-right">Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(e.target.value)}
              className="col-span-3"
              placeholder="3000"
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