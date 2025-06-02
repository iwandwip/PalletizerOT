import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function formatTimestamp(timestamp: number, includeMs: boolean = false): string {
  const date = new Date(timestamp)
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }
  
  let formatted = date.toLocaleTimeString('en-US', options)
  
  if (includeMs) {
    const ms = date.getMilliseconds().toString().padStart(3, '0')
    formatted += `.${ms}`
  }
  
  return formatted
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function parseScriptCommands(script: string): string[] {
  return script
    .split(/[;\n]/)
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('//'))
}

export function validateAxisSpeed(speed: number, maxSpeed: number): boolean {
  return speed >= 10 && speed <= maxSpeed
}

export function validateTimeout(timeout: number): boolean {
  return timeout >= 5000 && timeout <= 300000
}

export function parseAxisCommand(command: string): {
  axis: string
  action: string
  parameters: string[]
} | null {
  const match = command.match(/^([xyztrg]);(\d+)(?:;(.+))?$/i)
  if (!match) return null
  
  return {
    axis: match[1].toLowerCase(),
    action: match[2],
    parameters: match[3] ? match[3].split(';') : []
  }
}

export function formatAxisCommand(
  axis: string, 
  action: number, 
  parameters: (string | number)[] = []
): string {
  const parts = [axis.toLowerCase(), action.toString(), ...parameters.map(String)]
  return parts.join(';')
}

export function isValidIPAddress(ip: string): boolean {
  const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return regex.test(ip)
}

export function calculateProgress(current: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.max(0, (current / total) * 100))
}

export function getSpeedCategory(speed: number, maxSpeed: number): {
  category: string
  color: string
  percentage: number
} {
  const percentage = (speed / maxSpeed) * 100
  
  if (percentage <= 25) {
    return { category: 'Precision', color: 'text-green-600', percentage }
  } else if (percentage <= 50) {
    return { category: 'Normal', color: 'text-blue-600', percentage }
  } else if (percentage <= 75) {
    return { category: 'Fast', color: 'text-yellow-600', percentage }
  } else {
    return { category: 'Maximum', color: 'text-red-600', percentage }
  }
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    return new Promise((resolve, reject) => {
      if (document.execCommand('copy')) {
        resolve()
      } else {
        reject(new Error('Failed to copy'))
      }
      document.body.removeChild(textArea)
    })
  }
}

export function parseGroupCommand(command: string): string[] {
  const match = command.match(/GROUP\((.*)\)/)
  if (!match) return []
  
  const content = match[1]
  const commands: string[] = []
  let depth = 0
  let current = ''
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    
    if (char === '(') {
      depth++
    } else if (char === ')') {
      depth--
    } else if (char === ',' && depth === 0) {
      if (current.trim()) {
        commands.push(current.trim())
      }
      current = ''
      continue
    }
    
    current += char
  }
  
  if (current.trim()) {
    commands.push(current.trim())
  }
  
  return commands
}

export function validateScriptSyntax(script: string): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const lines = script.split('\n')
  
  let functionDepth = 0
  const definedFunctions = new Set<string>()
  const calledFunctions = new Set<string>()
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) return
    
    if (trimmed.includes('FUNC(')) {
      const match = trimmed.match(/FUNC\(([^)]+)\)/)
      if (match) {
        const funcName = match[1].trim()
        if (definedFunctions.has(funcName)) {
          errors.push(`Line ${index + 1}: Function '${funcName}' already defined`)
        } else {
          definedFunctions.add(funcName)
        }
      }
    }
    
    if (trimmed.includes('CALL(')) {
      const match = trimmed.match(/CALL\(([^)]+)\)/)
      if (match) {
        const funcName = match[1].trim()
        calledFunctions.add(funcName)
      }
    }
    
    if (trimmed === '{') {
      functionDepth++
    } else if (trimmed === '}') {
      functionDepth--
      if (functionDepth < 0) {
        errors.push(`Line ${index + 1}: Unmatched closing brace`)
      }
    }
  })
  
  if (functionDepth !== 0) {
    errors.push('Unmatched braces in script')
  }
  
  calledFunctions.forEach(funcName => {
    if (!definedFunctions.has(funcName)) {
      warnings.push(`Function '${funcName}' is called but not defined`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function estimateExecutionTime(script: string): number {
  const commands = parseScriptCommands(script)
  let totalTime = 0
  
  commands.forEach(command => {
    const upperCommand = command.toUpperCase()
    
    if (upperCommand.includes('D') && upperCommand.match(/D(\d+)/)) {
      const match = upperCommand.match(/D(\d+)/)
      if (match) {
        totalTime += parseInt(match[1])
      }
    }
    
    if (upperCommand.startsWith('X(') || upperCommand.startsWith('Y(') || 
        upperCommand.startsWith('Z(') || upperCommand.startsWith('T(') || 
        upperCommand.startsWith('G(')) {
      totalTime += 1000
    }
    
    if (upperCommand === 'ZERO') {
      totalTime += 5000
    }
    
    if (upperCommand.startsWith('GROUP(')) {
      totalTime += 2000
    }
  })
  
  return totalTime
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
}