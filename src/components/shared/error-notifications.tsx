'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  AlertTriangle, 
  X, 
  CheckCircle, 
  Info, 
  XCircle,
  Bell,
  BellOff,
  Minimize2,
  Maximize2,
  Clock,
  Copy
} from "lucide-react"

interface ErrorNotification {
  id: string
  type: 'error' | 'warning' | 'info' | 'success'
  title?: string
  message: string
  timestamp: number
  duration?: number
  persistent?: boolean
  action?: {
    label: string
    onClick: () => void
  }
  category?: string
}

interface ErrorNotificationsProps {
  notifications: ErrorNotification[]
  onDismiss: (id: string) => void
  onDismissAll: () => void
  onMute?: () => void
  onUnmute?: () => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
  maxVisible?: number
  showTimestamp?: boolean
  groupByCategory?: boolean
  muted?: boolean
  className?: string
}

export default function ErrorNotifications({
  notifications,
  onDismiss,
  onDismissAll,
  onMute,
  onUnmute,
  position = 'top-right',
  maxVisible = 5,
  showTimestamp = true,
  groupByCategory = false,
  muted = false,
  className = ''
}: ErrorNotificationsProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    const timers: { [key: string]: NodeJS.Timeout } = {}

    notifications.forEach(notification => {
      if (!notification.persistent && notification.duration && !timers[notification.id]) {
        timers[notification.id] = setTimeout(() => {
          onDismiss(notification.id)
        }, notification.duration)
      }
    })

    return () => {
      Object.values(timers).forEach(timer => clearTimeout(timer))
    }
  }, [notifications, onDismiss])

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      default:
        return 'top-4 right-4'
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  const getProgress = (notification: ErrorNotification) => {
    if (!notification.duration || notification.persistent) return 100
    const elapsed = Date.now() - notification.timestamp
    const progress = Math.max(0, 100 - (elapsed / notification.duration) * 100)
    return progress
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const groupedNotifications = groupByCategory 
    ? notifications.reduce((groups, notification) => {
        const category = notification.category || 'General'
        if (!groups[category]) groups[category] = []
        groups[category].push(notification)
        return groups
      }, {} as { [key: string]: ErrorNotification[] })
    : { 'All': notifications }

  const visibleNotifications = notifications.slice(0, maxVisible)
  const hiddenCount = Math.max(0, notifications.length - maxVisible)

  if (notifications.length === 0) return null

  if (collapsed) {
    return (
      <div className={`fixed ${getPositionClasses()} z-50 ${className}`}>
        <div className="flex items-center gap-2 p-2 bg-background border rounded-lg shadow-lg">
          <Badge variant="outline" className="text-xs">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(false)}
            className="h-6 w-6 p-0"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 space-y-2 max-w-md w-full ${className}`}>
      {notifications.length > 1 && (
        <div className="flex items-center justify-between p-2 bg-background border rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {notifications.length} notifications
            </Badge>
            {hiddenCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{hiddenCount} more
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {(onMute || onUnmute) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={muted ? onUnmute : onMute}
                className="h-6 w-6 p-0"
              >
                {muted ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(true)}
              className="h-6 w-6 p-0"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismissAll}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {visibleNotifications.map((notification) => {
        const progress = getProgress(notification)
        const isHovered = hoveredId === notification.id

        return (
          <Alert
            key={notification.id}
            variant={getVariant(notification.type)}
            className="shadow-lg transition-all duration-200 hover:shadow-xl"
            onMouseEnter={() => setHoveredId(notification.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {getIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  {notification.title && (
                    <AlertTitle className="text-sm font-medium mb-1">
                      {notification.title}
                    </AlertTitle>
                  )}
                  <AlertDescription className="text-sm break-words">
                    {notification.message}
                  </AlertDescription>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {showTimestamp && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(notification.timestamp)}</span>
                          <span>({getTimeAgo(notification.timestamp)})</span>
                        </div>
                      )}
                      {notification.category && (
                        <Badge variant="outline" className="text-xs">
                          {notification.category}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {notification.action && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={notification.action.onClick}
                          className="text-xs h-6"
                        >
                          {notification.action.label}
                        </Button>
                      )}
                      {isHovered && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`[${notification.type.toUpperCase()}] ${notification.message}`)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(notification.id)}
                className="h-6 w-6 p-0 ml-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            {!notification.persistent && notification.duration && (
              <div className="mt-2">
                <Progress 
                  value={progress} 
                  className="h-1"
                />
              </div>
            )}
          </Alert>
        )
      })}

      {groupByCategory && Object.keys(groupedNotifications).length > 1 && (
        <div className="p-2 bg-muted/50 border rounded-lg">
          <div className="text-xs text-muted-foreground">Categories:</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(groupedNotifications).map(([category, items]) => (
              <Badge key={category} variant="outline" className="text-xs">
                {category} ({items.length})
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}