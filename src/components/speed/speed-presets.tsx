'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Bookmark, Plus, Trash2, Star } from "lucide-react"

interface SpeedPreset {
  id: string
  name: string
  percentage: number
  value: number
  isDefault?: boolean
}

interface SpeedPresetsProps {
  currentSpeed: number
  maxSpeed: number
  onApplyPreset: (preset: SpeedPreset) => void
  disabled?: boolean
}

export default function SpeedPresets({
  currentSpeed,
  maxSpeed,
  onApplyPreset,
  disabled = false
}: SpeedPresetsProps) {
  const [customPresets, setCustomPresets] = useState<SpeedPreset[]>([
    { id: '1', name: 'Precision', percentage: 15, value: 150, isDefault: false },
    { id: '2', name: 'Normal Work', percentage: 45, value: 450, isDefault: false },
    { id: '3', name: 'Production', percentage: 75, value: 750, isDefault: false },
  ])

  const [newPresetName, setNewPresetName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const defaultPresets: SpeedPreset[] = [
    { id: 'default-25', name: '25%', percentage: 25, value: Math.round(maxSpeed * 0.25), isDefault: true },
    { id: 'default-50', name: '50%', percentage: 50, value: Math.round(maxSpeed * 0.5), isDefault: true },
    { id: 'default-75', name: '75%', percentage: 75, value: Math.round(maxSpeed * 0.75), isDefault: true },
    { id: 'default-100', name: '100%', percentage: 100, value: maxSpeed, isDefault: true },
  ]

  const createCustomPreset = () => {
    if (!newPresetName.trim()) return

    const percentage = Math.round((currentSpeed / maxSpeed) * 100)
    const newPreset: SpeedPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      percentage,
      value: currentSpeed,
      isDefault: false
    }

    setCustomPresets(prev => [...prev, newPreset])
    setNewPresetName('')
    setShowCreateForm(false)
  }

  const deleteCustomPreset = (id: string) => {
    setCustomPresets(prev => prev.filter(preset => preset.id !== id))
  }

  const getPresetVariant = (preset: SpeedPreset) => {
    if (preset.value === currentSpeed) return 'default'
    return 'outline'
  }

  const getPercentageColor = (percentage: number) => {
    if (percentage <= 25) return 'text-green-600'
    if (percentage <= 50) return 'text-blue-600'
    if (percentage <= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Quick Presets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {defaultPresets.map((preset) => (
            <Button
              key={preset.id}
              variant={getPresetVariant(preset)}
              onClick={() => onApplyPreset(preset)}
              className="w-full justify-between"
              disabled={disabled}
            >
              <span className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {preset.name}
                </Badge>
                <span className={getPercentageColor(preset.percentage)}>
                  {preset.percentage}%
                </span>
              </span>
              <span className="text-muted-foreground font-mono">
                {preset.value}
              </span>
            </Button>
          ))}

          <div className="pt-3 border-t">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApplyPreset({ 
                  id: 'safety', 
                  name: 'Safety', 
                  percentage: 10, 
                  value: Math.round(maxSpeed * 0.1) 
                })}
                disabled={disabled}
                className="text-xs"
              >
                Safety Mode
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApplyPreset({ 
                  id: 'test', 
                  name: 'Test', 
                  percentage: 5, 
                  value: Math.round(maxSpeed * 0.05) 
                })}
                disabled={disabled}
                className="text-xs"
              >
                Test Mode
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              Custom Presets
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowCreateForm(true)}
              disabled={disabled || showCreateForm}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {showCreateForm && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <Input
                placeholder="Preset name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createCustomPreset()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={createCustomPreset}>
                  Save ({Math.round((currentSpeed / maxSpeed) * 100)}%)
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewPresetName('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {customPresets.map((preset) => (
            <div key={preset.id} className="flex items-center gap-2">
              <Button
                variant={getPresetVariant(preset)}
                onClick={() => onApplyPreset(preset)}
                className="flex-1 justify-between"
                disabled={disabled}
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{preset.name}</span>
                  <span className={`text-xs ${getPercentageColor(preset.percentage)}`}>
                    {preset.percentage}%
                  </span>
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {preset.value}
                </span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteCustomPreset(preset.id)}
                className="w-8 h-8 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}

          {customPresets.length === 0 && !showCreateForm && (
            <div className="text-center py-6 text-muted-foreground">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No custom presets yet</p>
              <p className="text-xs">Create presets for your common speeds</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}