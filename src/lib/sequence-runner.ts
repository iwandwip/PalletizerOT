import { ParsedCommand, scriptParser } from './script-parser'
import { esp32Client } from './esp32-client'
import { debugManager } from './debug-manager'

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
  private currentSequence: ParsedCommand[] = []
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
      this.currentSequence = scriptParser.expandScript(script)
      this.executionState.totalCommands = this.currentSequence.length
      this.executionState.currentCommand = 0
      this.executionState.errors = []
      
      debugManager.log('PARSER', 'info', `Script loaded: ${this.currentSequence.length} commands`)
    } catch (error: any) {
      const errorMsg = `Failed to parse script: ${error.message}`
      this.executionState.errors.push(errorMsg)
      debugManager.log('PARSER', 'error', errorMsg)
      throw error
    }
  }

  async play(): Promise<void> {
    if (this.executionState.isExecuting) {
      debugManager.log('RUNNER', 'warning', 'Already executing')
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

    debugManager.log('RUNNER', 'info', 'Execution started')

    this.executionPromise = this.executeSequence()
    await this.executionPromise
  }

  pause(): void {
    if (this.executionState.state === 'RUNNING') {
      this.shouldPause = true
      this.executionState.state = 'PAUSED'
      debugManager.log('RUNNER', 'info', 'Execution paused')
    }
  }

  resume(): void {
    if (this.executionState.state === 'PAUSED') {
      this.shouldPause = false
      this.executionState.state = 'RUNNING'
      debugManager.log('RUNNER', 'info', 'Execution resumed')
    }
  }

  stop(): void {
    if (this.executionState.isExecuting) {
      this.shouldStop = true
      this.executionState.state = 'STOPPING'
      debugManager.log('RUNNER', 'info', 'Execution stopping')
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
    debugManager.log('RUNNER', 'info', 'Execution reset')
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
      debugManager.log('RUNNER', 'error', errorMsg)
    } finally {
      this.executionState.isExecuting = false
      this.executionState.state = 'IDLE'
      
      const duration = Date.now() - this.executionState.startTime
      debugManager.log('RUNNER', 'info', `Execution completed in ${duration}ms`)
    }
  }

  private async executeCommand(command: ParsedCommand): Promise<void> {
    const progress = Math.round((this.executionState.currentCommand / this.executionState.totalCommands) * 100)
    debugManager.log('RUNNER', 'info', `[${this.executionState.currentCommand + 1}/${this.executionState.totalCommands}] ${progress}% - ${command.raw}`)

    try {
      switch (command.type) {
        case 'MOVEMENT':
          await this.executeMovementCommand(command)
          break
        case 'GROUP':
          await this.executeGroupCommand(command)
          break
        case 'SPEED':
          await this.executeSpeedCommand(command)
          break
        case 'SYSTEM':
          await this.executeSystemCommand(command)
          break
        case 'SYNC':
          await this.executeSyncCommand(command)
          break
        default:
          debugManager.log('RUNNER', 'warning', `Unknown command type: ${command.type}`)
      }
    } catch (error: any) {
      const errorMsg = `Command execution failed: ${error.message}`
      this.executionState.errors.push(errorMsg)
      debugManager.log('RUNNER', 'error', errorMsg)
      throw error
    }
  }

  private async executeMovementCommand(command: ParsedCommand): Promise<void> {
    const esp32Command = this.convertToESP32Command(command)
    const result = await esp32Client.sendCommand(esp32Command)
    
    if (!result.success) {
      throw new Error(result.message)
    }
    
    await this.waitForCompletion()
  }

  private async executeGroupCommand(command: ParsedCommand): Promise<void> {
    const groupCommands = this.convertGroupToESP32Commands(command)
    
    for (const esp32Command of groupCommands) {
      const result = await esp32Client.sendCommand(esp32Command)
      if (!result.success) {
        throw new Error(result.message)
      }
    }
    
    await this.waitForCompletion()
  }

  private async executeSpeedCommand(command: ParsedCommand): Promise<void> {
    const esp32Command = this.convertSpeedToESP32Command(command)
    const result = await esp32Client.sendCommand(esp32Command)
    
    if (!result.success) {
      throw new Error(result.message)
    }
  }

  private async executeSystemCommand(command: ParsedCommand): Promise<void> {
    const result = await esp32Client.sendCommand(command.data.command)
    
    if (!result.success) {
      throw new Error(result.message)
    }
    
    if (command.data.command === 'ZERO') {
      await this.waitForCompletion()
    }
  }

  private async executeSyncCommand(command: ParsedCommand): Promise<void> {
    const esp32Command = this.convertSyncToESP32Command(command)
    const result = await esp32Client.sendCommand(esp32Command)
    
    if (!result.success) {
      throw new Error(result.message)
    }
    
    if (command.data.type === 'wait') {
      await this.waitForCompletion()
    }
  }

  private convertToESP32Command(command: ParsedCommand): string {
    const data = command.data
    if (data.type === 'single') {
      const params = data.parameters.positions.join(';')
      return `${data.axis.toLowerCase()};1;${params}`
    }
    return command.raw
  }

  private convertGroupToESP32Commands(command: ParsedCommand): string[] {
    const commands: string[] = []
    const axes = command.data.axes
    
    for (const [axis, params] of Object.entries(axes)) {
      const positions = (params as any).positions.join(';')
      commands.push(`${axis.toLowerCase()};1;${positions}`)
    }
    
    return commands
  }

  private convertSpeedToESP32Command(command: ParsedCommand): string {
    const data = command.data
    if (data.type === 'global') {
      return `SPEED;${data.speed}`
    } else {
      return `SPEED;${data.axis};${data.speed}`
    }
  }

  private convertSyncToESP32Command(command: ParsedCommand): string {
    const data = command.data
    if (data.type === 'set') {
      return `SET(${data.value})`
    }
    return data.type.toUpperCase()
  }

  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 100)
    })
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
}

export const sequenceRunner = new SequenceRunner()