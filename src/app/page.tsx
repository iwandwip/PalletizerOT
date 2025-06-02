'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X } from "lucide-react"
import Navbar from '@/components/navigation/navbar'
import ControlPage from '@/components/pages/control-page'
import SpeedPage from '@/components/pages/speed-page'
import CommandPage from '@/components/pages/command-page'
import SettingsPage from '@/components/pages/settings-page'
import DebugTerminal from '@/components/shared/debug-terminal'
import { useRealtime } from '@/lib/hooks'

interface ErrorNotification {
  id: string
  message: string
  type: 'error' | 'warning' | 'info'
}

export default function PalletizerControl() {
  const [activeTab, setActiveTab] = useState('control')
  const [darkMode, setDarkMode] = useState(false)
  const [errors, setErrors] = useState<ErrorNotification[]>([])
  const [showDebugTerminal, setShowDebugTerminal] = useState(true)

  const { connected } = useRealtime()

  const addError = (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    const id = Date.now().toString()
    setErrors(prev => [...prev, { id, message, type }])
    
    setTimeout(() => {
      setErrors(prev => prev.filter(err => err.id !== id))
    }, 5000)
  }

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(err => err.id !== id))
  }

  useEffect(() => {
    if (!connected) {
      addError('ESP32 disconnected - Check device connection', 'warning')
    }
  }, [connected])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const isDark = savedTheme === 'dark'
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const handleToggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newMode)
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'control':
        return <ControlPage onError={addError} />
      case 'speed':
        return <SpeedPage onError={addError} />
      case 'command':
        return <CommandPage onError={addError} />
      case 'settings':
        return <SettingsPage onError={addError} />
      default:
        return <ControlPage onError={addError} />
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {errors.map((error) => (
          <Alert
            key={error.id}
            variant={error.type === 'error' ? 'destructive' : 'default'}
            className="shadow-lg"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              <span>{error.message}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeError(error.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </AlertDescription>
          </Alert>
        ))}
      </div>

      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connected={connected}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <main className="container mx-auto p-4 pb-80">
        {renderActiveTab()}
      </main>

      {showDebugTerminal && (
        <DebugTerminal 
          onToggle={() => setShowDebugTerminal(!showDebugTerminal)}
        />
      )}
    </div>
  )
}