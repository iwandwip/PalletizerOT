/**
 * Hybrid JSON Generator for ESP32 Command Format
 * Generates the new optimized JSON format for zero-brain ESP32 execution
 */

import { BaseScriptGenerator } from '../core/BaseScriptGenerator'
import { ScriptCommand, CompiledScript, CompiledStep } from '../types/ScriptTypes'

export class HybridJSONGenerator extends BaseScriptGenerator {
  
  public generateScript(commands: ScriptCommand[]): string {
    const compiledScript = this.compileToHybridFormat(commands)
    return JSON.stringify(compiledScript, null, 2)
  }

  private compileToHybridFormat(commands: ScriptCommand[]): CompiledScript {
    const scriptId = Date.now().toString()
    const steps: CompiledStep[] = []
    let estimatedTime = 0

    commands.forEach((command, index) => {
      const step = this.compileCommand(command, index + 1)
      if (step) {
        steps.push(step)
        estimatedTime += step.timeout || 5000
      }
    })

    const axes = this.extractAxesFromCommands(commands)

    return {
      scriptId,
      metadata: {
        totalSteps: steps.length,
        estimatedTime,
        axes
      },
      steps
    }
  }

  private compileCommand(command: ScriptCommand, stepId: number): CompiledStep | null {
    const timeout = (command.metadata?.timeout as number) || this.getDefaultTimeout(command.type)

    switch (command.type) {
      case 'MOVE':
        return this.compileMoveCommand(command, stepId, timeout)
      
      case 'GROUP':
        return this.compileGroupCommand(command, stepId, timeout)
      
      case 'GRIPPER':
        return this.compileSystemCommand(command, stepId, timeout)
      
      case 'HOME':
        return this.compileHomeCommand(stepId, timeout)
      
      case 'ZERO':
        return this.compileZeroCommand(stepId, timeout)
      
      case 'WAIT':
        return this.compileWaitCommand(command, stepId, timeout)
      
      default:
        return null
    }
  }

  private compileMoveCommand(command: ScriptCommand, stepId: number, timeout: number): CompiledStep {
    const { axis, position, speed } = command.parameters
    const serialCmd = this.generateSerialCommand(axis as string, position as number, speed as number)

    return {
      id: stepId,
      action: 'MOVE',
      axis: axis as string,
      position: position as number,
      speed: speed as number || 1500,
      serial_cmd: serialCmd,
      expect_response: 'DONE',
      timeout
    }
  }

  private compileGroupCommand(command: ScriptCommand, stepId: number, timeout: number): CompiledStep {
    const { axes } = command.parameters
    const axesArray = axes as Array<{ axis: string; position: number; speed?: number }>

    const commands = axesArray.map(axisData => ({
      axis: axisData.axis,
      position: axisData.position,
      serial_cmd: this.generateSerialCommand(axisData.axis, axisData.position, axisData.speed || 1500)
    }))

    const expect_responses = axesArray.map(() => 'DONE')

    return {
      id: stepId,
      action: 'GROUP_MOVE',
      parallel: true,
      commands,
      expect_responses,
      timeout
    }
  }

  private compileSystemCommand(command: ScriptCommand, stepId: number, timeout: number): CompiledStep {
    const action = command.parameters.action as string
    let systemCommand: string
    let serialCmd: string

    switch (action) {
      case 'gripperopen':
      case 'open':
        systemCommand = 'GRIPPER_OPEN'
        serialCmd = 'g;0;1;'
        break
      case 'gripperclose':
      case 'close':
        systemCommand = 'GRIPPER_CLOSE'
        serialCmd = 'g;1;1;'
        break
      default:
        systemCommand = 'GRIPPER_OPEN'
        serialCmd = 'g;0;1;'
    }

    return {
      id: stepId,
      action: 'SYSTEM',
      command: systemCommand,
      serial_cmd: serialCmd,
      expect_response: 'DONE',
      timeout
    }
  }

  private compileHomeCommand(stepId: number, timeout: number): CompiledStep {
    return {
      id: stepId,
      action: 'SYSTEM',
      command: 'HOME',
      serial_cmd: 'home;all;',
      expect_response: 'DONE',
      timeout
    }
  }

  private compileZeroCommand(stepId: number, timeout: number): CompiledStep {
    return {
      id: stepId,
      action: 'SYSTEM', 
      command: 'ZERO',
      serial_cmd: 'zero;all;',
      expect_response: 'DONE',
      timeout
    }
  }

  private compileWaitCommand(command: ScriptCommand, stepId: number, timeout: number): CompiledStep {
    const duration = (command.parameters.duration as number) || 1000

    return {
      id: stepId,
      action: 'WAIT',
      duration,
      serial_cmd: `wait;${duration};`,
      expect_response: 'DONE',
      timeout
    }
  }

  private generateSerialCommand(axis: string, position: number, speed?: number): string {
    const axisCode = axis.toLowerCase()
    const direction = position >= 0 ? 1 : 0
    const absPosition = Math.abs(position)
    
    // Format: "axis;direction;position;speed;"
    if (speed && speed !== 1500) {
      return `${axisCode};${direction};${absPosition};${speed};`
    }
    return `${axisCode};${direction};${absPosition};`
  }

  private getDefaultTimeout(commandType: string): number {
    switch (commandType) {
      case 'MOVE': return 5000
      case 'GROUP': return 8000
      case 'GRIPPER': return 3000
      case 'HOME': return 10000
      case 'ZERO': return 5000
      case 'WAIT': return 3000
      default: return 5000
    }
  }

  private extractAxesFromCommands(commands: ScriptCommand[]): string[] {
    const axesSet = new Set<string>()
    
    commands.forEach(command => {
      if (command.type === 'MOVE' && command.parameters.axis) {
        axesSet.add(command.parameters.axis as string)
      } else if (command.type === 'GROUP' && command.parameters.axes) {
        const axes = command.parameters.axes as Array<{ axis: string }>
        axes.forEach(axis => axesSet.add(axis.axis))
      }
    })

    return Array.from(axesSet).sort()
  }

  protected generateHeader(): string {
    return ''
  }

  protected generateBody(commands: ScriptCommand[]): string {
    return this.generateScript(commands)
  }

  protected generateFooter(): string {
    return ''
  }

  protected formatCommand(): string {
    return ''
  }

  protected validateSingleCommand(): null {
    return null
  }
}