'use client'

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Home } from "lucide-react"

interface ManualJogProps {
  step: number
  disabled?: boolean
  onStepChange: (step: number) => void
  onMove: (direction: 'left' | 'right') => void
  onHome: () => void
}

export default function ManualJog({
  step,
  disabled = false,
  onStepChange,
  onMove,
  onHome
}: ManualJogProps) {
  const handleStepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1
    onStepChange(Math.max(1, Math.min(1000, value)))
  }

  const quickSteps = [1, 5, 10, 25, 50, 100]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium w-12">Step:</span>
        <Input
          type="number"
          value={step}
          onChange={handleStepChange}
          className="w-20"
          min={1}
          max={1000}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMove('left')}
          disabled={disabled}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          -{step}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onHome}
          disabled={disabled}
          className="flex items-center gap-1 px-3"
        >
          <Home className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onMove('right')}
          disabled={disabled}
          className="flex items-center gap-1"
        >
          +{step}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 justify-center">
        {quickSteps.map((quickStep) => (
          <Button
            key={quickStep}
            variant="ghost"
            size="sm"
            onClick={() => onStepChange(quickStep)}
            disabled={disabled}
            className={`text-xs h-6 px-2 ${
              step === quickStep ? 'bg-primary text-primary-foreground' : ''
            }`}
          >
            {quickStep}
          </Button>
        ))}
      </div>
    </div>
  )
}