'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Gamepad2, 
  Zap, 
  FileText, 
  Settings, 
  Wifi, 
  WifiOff, 
  Sun, 
  Moon,
  Menu,
  X
} from "lucide-react"

interface NavbarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  connected: boolean
  darkMode: boolean
  onToggleDarkMode: () => void
}

const navigationItems = [
  { id: 'control', label: 'Control', icon: Gamepad2 },
  { id: 'speed', label: 'Speed', icon: Zap },
  { id: 'command', label: 'Command', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Navbar({ 
  activeTab, 
  onTabChange, 
  connected, 
  darkMode, 
  onToggleDarkMode 
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">ESP32 Palletizer</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Advanced Robotics Control
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => onTabChange(item.id)}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-md
                      ${activeTab === item.id ? 'nav-active' : 'nav-inactive'}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                )
              })}
            </div>

            <div className="flex items-center space-x-3">
              <Badge 
                variant={connected ? "default" : "destructive"} 
                className="hidden sm:flex items-center space-x-1"
              >
                {connected ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Offline</span>
                  </>
                )}
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleDarkMode}
                className="w-9 h-9 p-0"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-9 h-9 p-0"
              >
                {mobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          <div className="fixed top-16 inset-x-0 bg-background border-b p-4 space-y-2">
            <div className="flex items-center justify-center mb-4">
              <Badge 
                variant={connected ? "default" : "destructive"} 
                className="flex items-center space-x-1"
              >
                {connected ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Offline</span>
                  </>
                )}
              </Badge>
            </div>
            
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    onTabChange(item.id)
                    setMobileMenuOpen(false)
                  }}
                  className={`
                    w-full justify-start space-x-3
                    ${activeTab === item.id ? 'nav-active' : 'nav-inactive'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}