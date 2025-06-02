'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Download, 
  Upload, 
  FileText, 
  Archive, 
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Copy,
  Database
} from "lucide-react"

interface BackupData {
  speedLimits: any
  timeoutConfig: any
  systemPrefs: any
  exportDate: string
  version: string
  deviceInfo?: {
    userAgent: string
    timestamp: number
  }
}

interface BackupItem {
  name: string
  date: string
  size: string
  version: string
  type: 'manual' | 'auto'
}

interface ImportExportProps {
  onExportSettings: () => BackupData
  onImportSettings: (data: BackupData) => Promise<boolean>
  onCreateBackup: () => Promise<void>
  onRestoreBackup: (backupId: string) => Promise<void>
  disabled?: boolean
}

export default function ImportExport({
  onExportSettings,
  onImportSettings,
  onCreateBackup,
  onRestoreBackup,
  disabled = false
}: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [lastOperation, setLastOperation] = useState<'import' | 'export' | null>(null)
  const [autoBackup, setAutoBackup] = useState(true)
  const [backupInterval, setBackupInterval] = useState(24)
  
  const [recentBackups] = useState<BackupItem[]>([
    {
      name: 'Auto Backup - Daily',
      date: '2024-01-15 08:00',
      size: '2.4 KB',
      version: '1.0',
      type: 'auto'
    },
    {
      name: 'Manual Backup - Before Update',
      date: '2024-01-14 15:30',
      size: '2.3 KB',
      version: '1.0',
      type: 'manual'
    },
    {
      name: 'Configuration Snapshot',
      date: '2024-01-13 12:15',
      size: '2.1 KB',
      version: '1.0',
      type: 'manual'
    }
  ])

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = onExportSettings()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `palletizer_settings_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setLastOperation('export')
    } finally {
      setExporting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImport(file)
    }
  }

  const handleImport = async (file: File) => {
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text) as BackupData
      const success = await onImportSettings(data)
      if (success) {
        setLastOperation('import')
      }
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setImporting(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'))
    
    if (jsonFile) {
      handleImport(jsonFile)
    }
  }

  const copyConfigToClipboard = async () => {
    try {
      const data = onExportSettings()
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${Math.round(bytes / (1024 * 1024))} MB`
  }

  const getBackupIcon = (type: 'manual' | 'auto') => {
    return type === 'auto' ? <Clock className="w-4 h-4" /> : <FileText className="w-4 h-4" />
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Backup & Restore
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleExport}
              disabled={disabled || exporting}
              className="h-12 flex flex-col items-center justify-center gap-1"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs">
                {exporting ? 'Exporting...' : 'Export Settings'}
              </span>
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || importing}
              variant="outline"
              className="h-12 flex flex-col items-center justify-center gap-1"
            >
              <Upload className="w-4 h-4" />
              <span className="text-xs">
                {importing ? 'Importing...' : 'Import Settings'}
              </span>
            </Button>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-primary'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium mb-1">
              {importing ? 'Processing...' : 'Drop configuration file here'}
            </p>
            <p className="text-xs text-gray-500">Supports .json files</p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
            className="hidden"
          />

          <div className="space-y-3">
            <Label>Quick Actions</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={copyConfigToClipboard}>
                <Copy className="w-3 h-3 mr-1" />
                Copy Config
              </Button>
              <Button variant="outline" size="sm" onClick={onCreateBackup}>
                <Database className="w-3 h-3 mr-1" />
                Create Backup
              </Button>
            </div>
          </div>

          {lastOperation && (
            <div className={`flex items-center gap-2 p-2 rounded-md ${
              lastOperation === 'export' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
            }`}>
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                {lastOperation === 'export' ? 'Settings exported successfully' : 'Settings imported successfully'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Backup Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatic Backup</Label>
              <p className="text-xs text-muted-foreground">
                Create backups automatically
              </p>
            </div>
            <Switch
              checked={autoBackup}
              onCheckedChange={setAutoBackup}
              disabled={disabled}
            />
          </div>

          {autoBackup && (
            <div className="space-y-2">
              <Label>Backup Interval (hours)</Label>
              <Input
                type="number"
                value={backupInterval}
                onChange={(e) => setBackupInterval(parseInt(e.target.value) || 24)}
                min={1}
                max={168}
                className="w-24"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Next backup in {backupInterval} hours
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Storage Status</Label>
              <Badge variant="outline">3 backups</Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Used</span>
                <span>7.2 KB / 1 MB</span>
              </div>
              <Progress value={0.72} className="h-2" />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Backup Contents</Label>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Speed limits configuration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Timeout settings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>System preferences</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span>User scripts (optional)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentBackups.map((backup, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getBackupIcon(backup.type)}
                  <div>
                    <div className="font-medium text-sm">{backup.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {backup.date} • {backup.size} • v{backup.version}
                    </div>
                  </div>
                  <Badge variant={backup.type === 'auto' ? 'default' : 'outline'} className="text-xs">
                    {backup.type}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRestoreBackup(backup.name)}
                    disabled={disabled}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {recentBackups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No backups found</p>
              <p className="text-xs">Create your first backup to get started</p>
            </div>
          )}

          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="text-xs space-y-1">
                  <li>• Backups are stored locally in your browser</li>
                  <li>• Export settings for permanent storage</li>
                  <li>• Clearing browser data will remove backups</li>
                  <li>• Always verify imported configurations</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}