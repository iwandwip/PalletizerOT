import { esp32Client } from '@/lib/services/esp32-client'
import { debugManager } from '@/lib/services/debug-manager'
import { scriptParser, ParsedCommand } from '@/lib/services/script-parser'

export type SystemState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING' | 'ERROR' | 'SYNC_WAIT'

export interface ExecutionState {
  state: SystemState
  currentCommand: number
  totalCommands: number
  isExecuting: boolean
  startTime: number
  currentFunction: string
  functionStack: string[]
  errors: string[]
  progress: number
  estimatedTimeRemaining: number
  lastCommandTime: number
  syncWaitStart: number
  syncTimeouts: number
}

export interface ExecutionOptions {
  skipErrors: boolean
  maxRetries: number
  syncTimeout: number
  pauseOnError: boolean
  enablePerformanceMonitoring: boolean
}

export interface PerformanceMetrics {
  totalExecutionTime: number
  averageCommandTime: number
  successRate: number
  totalCommands: number
  failedCommands: number
  syncOperations: number
  retryCount: number
}

class SequenceRunner {
  private currentSequence: ParsedCommand[] = []
  private originalScript: string = ''
  private executionState: ExecutionState = this.createInitialState()
  private executionOptions: ExecutionOptions = this.createDefaultOptions()
  private executionPromise: Promise<void> | null = null
  private performanceMetrics: PerformanceMetrics = this.createInitialMetrics()
  private shouldStop = false
  private shouldPause = false
  private functionStack: string[] = []
  private syncWaitResolver: ((value: boolean) => void) | null = null

  private createInitialState(): ExecutionState {
    return {
      state: 'IDLE',
      currentCommand: 0,
      totalCommands: 0,
      isExecuting: false,
      startTime: 0,
      currentFunction: '',
      functionStack: [],
      errors: [],
      progress: 0,
      estimatedTimeRemaining: 0,
      lastCommandTime: 0,
      syncWaitStart: 0,
      syncTimeouts: 0
    }
  }

  private createDefaultOptions(): ExecutionOptions {
    return {
      skipErrors: false,
      maxRetries: 3,
      syncTimeout: 30000,
      pauseOnError: true,
      enablePerformanceMonitoring: true
    }
  }

  private createInitialMetrics(): PerformanceMetrics {
    return {
      totalExecutionTime: 0,
      averageCommandTime: 0,
      successRate: 100,
      totalCommands: 0,
      failedCommands: 0,
      syncOperations: 0,
      retryCount: 0
    }
  }

  async loadScript(script: string, options?: Partial<ExecutionOptions>): Promise<void> {
    try {
      this.originalScript = script
      this.executionOptions = { ...this.executionOptions, ...options }
      
      debugManager.info('PARSER', 'Parsing script...')
      const parseResult = scriptParser.parse(script)
      
      if (parseResult.errors.length > 0) {
        throw new Error(`Script parsing failed: ${parseResult.errors.join(', ')}`)
      }

      this.currentSequence = scriptParser.expandScript(script)
      this.executionState.totalCommands = this.currentSequence.length
      this.executionState.currentCommand = 0
      this.executionState.errors = []
      this.functionStack = []

      debugManager.parser('Script parsed successfully', {
        parsingResults: {
          functions: parseResult.functions.map(f => ({ name: f.name, commands: f.commands.length })),
          totalCommands: parseResult.totalCommands
        }
      })

      debugManager.info('PARSER', `Script loaded: ${this.currentSequence.length} expanded commands from ${parseResult.totalCommands} original commands`)
      
    } catch (error: any) {
      const errorMsg = `Failed to parse script: ${error.message}`
      this.executionState.errors.push(errorMsg)
      debugManager.error('PARSER', errorMsg)
      throw error
    }
  }

  async play(): Promise<void> {
    if (this.executionState.isExecuting) {
      debugManager.warning('RUNNER', 'Already executing')
      return
    }

    if (this.currentSequence.length === 0) {
      throw new Error('No script loaded')
    }

    this.executionState.state = 'RUNNING'
    this.executionState.isExecuting = true
    this.executionState.startTime = Date.now()
    this.shouldStop = false
    this.shouldPause = false
    this.performanceMetrics = this.createInitialMetrics()

    debugManager.separator()
    debugManager.info('RUNNER', '▶️ EXECUTION STARTED')
    debugManager.info('RUNNER', `Total commands to execute: ${this.currentSequence.length}`)

    this.executionPromise = this.executeSequence()
    await this.executionPromise
  }

