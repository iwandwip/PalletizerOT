'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Code2, Type, Hash, Eye, EyeOff } from "lucide-react"

interface ScriptEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  showLineNumbers?: boolean
  showStats?: boolean
}

export default function ScriptEditor({
  value,
  onChange,
  placeholder = "Enter Modern Script Language commands here...",
  disabled = false,
  showLineNumbers = true,
  showStats = true
}: ScriptEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const getLineCount = () => value.split('\n').length
  const getCharacterCount = () => value.length
  const getWordCount = () => value.trim() ? value.trim().split(/\s+/).length : 0

  const getFunctionCount = () => {
    const matches = value.match(/FUNC\([^)]+\)/g)
    return matches ? matches.length : 0
  }

  const getCommandCount = () => {
    const lines = value.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'))
    return lines.length
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2
        }
      }, 0)
    }
  }

  const formatScript = () => {
    const lines = value.split('\n')
    let formatted = ''
    let indentLevel = 0
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        formatted += '\n'
        continue
      }
      
      if (trimmed === '}') {
        indentLevel = Math.max(0, indentLevel - 1)
      }
      
      formatted += '  '.repeat(indentLevel) + trimmed + '\n'
      
      if (trimmed.endsWith('{')) {
        indentLevel++
      }
    }
    
    onChange(formatted.trim())
  }

  const insertTemplate = (template: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = value.substring(0, start) + template + value.substring(end)
    onChange(newValue)
    
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + template.length
    }, 0)
  }

  const quickTemplates = [
    { name: 'FUNC', template: 'FUNC(NAME) {\n  \n}' },
    { name: 'GROUP', template: 'GROUP(X(100), Y(50), Z(10));' },
    { name: 'CALL', template: 'CALL(FUNCTION_NAME);' },
    { name: 'SET', template: 'SET(1);\nSET(0);' },
    { name: 'SPEED', template: 'SPEED;x;500;' },
  ]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            Script Editor
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="w-8 h-8 p-0"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          {showStats && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {getLineCount()}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Type className="w-3 h-3" />
                {getCharacterCount()}
              </Badge>
              <Badge variant="outline">
                {getFunctionCount()} func
              </Badge>
              <Badge variant="outline">
                {getCommandCount()} cmd
              </Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {quickTemplates.map((template) => (
            <Button
              key={template.name}
              variant="outline"
              size="sm"
              onClick={() => insertTemplate(template.template)}
              disabled={disabled}
              className="text-xs h-6"
            >
              {template.name}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={formatScript}
            disabled={disabled}
            className="text-xs h-6 ml-2"
          >
            Format
          </Button>
        </div>

        {showPreview ? (
          <div className="space-y-2">
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[400px] font-mono whitespace-pre-wrap">
              {value || placeholder}
            </pre>
            <div className="text-xs text-muted-foreground">
              Preview mode - Switch back to edit
            </div>
          </div>
        ) : (
          <div className="relative">
            {showLineNumbers && (
              <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted border-r flex flex-col text-xs text-muted-foreground font-mono">
                {Array.from({ length: getLineCount() }, (_, i) => (
                  <div key={i + 1} className="px-2 py-1 leading-5">
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`font-mono text-sm resize-none min-h-[400px] ${
                showLineNumbers ? 'pl-12' : 'pl-3'
              }`}
              disabled={disabled}
            />
          </div>
        )}

        {showStats && (
          <div className="grid grid-cols-4 gap-4 text-center text-xs text-muted-foreground border-t pt-3">
            <div>
              <div className="font-medium text-foreground">{getLineCount()}</div>
              <div>Lines</div>
            </div>
            <div>
              <div className="font-medium text-foreground">{getWordCount()}</div>
              <div>Words</div>
            </div>
            <div>
              <div className="font-medium text-foreground">{getFunctionCount()}</div>
              <div>Functions</div>
            </div>
            <div>
              <div className="font-medium text-foreground">{getCommandCount()}</div>
              <div>Commands</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}