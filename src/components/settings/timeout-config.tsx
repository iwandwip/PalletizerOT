'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, RotateCcw, CheckCircle, Settings } from "lucide-react"

interface TimeoutConfig {
  maxWaitTime: number
  strategy: number
  maxTimeoutWarning: number
  autoRetryCount: number
  saveToFile: boolean
}

interface TimeoutStats {
  totalTimeouts: number
  successfulWaits: number
  successRate: number
  averageWaitTime: number
  lastTimeoutTime: number
}

interface TimeoutConfigProps {
  config: TimeoutConfig
  stats?: TimeoutStats
  onConfigChange: (updates: Partial<TimeoutConfig>) => void
  onSaveConfig: () => Promise<void>
  onClearStats?: () => Promise<void>
  disabled?: boolean
}

const strategyOptions = [
  { 
    value: 0, 
    label: 'Skip & Continue', 
    description: 'Skip timeout and continue execution',
    icon: '⏭️',
    severity: 'low'
  },
  { 
    value: 1, 
    label: 'Pause System', 
    description: 'Pause system for manual intervention',
    icon: '⏸️',
    severity: 'medium'
  },
  { 
    value: 2, 
    label: 'Abort & Reset', 
    description: 'Abort sequence and reset system',
    icon: '🛑',
    severity: 'high'
  },
  { 
    value: 3, 
    label: 'Retry with Backoff', 
    description: 'Retry with increasing delays',
    icon: '🔄',
    severity: 'medium'
  }
]

export default function TimeoutConfig({
  config,
  stats,
  onConfigChange,
  onSaveConfig,
  onClearStats,
  disabled = false
}: TimeoutConfigProps) {
  const handleSliderChange = (field: keyof TimeoutConfig, value: number[]) => {
    onConfigChange({ [field]: value[0] })
  }

  const handleInputChange = (field: keyof TimeoutConfig, value: string) => {
    const numValue = parseInt(value) || 0
    let constrainedValue = numValue

    if (field === 'maxWaitTime') {
      constrainedValue = Math.max(5000, Math.min(300000, numValue))
    } else if (field === 'maxTimeoutWarning') {
      constrainedValue = Math.max(1, Math.min(20, numValue))
    } else if (field === 'autoRetryCount') {
      constrainedValue = Math.max(0, Math.min(5, numValue))
    }

    onConfigChange({ [field]: constrainedValue })
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const getStrategyInfo = (strategyValue: number) => {
    return strategyOptions.find(option => option.value === strategyValue) || strategyOptions[0]
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 border-green-200'
      case 'medium': return 'text-yellow-600 border-yellow-200'
      case 'high': return 'text-red-600 border-red-200'
      default: return 'text-gray-600 border-gray-200'
    }
  }

  const currentStrategy = getStrategyInfo(config.strategy)

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Wait Timeout Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Wait Timeout Duration</Label>
              <Badge variant="outline">{formatTime(config.maxWaitTime)}</Badge>
            </div>
            <Slider
              value={[config.maxWaitTime]}
              onValueChange={(value) => handleSliderChange('maxWaitTime', value)}
              min={5000}
              max={300000}
              step={1000}
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5s</span>
              <span>300s (5min)</span>
            </div>
            <Input
              type="number"
              value={config.maxWaitTime / 1000}
              onChange={(e) => handleInputChange('maxWaitTime', String(parseInt(e.target.value) * 1000))}
              min={5}
              max={300}
              className="w-24"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Warning Threshold</Label>
              <Input
                type="number"
                value={config.maxTimeoutWarning}
                onChange={(e) => handleInputChange('maxTimeoutWarning', e.target.value)}
                min={1}
                max={20}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Alert after this many timeouts
              </p>
            </div>

            <div className="space-y-2">
              <Label>Auto Retry Count</Label>
              <Input
                type="number"
                value={config.autoRetryCount}
                onChange={(e) => handleInputChange('autoRetryCount', e.target.value)}
                min={0}
                max={5}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Automatic retry attempts
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-save Configuration</Label>
              <p className="text-xs text-muted-foreground">
                Automatically save timeout settings
              </p>
            </div>
            <Switch
              checked={config.saveToFile}
              onCheckedChange={(checked) => onConfigChange({ saveToFile: checked })}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Timeout Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current Strategy:</span>
              <Badge className={getSeverityColor(currentStrategy.severity)}>
                {currentStrategy.icon} {currentStrategy.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentStrategy.description}
            </p>
          </div>

          <div className="space-y-2">
            {strategyOptions.map((option) => (
              <Button
                key={option.value}
                variant={config.strategy === option.value ? "default" : "outline"}
                onClick={() => onConfigChange({ strategy: option.value })}
                className="w-full justify-start text-left h-auto p-3"
                disabled={disabled}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {stats && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Timeout Statistics
              </div>
              {onClearStats && (
                <Button variant="outline" size="sm" onClick={onClearStats}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Clear Stats
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.totalTimeouts}</div>
                <div className="text-xs text-red-700">Total Timeouts</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.successfulWaits}</div>
                <div className="text-xs text-green-700">Successful Waits</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.successRate.toFixed(1)}%</div>
                <div className="text-xs text-blue-700">Success Rate</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.averageWaitTime ? formatTime(stats.averageWaitTime) : 'N/A'}
                </div>
                <div className="text-xs text-purple-700">Avg Wait Time</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.lastTimeoutTime ? new Date(stats.lastTimeoutTime).toLocaleTimeString() : 'Never'}
                </div>
                <div className="text-xs text-orange-700">Last Timeout</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                stats.successRate >= 95 
                  ? 'bg-green-100 text-green-700'
                  : stats.successRate >= 80
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {stats.successRate >= 95 
                    ? 'Excellent Performance'
                    : stats.successRate >= 80
                      ? 'Good Performance'
                      : 'Needs Attention'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="md:col-span-2">
        <CardContent className="pt-6">
          <Button onClick={onSaveConfig} disabled={disabled} className="w-full">
            Save Timeout Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}