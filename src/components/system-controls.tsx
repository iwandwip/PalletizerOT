'use client'

import { Button } from "@/components/ui/button"
import { Play, Pause, Square, Home } from "lucide-react"

interface SystemControlsProps {
  onCommand: (command: string) => void
  disabled?: boolean
}

export default function SystemControls({ onCommand, disabled = false }: SystemControlsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Button
        size="lg"
        onClick={() => onCommand('PLAY')}
        disabled={disabled}
        className="h-12 md:h-10 text-white bg-green-600 hover:bg-green-700"
      >
        <Play className="w-4 h-4 mr-2" />
        PLAY
      </Button>
      
      <Button
        size="lg"
        variant="outline"
        onClick={() => onCommand('PAUSE')}
        disabled={disabled}
        className="h-12 md:h-10 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
      >
        <Pause className="w-4 h-4 mr-2" />
        PAUSE
      </Button>
      
      <Button
        size="lg"
        variant="outline"
        onClick={() => onCommand('STOP')}
        disabled={disabled}
        className="h-12 md:h-10 border-red-500 text-red-600 hover:bg-red-50"
      >
        <Square className="w-4 h-4 mr-2" />
        STOP
      </Button>
      
      <Button
        size="lg"
        variant="outline"
        onClick={() => onCommand('ZERO')}
        disabled={disabled}
        className="h-12 md:h-10 border-blue-500 text-blue-600 hover:bg-blue-50"
      >
        <Home className="w-4 h-4 mr-2" />
        ZERO
      </Button>
    </div>
  )
}