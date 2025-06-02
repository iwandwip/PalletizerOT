'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Gauge, 
  Clock, 
  Monitor, 
  Download, 
  Upload,
  RotateCcw,
  Save,
  AlertTriangle
} from "lucide-react"
import { api } from '@/lib/api'

interface SpeedLimits {
  x: number
  y: number
  z: number
  t: number
  g: number
  emergency: number
}

interface TimeoutConfig {
  maxWaitTime: number
  strategy: number
  maxTimeoutWarning: number
  autoRetryCount: number
  saveToFile: boolean
}

interface SystemPreferences {
  autoSave: boolean
  darkMode: boolean
  debugAutoOpen: boolean
  soundNotifications: boolean
  language: string
  theme: string
}

interface SettingsPageProps {
  onError: (message: string, type?: 'error' | 'warning' | 'info') => void
}

export default function SettingsPage({ onError }: SettingsPageProps) {
  const [speedLimits, setSpeedLimits] = useState<SpeedLimits>({
    x: 2000,
    y: 1500,
    z: 1000,
    t: 800,
    g: 1200,
    emergency: 500
  })

  const [timeoutConfig, setTimeoutConfig] = useState<TimeoutConfig>({
    maxWaitTime: 30000,
    strategy: 0,
    maxTimeoutWarning: 5,
    autoRetryCount: 0,
    saveToFile: true
  })

  const [systemPrefs, setSystemPrefs] = useState<SystemPreferences>({
    autoSave: true,
    darkMode: false,
    debugAutoOpen: true,
    soundNotifications: false,
    language: 'English',
    theme: 'Modern'
  })

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const strategyOptions = [
    { value: 0, label: 'Skip & Continue', description: 'Skip timeout and continue execution' },
    { value: 1, label: 'Pause System', description: 'Pause system for manual intervention' },
    { value: 2, label: 'Abort & Reset', description: 'Abort sequence and reset system' },
    { value: 3, label: 'Retry with Backoff', description: 'Retry with increasing delays' }
  ]

  const updateSpeedLimit = (axis: keyof SpeedLimits, value: number) => {
    setSpeedLimits(prev => ({ ...prev, [axis]: value }))
    setHasUnsavedChanges(true)
  }

  const updateTimeoutConfig = (updates: Partial<TimeoutConfig>) => {
    setTimeoutConfig(prev => ({ ...prev, ...updates }))
    setHasUnsavedChanges(true)
  }

  const updateSystemPrefs = (updates: Partial<SystemPreferences>) => {
    setSystemPrefs(prev => ({ ...prev, ...updates }))
    setHasUnsavedChanges(true)
  }

  const saveAllSettings = async () => {
    try {
      await api.saveTimeoutConfig(timeoutConfig)
      
      localStorage.setItem('speedLimits', JSON.stringify(speedLimits))
      localStorage.setItem('systemPrefs', JSON.stringify(systemPrefs))
      
      setHasUnsavedChanges(false)
      onError('All settings saved successfully', 'info')
    } catch (error) {
      onError('Failed to save some settings', 'error')
    }
  }

  const resetToDefaults = () => {
    setSpeedLimits({
      x: 2000,
      y: 1500,
      z: 1000,
      t: 800,
      g: 1200,
      emergency: 500
    })
    
    setTimeoutConfig({
      maxWaitTime: 30000,
      strategy: 0,
      maxTimeoutWarning: 5,
      autoRetryCount: 0,
      saveToFile: true
    })
    
    setSystemPrefs({
      autoSave: true,
      darkMode: false,
      debugAutoOpen: true,
      soundNotifications: false,
      language: 'English',
      theme: 'Modern'
    })
    
    setHasUnsavedChanges(true)
    onError('Settings reset to defaults', 'info')
  }

  const exportSettings = () => {
    const settings = {
      speedLimits,
      timeoutConfig,
      systemPrefs,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `palletizer_settings_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    onError('Settings exported successfully', 'info')
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string)
        
        if (settings.speedLimits) setSpeedLimits(settings.speedLimits)
        if (settings.timeoutConfig) setTimeoutConfig(settings.timeoutConfig)
        if (settings.systemPrefs) setSystemPrefs(settings.systemPrefs)
        
        setHasUnsavedChanges(true)
        onError('Settings imported successfully', 'info')
      } catch (error) {
        onError('Failed to import settings - Invalid file format', 'error')
      }
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    const savedSpeedLimits = localStorage.getItem('speedLimits')
    const savedSystemPrefs = localStorage.getItem('systemPrefs')
    
    if (savedSpeedLimits) {
      setSpeedLimits(JSON.parse(savedSpeedLimits))
    }
    
    if (savedSystemPrefs) {
      setSystemPrefs(JSON.parse(savedSystemPrefs))
    }

    const loadTimeoutConfig = async () => {
      try {
        const config = await api.getTimeoutConfig()
        setTimeoutConfig(config)
      } catch (error) {
        console.error('Failed to load timeout config')
      }
    }
    
    loadTimeoutConfig()
  }, [])

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <span className="text-2xl">⚙️</span>
          System Configuration
        </h1>
        <p className="text-muted-foreground">Manage system settings and preferences</p>
        
        {hasUnsavedChanges && (
          <div className="flex items-center justify-center gap-2 text-orange-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">You have unsaved changes</span>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3 mb-6">
        <Button onClick={saveAllSettings} disabled={!hasUnsavedChanges} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save All Settings
        </Button>
        <Button variant="outline" onClick={resetToDefaults} className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
        <Button variant="outline" onClick={exportSettings} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
        <Button variant="outline" asChild className="flex items-center gap-2">
          <label>
            <Upload className="w-4 h-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={importSettings}
              className="hidden"
            />
          </label>
        </Button>
      </div>

      <Tabs defaultValue="speed" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="speed" className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Speed Limits
          </TabsTrigger>
          <TabsTrigger value="timeout" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timeout
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="speed" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Individual Axis Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(speedLimits).filter(([key]) => key !== 'emergency').map(([axis, value]) => (
                  <div key={axis} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{axis.toUpperCase()} Max Speed</Label>
                      <Badge variant="outline">{value}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[value]}
                        onValueChange={(val) => updateSpeedLimit(axis as keyof SpeedLimits, val[0])}
                        max={3000}
                        min={100}
                        step={50}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) => updateSpeedLimit(axis as keyof SpeedLimits, parseInt(e.target.value) || 100)}
                        min={100}
                        max={3000}
                        className="w-20"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Safety Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Emergency Speed Limit</Label>
                    <Badge variant="destructive">{speedLimits.emergency}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[speedLimits.emergency]}
                      onValueChange={(val) => updateSpeedLimit('emergency', val[0])}
                      max={1000}
                      min={50}
                      step={25}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={speedLimits.emergency}
                      onChange={(e) => updateSpeedLimit('emergency', parseInt(e.target.value) || 50)}
                      min={50}
                      max={1000}
                      className="w-20"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maximum speed allowed during emergency conditions
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium">Speed Recommendations</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Precision Work:</span>
                      <span className="text-muted-foreground">50-200</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Normal Operation:</span>
                      <span className="text-muted-foreground">200-800</span>
                    </div>
                    <div className="flex justify-between">
                      <span>High Speed:</span>
                      <span className="text-muted-foreground">800-1500</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeout" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Wait Timeout Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Wait Timeout: {timeoutConfig.maxWaitTime / 1000}s</Label>
                  <Slider
                    value={[timeoutConfig.maxWaitTime]}
                    onValueChange={(value) => updateTimeoutConfig({ maxWaitTime: value[0] })}
                    min={5000}
                    max={300000}
                    step={1000}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5s</span>
                    <span>300s</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warning Threshold</Label>
                    <Input
                      type="number"
                      value={timeoutConfig.maxTimeoutWarning}
                      onChange={(e) => updateTimeoutConfig({ maxTimeoutWarning: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Auto Retry Count</Label>
                    <Input
                      type="number"
                      value={timeoutConfig.autoRetryCount}
                      onChange={(e) => updateTimeoutConfig({ autoRetryCount: parseInt(e.target.value) || 0 })}
                      min={0}
                      max={5}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={timeoutConfig.saveToFile}
                    onCheckedChange={(checked) => updateTimeoutConfig({ saveToFile: checked })}
                  />
                  <Label>Auto-save timeout configuration</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeout Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {strategyOptions.map((option) => (
                  <div key={option.value} className="space-y-2">
                    <Button
                      variant={timeoutConfig.strategy === option.value ? "default" : "outline"}
                      onClick={() => updateTimeoutConfig({ strategy: option.value })}
                      className="w-full justify-start text-left"
                    >
                      {option.label}
                    </Button>
                    <p className="text-xs text-muted-foreground px-3">
                      {option.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-save settings</Label>
                    <p className="text-xs text-muted-foreground">Automatically save changes</p>
                  </div>
                  <Switch
                    checked={systemPrefs.autoSave}
                    onCheckedChange={(checked) => updateSystemPrefs({ autoSave: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark mode</Label>
                    <p className="text-xs text-muted-foreground">Use dark color scheme</p>
                  </div>
                  <Switch
                    checked={systemPrefs.darkMode}
                    onCheckedChange={(checked) => updateSystemPrefs({ darkMode: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Debug auto-open</Label>
                    <p className="text-xs text-muted-foreground">Open debug terminal on startup</p>
                  </div>
                  <Switch
                    checked={systemPrefs.debugAutoOpen}
                    onCheckedChange={(checked) => updateSystemPrefs({ debugAutoOpen: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sound notifications</Label>
                    <p className="text-xs text-muted-foreground">Play sounds for alerts</p>
                  </div>
                  <Switch
                    checked={systemPrefs.soundNotifications}
                    onCheckedChange={(checked) => updateSystemPrefs({ soundNotifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interface Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input
                    value={systemPrefs.language}
                    onChange={(e) => updateSystemPrefs({ language: e.target.value })}
                    placeholder="English"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Input
                    value={systemPrefs.theme}
                    onChange={(e) => updateSystemPrefs({ theme: e.target.value })}
                    placeholder="Modern"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      Clear Cache
                    </Button>
                    <Button variant="outline" size="sm">
                      Reset UI
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Advanced settings will be available in future updates</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}