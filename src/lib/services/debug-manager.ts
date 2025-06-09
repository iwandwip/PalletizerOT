import { fileManager } from '@/lib/services/file-manager'

export type LogLevel = 'debug' | 'info' | 'warning' | 'error'

export interface LogEntry {
  timestamp: number
  level: LogLevel
  source: string
  message: string
  data?: any
  sessionId?: string
  executionId?: string
  category?: string
}

export interface LogFilter {
  level?: LogLevel
  source?: string
  dateRange?: { start: Date; end: Date }
  searchQuery?: string
  category?: string
}

export interface LogStatistics {
  totalEntries: number
  errorCount: number
  warningCount: number
  infoCount: number
  debugCount: number
  topSources: Array<{ source: string; count: number }>
  recentActivity: Array<{ hour: string; count: number }>
  avgEntriesPerMinute: number
}

class DebugManager {
  private logBuffer: LogEntry[] = []
  private maxBufferSize = 2000
  private subscribers: Set<(entry: LogEntry) => void> = new Set()
  private sessionId = this.generateSessionId()
  private currentExecutionId: string | null = null
  private logCategories = new Set<string>()
  private messageDeduplication = new Map<string, { count: number; lastSeen: number }>()
  private deduplicationWindow = 1000

  log(source: string, level: LogLevel, message: string, data?: any, category?: string): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      source,
      message,
      data,
      sessionId: this.sessionId,
      executionId: this.currentExecutionId,
      category
    }

    if (category) {
      this.logCategories.add(category)
    }

    if (this.shouldDeduplicate(entry)) {
      this.updateDuplication(entry)
      return
    }

    this.addToBuffer(entry)
    this.notifySubscribers(entry)
    this.persistLog(entry)
  }

  info(source: string, message: string, data?: any): void {
    this.log(source, 'info', message, data, 'general')
  }

  warning(source: string, message: string, data?: any): void {
    this.log(source, 'warning', message, data, 'general')
  }

  error(source: string, message: string, data?: any): void {
    this.log(source, 'error', message, data, 'error')
  }

  debug(source: string, message: string, data?: any): void {
    this.log(source, 'debug', message, data, 'debug')
  }

  motion(axis: string, position: number, speed?: number, delay?: number): void {
    let message = `🎯 ${axis}(${position}`
    if (delay) message += `,d${delay}`
    if (speed) message += `,${speed}`
    message += ')'
    
    this.log('MOTION', 'info', message, { 
      axis, 
      position, 
      speed, 
      delay,
      type: 'motion'
    }, 'motion')
  }

  sequence(source: string, current: number, total: number, message: string): void {
    const progress = Math.round((current / total) * 100)
    const progressMsg = `🔄 [${current}/${total}] ${progress}% - ${message}`
    
    this.log(source, 'info', progressMsg, { 
      current, 
      total, 
      progress,
      type: 'sequence' 
    }, 'execution')
  }

  function(funcName: string, entering: boolean, commandCount?: number): void {
    if (entering) {
      const message = `└─ Entering function ${funcName}${commandCount ? ` (${commandCount} commands)` : ''}`
      this.log('FUNCTION', 'info', message, { 
        funcName, 
        entering, 
        commandCount,
        type: 'function' 
      }, 'execution')
    } else {
      const message = `✅ Function ${funcName} completed`
      this.log('FUNCTION', 'info', message, { 
        funcName, 
        entering,
        type: 'function'
      }, 'execution')
    }
  }

  sync(type: string, message: string, data?: any): void {
    this.log('SYNC', 'info', `🔄 ${type} - ${message}`, { 
      syncType: type, 
      ...data,
      type: 'sync'
    }, 'sync')
  }

  parser(message: string, data?: any): void {
    this.log('PARSER', 'info', message, {
      ...data,
      type: 'parser'
    }, 'parsing')
  }

  performance(data: any): void {
    this.log('PERFORMANCE', 'info', '📊 Execution Summary', {
      ...data,
      type: 'performance'
    }, 'performance')
  }

  progress(current: number, total: number, task: string): void {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0
    const progressBar = this.createProgressBar(percentage)
    const message = `${progressBar} ${current}/${total} (${percentage}%) - ${task}`
    
    this.log('PROGRESS', 'info', message, { 
      current, 
      total, 
      percentage, 
      task,
      type: 'progress'
    }, 'execution')
  }

  separator(): void {
    this.log('SYSTEM', 'info', '════════════════════════════════════════', {
      type: 'separator'
    }, 'system')
  }

  startExecution(executionId: string): void {
    this.currentExecutionId = executionId
    this.log('SYSTEM', 'info', `🚀 Starting execution session: ${executionId}`, {
      executionId,
      type: 'execution_start'
    }, 'system')
  }

  endExecution(): void {
    if (this.currentExecutionId) {
      this.log('SYSTEM', 'info', `🏁 Ending execution session: ${this.currentExecutionId}`, {
        executionId: this.currentExecutionId,
        type: 'execution_end'
      }, 'system')
      this.currentExecutionId = null
    }
  }

  subscribe(callback: (entry: LogEntry) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  getBuffer(filter?: LogFilter): LogEntry[] {
    let entries = [...this.logBuffer]
    
    if (filter) {
      entries = this.applyFilter(entries, filter)
    }
    
    return entries
  }

  clearBuffer(): void {
    this.logBuffer = []
    this.messageDeduplication.clear()
    this.log('SYSTEM', 'info', 'Debug buffer cleared', {
      type: 'buffer_clear'
    }, 'system')
  }

  async getHistoricalLogs(date?: string, limit: number = 1000, filter?: LogFilter): Promise<LogEntry[]> {
    try {
      let entries = await fileManager.getLogEntries(date, limit)
      
      if (filter) {
        entries = this.applyFilter(entries, filter)
      }
      
      return entries
    } catch (error) {
      this.error('DEBUG_MANAGER', 'Failed to load historical logs', { error })
      return []
    }
  }

  async clearAllLogs(): Promise<void> {
    try {
      await fileManager.clearLogs()
      this.clearBuffer()
      this.log('SYSTEM', 'info', 'All logs cleared', {
        type: 'logs_clear'
      }, 'system')
    } catch (error) {
      this.error('DEBUG_MANAGER', 'Failed to clear logs', { error })
    }
  }

  getStatistics(): LogStatistics {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    const recentEntries = this.logBuffer.filter(entry => now - entry.timestamp < oneHour)
    
    const stats: LogStatistics = {
      totalEntries: this.logBuffer.length,
      errorCount: this.logBuffer.filter(e => e.level === 'error').length,
      warningCount: this.logBuffer.filter(e => e.level === 'warning').length,
      infoCount: this.logBuffer.filter(e => e.level === 'info').length,
      debugCount: this.logBuffer.filter(e => e.level === 'debug').length,
      topSources: this.getTopSources(),
      recentActivity: this.getRecentActivity(),
      avgEntriesPerMinute: recentEntries.length / (oneHour / (60 * 1000))
    }
    
    return stats
  }

  exportLogs(filter?: LogFilter): string {
    const entries = this.getBuffer(filter)
    
    const csvHeader = 'Timestamp,Level,Source,Message,Category,Data\n'
    const csvData = entries.map(entry => {
      const timestamp = new Date(entry.timestamp).toISOString()
      const data = entry.data ? JSON.stringify(entry.data).replace(/"/g, '""') : ''
      
      return `"${timestamp}","${entry.level}","${entry.source}","${entry.message.replace(/"/g, '""')}","${entry.category || ''}","${data}"`
    }).join('\n')
    
    return csvHeader + csvData
  }

  getCategories(): string[] {
    return Array.from(this.logCategories).sort()
  }

  getSources(): string[] {
    const sources = new Set(this.logBuffer.map(entry => entry.source))
    return Array.from(sources).sort()
  }

  private shouldDeduplicate(entry: LogEntry): boolean {
    const key = `${entry.source}:${entry.level}:${entry.message}`
    const existing = this.messageDeduplication.get(key)
    const now = Date.now()
    
    if (existing && (now - existing.lastSeen) < this.deduplicationWindow) {
      return true
    }
    
    return false
  }

  private updateDuplication(entry: LogEntry): void {
    const key = `${entry.source}:${entry.level}:${entry.message}`
    const existing = this.messageDeduplication.get(key)
    
    if (existing) {
      existing.count++
      existing.lastSeen = Date.now()
    } else {
      this.messageDeduplication.set(key, { count: 1, lastSeen: Date.now() })
    }
  }

  private applyFilter(entries: LogEntry[], filter: LogFilter): LogEntry[] {
    return entries.filter(entry => {
      if (filter.level && entry.level !== filter.level) return false
      if (filter.source && !entry.source.toLowerCase().includes(filter.source.toLowerCase())) return false
      if (filter.category && entry.category !== filter.category) return false
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase()
        if (!entry.message.toLowerCase().includes(query) && 
            !entry.source.toLowerCase().includes(query)) return false
      }
      if (filter.dateRange) {
        const entryDate = new Date(entry.timestamp)
        if (entryDate < filter.dateRange.start || entryDate > filter.dateRange.end) return false
      }
      
      return true
    })
  }

  private getTopSources(): Array<{ source: string; count: number }> {
    const sourceCounts = new Map<string, number>()
    
    this.logBuffer.forEach(entry => {
      sourceCounts.set(entry.source, (sourceCounts.get(entry.source) || 0) + 1)
    })
    
    return Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  private getRecentActivity(): Array<{ hour: string; count: number }> {
    const now = new Date()
    const hours: Array<{ hour: string; count: number }> = []
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
      const hourStr = hour.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false })
      
      const count = this.logBuffer.filter(entry => {
        const entryHour = new Date(entry.timestamp).getHours()
        return entryHour === hour.getHours()
      }).length
      
      hours.push({ hour: hourStr, count })
    }
    
    return hours
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry)
    
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift()
    }
  }

  private notifySubscribers(entry: LogEntry): void {
    this.subscribers.forEach(callback => {
      try {
        callback(entry)
      } catch (error) {
        console.error('Error in debug subscriber:', error)
      }
    })
  }

  private async persistLog(entry: LogEntry): Promise<void> {
    try {
      await fileManager.appendLog(entry)
    } catch (error) {
      console.error('Failed to persist log entry:', error)
    }
  }

  private createProgressBar(percentage: number): string {
    const barLength = 20
    const filledLength = Math.round((percentage / 100) * barLength)
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)
    return `[${bar}]`
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export const debugManager = new DebugManager()