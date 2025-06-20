'use client'

import { Card } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { TimelineEditor as TimelineEditorComponent } from '../script-builder/TimelineEditor'

interface TimelineEditorProps {
  onScriptGenerated?: (script: string) => void
  disabled?: boolean
}

export function TimelineEditor({ onScriptGenerated, disabled = false }: TimelineEditorProps) {
  if (disabled) {
    return (
      <div className="border-0 rounded-lg min-h-[400px] bg-background/30 relative">
        <TimelineEditorComponent onScriptGenerated={onScriptGenerated} />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 text-center max-w-sm">
            <Clock className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Timeline Editor</h3>
            <p className="text-muted-foreground">This feature is coming soon!</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="border-0 rounded-lg min-h-[400px] bg-background/30">
      <TimelineEditorComponent onScriptGenerated={onScriptGenerated} />
    </div>
  )
}