import { fileManager } from '@/lib/services/file-manager'

export type LogLevel = 'debug' | 'info' | 'warning' | 'error'

export interface LogEntry {
  timestamp: number
  level: LogLevel
  source: string
  message: string
  data?: any
}

class DebugManager {
  private logBuffer: LogEntry[] = []
  private maxBufferSize = 1000
  private subscribers: Set<(entry: LogEntry) => void> = new Set()

  log(source: string, level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      source,
      message,
      data
    }

    this.addToBuffer(entry)
    this.notifySubscribers(entry)
    this.persistLog(entry)
  }

  info(source: string, message: string, data?: any): void {
    this.log(source, 'info', message, data)
  }

  warning(source: string, message: string, data?: any): void {
    this.log(source, 'warning', message, data)
  }

  error(source: string, message: string, data?: any): void {
    this.log(source, 'error', message, data)
  }

  debug(source: string, message: string, data?: any): void {
    this.log(source, 'debug', message, data)
  }

  motion(axis: string, position: number, speed?: number, delay?: number): void {
    let message = `🎯 ${axis}(${position}`
    if (delay) message += `,d${delay}`
    if (speed) message += `,${speed}`
    message += ')'
    
    this.log('MOTION', 'info', message, { axis, position, speed, delay })
  }

  sequence(source: string, current: number, total: number, message: string): void {
    const progress = Math.round((current / total) * 100)
    const progressMsg = `🔄 [${current}/${total}] ${progress}% - ${message}`
    this.log(source, 'info', progressMsg, { current, total, progress })
  }

  function(funcName: string, entering: boolean, commandCount?: number): void {
    if (entering) {
      const message = `└─ Entering function ${funcName}${commandCount ? ` (${commandCount} commands)` : ''}`
      this.log('FUNCTION', 'info', message, { funcName, entering, commandCount })
    } else {
      const message = `✅ Function ${funcName} completed`
      this.log('FUNCTION', 'info', message, { funcName, entering })
    }
  }

  sync(type: string, message: string): void {
    this.log('SYNC', 'info', `🔄 ${type} - ${message}`, { syncType: type })
  }

  parser(message: string, data?: any): void {
    this.log('PARSER', 'info', message, data)
  }

  performance(data: any): void {
    this.log('PERFORMANCE', 'info', '📊 Execution Summary', data)
  }

  progress(current: number, total: number, task: string): void {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0
    const progressBar = this.createProgressBar(percentage)
    const message = `${progressBar} ${current}/${total} (${percentage}%) - ${task}`
    
    this.log('PROGRESS', 'info', message, { current, total, percentage, task })
  }

  separator(): void {
    this.log('SYSTEM', 'info', '════════════════════════════════════════')
  }

  subscribe(callback: (entry: LogEntry) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  getBuffer(): LogEntry[] {
    return [...this.logBuffer]
  }

  clearBuffer(): void {
    this.logBuffer = []
    this.log('SYSTEM', 'info', 'Debug buffer cleared')
  }

  async getHistoricalLogs(date?: string, limit: number = 1000): Promise<LogEntry[]> {
    try {
      return await fileManager.getLogEntries(date, limit)
    } catch (error) {
      this.error('DEBUG_MANAGER', 'Failed to load historical logs', { error })
      return []
    }
  }

  async clearAllLogs(): Promise<void> {
    try {
      await fileManager.clearLogs()
      this.clearBuffer()
      this.log('SYSTEM', 'info', 'All logs cleared')
    } catch (error) {
      this.error('DEBUG_MANAGER', 'Failed to clear logs', { error })
    }
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
}

export const debugManager = new DebugManager()