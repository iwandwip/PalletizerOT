'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Save, 
  Upload, 
  Download, 
  FileUp,
  FolderOpen,
  History,
  Trash2
} from "lucide-react"

interface FileManagementProps {
  scriptContent: string
  onSave: () => Promise<void>
  onLoad: () => Promise<void>
  onUpload: (file: File) => Promise<void>
  onDownload: () => void
  disabled?: boolean
}

interface RecentFile {
  name: string
  date: string
  size: number
}

export default function FileManagement({
  scriptContent,
  onSave,
  onLoad,
  onUpload,
  onDownload,
  disabled = false
}: FileManagementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [recentFiles] = useState<RecentFile[]>([
    { name: 'automation_sequence.txt', date: '2024-01-15', size: 1024 },
    { name: 'calibration_script.txt', date: '2024-01-14', size: 512 },
    { name: 'test_movements.txt', date: '2024-01-13', size: 256 },
  ])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleUpload = async (file: File) => {
    setLoading('upload')
    try {
      await onUpload(file)
    } finally {
      setLoading(null)
    }
  }

  const handleSave = async () => {
    setLoading('save')
    try {
      await onSave()
    } finally {
      setLoading(null)
    }
  }

  const handleLoad = async () => {
    setLoading('load')
    try {
      await onLoad()
    } finally {
      setLoading(null)
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
    const textFile = files.find(file => file.type === 'text/plain' || file.name.endsWith('.txt'))
    
    if (textFile) {
      handleUpload(textFile)
    }
  }

  const getFileSize = () => {
    const bytes = new Blob([scriptContent]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${Math.round(bytes / (1024 * 1024))} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    return `${Math.round(bytes / 1024)} KB`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            File Management
          </div>
          <Badge variant="outline" className="text-xs">
            {getFileSize()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleSave} 
            disabled={disabled || loading === 'save'}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading === 'save' ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleLoad}
            disabled={disabled || loading === 'load'}
            className="flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            {loading === 'load' ? 'Loading...' : 'Load'}
          </Button>
        </div>
        
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-primary'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium mb-1">
            {loading === 'upload' ? 'Uploading...' : 'Drop file here or click to upload'}
          </p>
          <p className="text-xs text-gray-500">Supports .txt files</p>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".txt"
          className="hidden"
        />

        <Button 
          variant="outline" 
          onClick={onDownload} 
          className="w-full flex items-center gap-2"
          disabled={!scriptContent.trim() || disabled}
        >
          <Download className="w-4 h-4" />
          Download Script
        </Button>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="w-4 h-4" />
            Recent Files
          </div>
          
          <div className="space-y-2">
            {recentFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(file.date)} • {formatFileSize(file.size)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0"
                    disabled={disabled}
                  >
                    <FolderOpen className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-medium">Supported Formats:</div>
              <div>• Plain Text (.txt)</div>
              <div>• Modern Script Language</div>
            </div>
            <div>
              <div className="font-medium">Auto-Save:</div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Active
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}