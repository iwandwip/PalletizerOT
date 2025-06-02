'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Home, Square, Power, Shield } from "lucide-react"

interface EmergencyControlsProps {
  onHomeAll: () => void
  onStopAll: () => void
  onEmergencyStop: () => void
  emergencyActive?: boolean
  disabled?: boolean
}

export default function EmergencyControls({
  onHomeAll,
  onStopAll,
  onEmergencyStop,
  emergencyActive = false,
  disabled = false
}: EmergencyControlsProps) {
  const [confirmingEmergency, setConfirmingEmergency] = useState(false)
  const [confirmingHomeAll, setConfirmingHomeAll] = useState(false)

  useEffect(() => {
    if (emergencyActive) {
      const timer = setTimeout(() => {
        setConfirmingEmergency(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [emergencyActive])

  const handleEmergencyClick = () => {
    if (confirmingEmergency) {
      onEmergencyStop()
      setConfirmingEmergency(false)
    } else {
      setConfirmingEmergency(true)
      setTimeout(() => setConfirmingEmergency(false), 3000)
    }
  }

  const handleHomeAllClick = () => {
    if (confirmingHomeAll) {
      onHomeAll()
      setConfirmingHomeAll(false)
    } else {
      setConfirmingHomeAll(true)
      setTimeout(() => setConfirmingHomeAll(false), 3000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Emergency Controls
          </div>
          {emergencyActive && (
            <Badge variant="destructive" className="animate-pulse">
              EMERGENCY ACTIVE
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={handleHomeAllClick}
            disabled={disabled || emergencyActive}
            className={`h-12 transition-all ${
              confirmingHomeAll
                ? 'bg-blue-700 text-white animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Home className="w-4 h-4 mr-2" />
            {confirmingHomeAll ? 'CONFIRM HOME ALL' : 'HOME ALL AXES'}
          </Button>
          
          <Button
            onClick={onStopAll}
            disabled={disabled || emergencyActive}
            variant="outline"
            className="h-12 border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <Square className="w-4 h-4 mr-2" />
            STOP ALL
          </Button>
          
          <Button
            onClick={handleEmergencyClick}
            className={`h-12 font-bold transition-all ${
              emergencyActive
                ? 'bg-gray-500 cursor-not-allowed text-white'
                : confirmingEmergency
                  ? 'bg-red-800 text-white animate-pulse'
                  : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            disabled={emergencyActive}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {emergencyActive 
              ? 'STOPPING...' 
              : confirmingEmergency 
                ? 'CONFIRM E-STOP' 
                : 'EMERGENCY STOP'
            }
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className={`w-4 h-4 rounded-full mx-auto ${
              emergencyActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'
            }`} />
            <p className="text-xs text-muted-foreground">
              {emergencyActive ? 'Emergency' : 'Normal'}
            </p>
          </div>
          
          <div className="space-y-1">
            <Power className="w-4 h-4 mx-auto text-green-600" />
            <p className="text-xs text-muted-foreground">Power OK</p>
          </div>
          
          <div className="space-y-1">
            <Shield className="w-4 h-4 mx-auto text-blue-600" />
            <p className="text-xs text-muted-foreground">Safety ON</p>
          </div>
        </div>

        {confirmingEmergency && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700 text-center font-medium">
              ⚠️ Click again to confirm Emergency Stop
            </p>
          </div>
        )}

        {confirmingHomeAll && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700 text-center font-medium">
              🏠 Click again to confirm Home All Axes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}