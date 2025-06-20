'use client'

import { Card } from '@/components/ui/card'
import { Blocks } from 'lucide-react'
import { BlockEditor } from '../script-builder/BlockEditor'

interface VisualEditorProps {
  onScriptGenerated?: (script: string) => void
  disabled?: boolean
}

export function VisualEditor({ onScriptGenerated, disabled = false }: VisualEditorProps) {
  if (disabled) {
    return (
      <div className="border-0 rounded-lg min-h-[400px] bg-background/30 relative">
        <BlockEditor onScriptGenerated={onScriptGenerated} />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 text-center max-w-sm">
            <Blocks className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Visual Editor</h3>
            <p className="text-muted-foreground">This feature is coming soon!</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="border-0 rounded-lg min-h-[400px] bg-background/30">
      <BlockEditor onScriptGenerated={onScriptGenerated} />
    </div>
  )
}