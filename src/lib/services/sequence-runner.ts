import { esp32Client } from '@/lib/services/esp32-client'
import { debugManager } from '@/lib/services/debug-manager'

export type SystemState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING'

export interface ExecutionState {
  state: SystemState
  currentCommand: number
  totalCommands: number
  isExecuting: boolean
  startTime: number
  currentFunction: string
  errors: string[]
}

class SequenceRunner {
  private currentSequence: string[] = []
  private executionState: ExecutionState = {
    state: 'IDLE',
    currentCommand: 0,
    totalCommands: 0,
    isExecuting: false,
    startTime: 0,
    currentFunction: '',
    errors: []
  }
  private executionPromise: Promise<void> | null = null
  private shouldStop = false
  private shouldPause = false

  async loadScript(script: string): Promise<void> {
    try {
      this.currentSequence = script.split('\n').filter(line => line.trim().length > 0)
      this.executionState.totalCommands = this.currentSequence.length
      this.executionState.currentCommand = 0
      this.executionState.errors = []
      
      debugManager.info('PARSER', `Script loaded: ${this.currentSequence.length} commands`)
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

    debugManager.info('RUNNER', 'Execution started')

    this.executionPromise = this.executeSequence()
    await this.executionPromise
  }

  pause(): void {
    if (this.executionState.state === 'RUNNING') {
      this.shouldPause = true
      this.executionState.state = 'PAUSED'
      debugManager.info('RUNNER', 'Execution paused')
    }
  }

  resume(): void {
    if (this.executionState.state === 'PAUSED') {
      this.shouldPause = false
      this.executionState.state = 'RUNNING'
      debugManager.info('RUNNER', 'Execution resumed')
    }
  }

  stop(): void {
    if (this.executionState.isExecuting) {
      this.shouldStop = true
      this.executionState.state = 'STOPPING'
      debugManager.info('RUNNER', 'Execution stopping')
    }
  }

  reset(): void {
    this.shouldStop = true
    this.shouldPause = false
    this.executionState = {
      state: 'IDLE',
      currentCommand: 0,
      totalCommands: this.currentSequence.length,
      isExecuting: false,
      startTime: 0,
      currentFunction: '',
      errors: []
    }
    debugManager.info('RUNNER', 'Execution reset')
  }

  getState(): ExecutionState {
    return { ...this.executionState }
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
      }
    } catch (error: any) {
      const errorMsg = `Execution error: ${error.message}`
      this.executionState.errors.push(errorMsg)
      debugManager.error('RUNNER', errorMsg)
    } finally {
      this.executionState.isExecuting = false
      this.executionState.state = 'IDLE'
      
      const duration = Date.now() - this.executionState.startTime
      debugManager.info('RUNNER', `Execution completed in ${duration}ms`)
    }
  }

  private async executeCommand(command: string): Promise<void> {
    const progress = Math.round((this.executionState.currentCommand / this.executionState.totalCommands) * 100)
    debugManager.info('RUNNER', `[${this.executionState.currentCommand + 1}/${this.executionState.totalCommands}] ${progress}% - ${command}`)

    try {
      const result = await esp32Client.sendCommand(command)
      
      if (!result.success) {
        throw new Error(result.message)
      }
      
      await this.delay(100)
    } catch (error: any) {
      const errorMsg = `Command execution failed: ${error.message}`
      this.executionState.errors.push(errorMsg)
      debugManager.error('RUNNER', errorMsg)
      throw error
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
}

export const sequenceRunner = new SequenceRunner()