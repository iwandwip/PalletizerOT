'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Monitor, 
  Volume2, 
  Moon, 
  Sun, 
  Palette, 
  Globe, 
  Save,
  Trash2,
  RotateCcw,
  Zap
} from "lucide-react"

interface SystemPreferences {
  autoSave: boolean
  darkMode: boolean
  debugAutoOpen: boolean
  soundNotifications: boolean
  language: string
  theme: string
  animationsEnabled: boolean
  compactMode: boolean
  autoRefresh: boolean
  refreshInterval: number
}

interface SystemPreferencesProps {
  preferences: SystemPreferences
  onPreferencesChange: (updates: Partial<SystemPreferences>) => void
  onSavePreferences: () => Promise<void>
  onResetPreferences: () => void
  onClearCache: () => void
  disabled?: boolean
}

const languageOptions = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' }
]

const themeOptions = [
  { value: 'modern', name: 'Modern', description: 'Clean and minimal design' },
  { value: 'classic', name: 'Classic', description: 'Traditional interface' },
  { value: 'compact', name: 'Compact', description: 'Space-efficient layout' },
  { value: 'industrial', name: 'Industrial', description: 'Professional appearance' }
]

export default function SystemPreferences({
  preferences,
  onPreferencesChange,
  onSavePreferences,
  onResetPreferences,
  onClearCache,
  disabled = false
}: SystemPreferencesProps) {
  const handleToggle = (key: keyof SystemPreferences) => {
    onPreferencesChange({ [key]: !preferences[key] })
  }

  const handleInputChange = (key: keyof SystemPreferences, value: string | number) => {
    onPreferencesChange({ [key]: value })
  }

  const currentLanguage = languageOptions.find(lang => lang.code === preferences.language) || languageOptions[0]
  const currentTheme = themeOptions.find(theme => theme.value === preferences.theme) || themeOptions[0]

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Interface Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                {preferences.darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                Dark Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Use dark color scheme for better visibility
              </p>
            </div>
            <Switch
              checked={preferences.darkMode}
              onCheckedChange={() => handleToggle('darkMode')}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Compact Mode</Label>
              <p className="text-xs text-muted-foreground">
                Reduce spacing and element sizes
              </p>
            </div>
            <Switch
              checked={preferences.compactMode}
              onCheckedChange={() => handleToggle('compactMode')}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Animations</Label>
              <p className="text-xs text-muted-foreground">
                Enable smooth transitions and effects
              </p>
            </div>
            <Switch
              checked={preferences.animationsEnabled}
              onCheckedChange={() => handleToggle('animationsEnabled')}
              disabled={disabled}
            />
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Theme
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {themeOptions.map((theme) => (
                <Button
                  key={theme.value}
                  variant={preferences.theme === theme.value ? "default" : "outline"}
                  onClick={() => handleInputChange('theme', theme.value)}
                  className="h-auto p-3 flex flex-col items-start"
                  disabled={disabled}
                >
                  <span className="font-medium">{theme.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {theme.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Language
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {languageOptions.map((lang) => (
                <Button
                  key={lang.code}
                  variant={preferences.language === lang.code ? "default" : "outline"}
                  onClick={() => handleInputChange('language', lang.code)}
                  className="justify-start"
                  disabled={disabled}
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Application Behavior
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Save Settings</Label>
              <p className="text-xs text-muted-foreground">
                Automatically save changes as you make them
              </p>
            </div>
            <Switch
              checked={preferences.autoSave}
              onCheckedChange={() => handleToggle('autoSave')}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Debug Terminal Auto-Open</Label>
              <p className="text-xs text-muted-foreground">
                Open debug terminal automatically on startup
              </p>
            </div>
            <Switch
              checked={preferences.debugAutoOpen}
              onCheckedChange={() => handleToggle('debugAutoOpen')}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Sound Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Play sounds for alerts and notifications
              </p>
            </div>
            <Switch
              checked={preferences.soundNotifications}
              onCheckedChange={() => handleToggle('soundNotifications')}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Refresh Data</Label>
              <p className="text-xs text-muted-foreground">
                Automatically refresh system status
              </p>
            </div>
            <Switch
              checked={preferences.autoRefresh}
              onCheckedChange={() => handleToggle('autoRefresh')}
              disabled={disabled}
            />
          </div>

          {preferences.autoRefresh && (
            <div className="space-y-2">
              <Label>Refresh Interval (seconds)</Label>
              <Input
                type="number"
                value={preferences.refreshInterval}
                onChange={(e) => handleInputChange('refreshInterval', parseInt(e.target.value) || 5)}
                min={1}
                max={60}
                className="w-24"
                disabled={disabled}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Theme</div>
              <Badge variant="outline" className="mt-1">
                {currentTheme.name}
              </Badge>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Language</div>
              <Badge variant="outline" className="mt-1">
                {currentLanguage.flag} {currentLanguage.name}
              </Badge>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Mode</div>
              <Badge variant="outline" className="mt-1">
                {preferences.darkMode ? 'Dark' : 'Light'}
              </Badge>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Layout</div>
              <Badge variant="outline" className="mt-1">
                {preferences.compactMode ? 'Compact' : 'Normal'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Button onClick={onSavePreferences} disabled={disabled}>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
            
            <Button variant="outline" onClick={onResetPreferences} disabled={disabled}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            
            <Button variant="outline" onClick={onClearCache} disabled={disabled}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cache
            </Button>
            
            <Button variant="outline" disabled>
              <Monitor className="w-4 h-4 mr-2" />
              Reset UI Layout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}