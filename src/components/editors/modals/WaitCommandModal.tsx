'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { StepCommandData } from '../types'

interface WaitCommandModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: StepCommandData, timeout: number, notes: string) => void
  initialData?: StepCommandData
  initialTimeout?: number
  initialNotes?: string
}

export function WaitCommandModal({ 
  open, 
  onOpenChange, 
  onSave, 
  initialData,
  initialTimeout = 3000,
  initialNotes = ''
}: WaitCommandModalProps) {
  const [duration, setDuration] = useState(initialData?.duration?.toString() || '1000')
  const [timeout, setTimeout] = useState(initialTimeout.toString())
  const [notes, setNotes] = useState(initialNotes)

  useEffect(() => {
    if (initialData?.duration) {
      setDuration(initialData.duration.toString())
    }
    setTimeout(initialTimeout.toString())
    setNotes(initialNotes)
  }, [initialData, initialTimeout, initialNotes])

  const handleSave = () => {
    const data: StepCommandData = {
      duration: parseInt(duration)
    }
    
    onSave(data, parseInt(timeout), notes)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Wait Command</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">Duration (ms)</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="col-span-3"
              placeholder="1000"
            />
          </div>
          
          <div className="col-span-4 text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            Pause execution for {duration}ms ({(parseInt(duration) / 1000).toFixed(1)} seconds)
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