'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Wifi,
  Server,
  Zap,
  Save,
  RotateCcw,
  AlertTriangle,
  Palette
} from 'lucide-react'
import { useTheme } from './theme-provider'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNotification?: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void
}

export function SettingsModal({ open, onOpenChange, onNotification }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  
  // Connection Settings
  const [serverUrl, setServerUrl] = useState('http://localhost:3006')
  const [autoConnect, setAutoConnect] = useState(true)
  const [connectionTimeout, setConnectionTimeout] = useState(5000)

  // Performance Settings
  const [pollInterval, setPollInterval] = useState(2000)
  const [autoCompile, setAutoCompile] = useState(true)
  const [compileDelay, setCompileDelay] = useState(1000)

  // Debug Settings
  const [debugEnabled, setDebugEnabled] = useState(true)
  const [maxLogMessages, setMaxLogMessages] = useState(1000)
  const [logLevel, setLogLevel] = useState('INFO')

  // Safety Settings
  const [emergencyStop, setEmergencyStop] = useState(true)
  const [confirmDangerousCommands, setConfirmDangerousCommands] = useState(true)
  const [maxSpeed, setMaxSpeed] = useState([10000])

  const handleSaveSettings = () => {
    const settings = {
      connection: {
        serverUrl,
        autoConnect,
        connectionTimeout
      },
      performance: {
        pollInterval,
        autoCompile,
        compileDelay
      },
      debug: {
        debugEnabled,
        maxLogMessages,
        logLevel
      },
      safety: {
        emergencyStop,
        confirmDangerousCommands,
        maxSpeed: maxSpeed[0]
      }
    }

    // Save to localStorage
    localStorage.setItem('palletizer_settings', JSON.stringify(settings))
    onNotification?.('Settings saved successfully', 'success')
    onOpenChange(false)
  }

  const handleResetSettings = () => {
    setServerUrl('http://localhost:3006')
    setAutoConnect(true)
    setConnectionTimeout(5000)
    setPollInterval(2000)
    setAutoCompile(true)
    setCompileDelay(1000)
    setDebugEnabled(true)
    setMaxLogMessages(1000)
    setLogLevel('INFO')
    setEmergencyStop(true)
    setConfirmDangerousCommands(true)
    setMaxSpeed([10000])
    onNotification?.('Settings reset to defaults', 'info')
  }

  const handleTestConnection = async () => {
    try {
      const response = await fetch(`${serverUrl}/health`)
      if (response.ok) {
        onNotification?.('Connection test successful', 'success')
      } else {
        onNotification?.('Connection test failed', 'error')
      }
    } catch {
      onNotification?.('Connection test failed', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Settings
          </DialogTitle>
          <DialogDescription>
            Configure system settings, connection parameters, and safety options.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Connection Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="server-url">Server URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="server-url"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://localhost:3006"
                    />
                    <Button onClick={handleTestConnection} variant="outline">
                      Test
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-connect">Auto Connect on Startup</Label>
                  <Switch
                    id="auto-connect"
                    checked={autoConnect}
                    onCheckedChange={setAutoConnect}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout">Connection Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={connectionTimeout}
                    onChange={(e) => setConnectionTimeout(Number(e.target.value))}
                    min="1000"
                    max="30000"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Theme Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme Mode</Label>
                  <div className="flex gap-2">
                    {[
                      { value: 'light', label: 'Light', desc: 'Light theme' },
                      { value: 'dark', label: 'Dark', desc: 'Dark theme' },
                      { value: 'system', label: 'System', desc: 'Follow system preference' }
                    ].map((themeOption) => (
                      <Badge
                        key={themeOption.value}
                        variant={theme === themeOption.value ? "default" : "outline"}
                        className="cursor-pointer px-3 py-2 h-auto flex-col gap-1"
                        onClick={() => setTheme(themeOption.value as 'light' | 'dark' | 'system')}
                      >
                        <span className="font-medium">{themeOption.label}</span>
                        <span className="text-xs text-muted-foreground">{themeOption.desc}</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Interface Density</Label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Compact interface elements</span>
                    <Switch defaultChecked={false} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Animations</Label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Enable smooth transitions</span>
                    <Switch defaultChecked={true} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color Accent</Label>
                  <div className="text-xs text-muted-foreground mb-2">
                    Current theme: <span className="capitalize text-primary font-medium">{theme}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {['green', 'blue', 'purple', 'red', 'orange', 'pink'].map((color) => (
                      <div
                        key={color}
                        className={`w-8 h-8 rounded-md cursor-pointer border-2 ${
                          color === 'green' ? 'border-primary' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: `hsl(var(--${color === 'green' ? 'primary' : color}))` }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Performance Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="poll-interval">Status Poll Interval (ms)</Label>
                  <Input
                    id="poll-interval"
                    type="number"
                    value={pollInterval}
                    onChange={(e) => setPollInterval(Number(e.target.value))}
                    min="500"
                    max="10000"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-compile">Auto Compile Scripts</Label>
                  <Switch
                    id="auto-compile"
                    checked={autoCompile}
                    onCheckedChange={setAutoCompile}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compile-delay">Compile Delay (ms)</Label>
                  <Input
                    id="compile-delay"
                    type="number"
                    value={compileDelay}
                    onChange={(e) => setCompileDelay(Number(e.target.value))}
                    min="100"
                    max="5000"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Debug Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="debug-enabled">Enable Debug Logging</Label>
                  <Switch
                    id="debug-enabled"
                    checked={debugEnabled}
                    onCheckedChange={setDebugEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-messages">Max Log Messages</Label>
                  <Input
                    id="max-messages"
                    type="number"
                    value={maxLogMessages}
                    onChange={(e) => setMaxLogMessages(Number(e.target.value))}
                    min="100"
                    max="10000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Log Level</Label>
                  <div className="flex gap-2">
                    {['DEBUG', 'INFO', 'WARN', 'ERROR'].map((level) => (
                      <Badge
                        key={level}
                        variant={logLevel === level ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setLogLevel(level)}
                      >
                        {level}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safety" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Safety Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emergency-stop">Emergency Stop Enabled</Label>
                  <Switch
                    id="emergency-stop"
                    checked={emergencyStop}
                    onCheckedChange={setEmergencyStop}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="confirm-dangerous">Confirm Dangerous Commands</Label>
                  <Switch
                    id="confirm-dangerous"
                    checked={confirmDangerousCommands}
                    onCheckedChange={setConfirmDangerousCommands}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Maximum Speed Limit: {maxSpeed[0]} mm/min</Label>
                  <Slider
                    value={maxSpeed}
                    onValueChange={setMaxSpeed}
                    min={100}
                    max={15000}
                    step={100}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-between">
          <Button onClick={handleResetSettings} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          
          <div className="flex gap-2">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}