  pause(): void {
    if (this.executionState.state === 'RUNNING') {
      this.shouldPause = true
      this.executionState.state = 'PAUSED'
      debugManager.info('RUNNER', '⏸️ EXECUTION PAUSED')
    }
  }

  resume(): void {
    if (this.executionState.state === 'PAUSED') {
      this.shouldPause = false
      this.executionState.state = 'RUNNING'
      debugManager.info('RUNNER', '▶️ EXECUTION RESUMED')
    }
  }

  stop(): void {
    if (this.executionState.isExecuting) {
      this.shouldStop = true
      this.executionState.state = 'STOPPING'
      
      if (this.syncWaitResolver) {
        this.syncWaitResolver(false)
        this.syncWaitResolver = null
      }
      
      debugManager.info('RUNNER', '⏹️ EXECUTION STOPPING')
    }
  }

  reset(): void {
    this.shouldStop = true
    this.shouldPause = false
    this.functionStack = []
    
    if (this.syncWaitResolver) {
      this.syncWaitResolver(false)
      this.syncWaitResolver = null
    }
    
    this.executionState = {
      ...this.createInitialState(),
      totalCommands: this.currentSequence.length
    }
    
    debugManager.info('RUNNER', '🔄 EXECUTION RESET')
  }

  getState(): ExecutionState {
    const estimatedTimeRemaining = this.calculateEstimatedTimeRemaining()
    return { 
      ...this.executionState,
      estimatedTimeRemaining,
      progress: this.calculateProgress()
    }
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  setExecutionOptions(options: Partial<ExecutionOptions>): void {
    this.executionOptions = { ...this.executionOptions, ...options }
    debugManager.info('RUNNER', 'Execution options updated', options)
  }

  private async executeSequence(): Promise<void> {
    try {
      while (this.executionState.currentCommand < this.currentSequence.length && !this.shouldStop) {
        if (this.shouldPause) {
          await this.waitForResume()
        }

        if (this.shouldStop) break

        const command = this.currentSequence[this.executionState.currentCommand]
        await this.executeCommand(command)
        
        this.executionState.currentCommand++
        this.updateProgress()
      }
    } catch (error: any) {
      const errorMsg = `Execution error: ${error.message}`
      this.executionState.errors.push(errorMsg)
      this.executionState.state = 'ERROR'
      debugManager.error('RUNNER', errorMsg)
    } finally {
      await this.finalizeExecution()
    }
  }

  private async executeCommand(command: ParsedCommand): Promise<void> {
    const startTime = Date.now()
    this.executionState.lastCommandTime = startTime
    
    this.updateExecutionContext(command)
    this.logCommandExecution(command)

    try {
      await this.processCommand(command)
      this.performanceMetrics.totalCommands++
      
    } catch (error: any) {
      this.performanceMetrics.failedCommands++
      await this.handleCommandError(command, error)
    }

    const executionTime = Date.now() - startTime
    this.updatePerformanceMetrics(executionTime)
  }

  private async processCommand(command: ParsedCommand): Promise<void> {
    switch (command.type) {
      case 'SYNC':
        await this.handleSyncCommand(command)
        break
      case 'WAIT':
        await this.handleWaitCommand(command)
        break
      case 'DETECT':
        await this.handleDetectCommand(command)
        break
      default:
        await this.sendCommandToESP32(command)
        break
    }
  }

  private async handleSyncCommand(command: ParsedCommand): Promise<void> {
    this.performanceMetrics.syncOperations++
    
    if (command.data.type === 'set') {
      debugManager.sync('SET', `Setting sync signal to ${command.data.value}`)
      await this.sendCommandToESP32(command)
    }
  }

  private async handleWaitCommand(command: ParsedCommand): Promise<void> {
    this.executionState.state = 'SYNC_WAIT'
    this.executionState.syncWaitStart = Date.now()
    
    debugManager.sync('WAIT', 'Waiting for external sync signal...')
    
    const waitPromise = new Promise<boolean>((resolve) => {
      this.syncWaitResolver = resolve
    })

    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), this.executionOptions.syncTimeout)
    })

    const result = await Promise.race([waitPromise, timeoutPromise])
    
    if (!result) {
      this.executionState.syncTimeouts++
      debugManager.sync('WAIT', `Timeout after ${this.executionOptions.syncTimeout}ms`)
      throw new Error('Sync wait timeout')
    } else {
      debugManager.sync('WAIT', 'External sync signal received')
    }
    
    this.executionState.state = 'RUNNING'
    this.syncWaitResolver = null
  }

  private async handleDetectCommand(command: ParsedCommand): Promise<void> {
    debugManager.sync('DETECT', 'Monitoring detection signal')
    await this.sendCommandToESP32(command)
  }

  private async sendCommandToESP32(command: ParsedCommand): Promise<void> {
    const result = await esp32Client.sendCommand(command.raw)
    
    if (!result.success) {
      throw new Error(result.message)
    }
    
    if (command.estimated_duration) {
      await this.delay(Math.min(command.estimated_duration, 100))
    } else {
      await this.delay(50)
    }
  }

  private async handleCommandError(command: ParsedCommand, error: any): Promise<void> {
    const errorMsg = `Command failed: ${command.raw} - ${error.message}`
    this.executionState.errors.push(errorMsg)
    debugManager.error('RUNNER', errorMsg)

    if (this.executionOptions.pauseOnError) {
      this.pause()
      debugManager.warning('RUNNER', 'Execution paused due to error')
    } else if (!this.executionOptions.skipErrors) {
      throw error
    }
  }

  private updateExecutionContext(command: ParsedCommand): void {
    if (command.type === 'FUNCTION') {
      this.functionStack.push(command.data.name || 'UNKNOWN')
      this.executionState.currentFunction = command.data.name || ''
      debugManager.function(command.data.name, true, command.data.commandCount)
    }
    
    this.executionState.functionStack = [...this.functionStack]
  }

  private logCommandExecution(command: ParsedCommand): void {
    const progress = Math.round((this.executionState.currentCommand / this.executionState.totalCommands) * 100)
    
    debugManager.sequence(
      'RUNNER',
      this.executionState.currentCommand + 1,
      this.executionState.totalCommands,
      command.raw
    )

    if (command.type === 'MOVEMENT') {
      if (command.data.type === 'single') {
        debugManager.motion(
          command.data.axis,
          command.data.parameters?.positions?.[0] || 0,
          command.data.parameters?.speeds?.[0],
          command.data.parameters?.delays?.[0]
        )
      }
    }
  }

  private updateProgress(): void {
    this.executionState.progress = this.calculateProgress()
  }

  private calculateProgress(): number {
    if (this.executionState.totalCommands === 0) return 0
    return Math.round((this.executionState.currentCommand / this.executionState.totalCommands) * 100)
  }

  private calculateEstimatedTimeRemaining(): number {
    if (this.executionState.currentCommand === 0) return 0
    
    const elapsed = Date.now() - this.executionState.startTime
    const averageTimePerCommand = elapsed / this.executionState.currentCommand
    const remainingCommands = this.executionState.totalCommands - this.executionState.currentCommand
    
    return Math.round(averageTimePerCommand * remainingCommands)
  }

  private updatePerformanceMetrics(executionTime: number): void {
    if (this.executionOptions.enablePerformanceMonitoring) {
      const totalCommands = this.performanceMetrics.totalCommands
      const currentAverage = this.performanceMetrics.averageCommandTime
      
      this.performanceMetrics.averageCommandTime = 
        (currentAverage * (totalCommands - 1) + executionTime) / totalCommands
      
      this.performanceMetrics.successRate = 
        ((this.performanceMetrics.totalCommands - this.performanceMetrics.failedCommands) / 
         this.performanceMetrics.totalCommands) * 100
    }
  }

  private async finalizeExecution(): Promise<void> {
    const duration = Date.now() - this.executionState.startTime
    this.performanceMetrics.totalExecutionTime = duration
    
    this.executionState.isExecuting = false
    this.executionState.state = 'IDLE'
    this.functionStack = []

    if (this.executionOptions.enablePerformanceMonitoring) {
      debugManager.performance({
        performanceData: {
          totalTime: this.formatDuration(duration),
          commandsExecuted: this.performanceMetrics.totalCommands,
          successRate: Math.round(this.performanceMetrics.successRate),
          avgCommandTime: `${Math.round(this.performanceMetrics.averageCommandTime)}ms`
        }
      })
    }

    debugManager.separator()
    debugManager.info('RUNNER', `✅ EXECUTION COMPLETED in ${this.formatDuration(duration)}`)
    
    if (this.executionState.errors.length > 0) {
      debugManager.warning('RUNNER', `Completed with ${this.executionState.errors.length} errors`)
    }
  }

  private async waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (!this.shouldPause || this.shouldStop) {
          resolve()
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  notifySyncReceived(): void {
    if (this.syncWaitResolver) {
      this.syncWaitResolver(true)
    }
  }
}

export const sequenceRunner = new SequenceRunner()