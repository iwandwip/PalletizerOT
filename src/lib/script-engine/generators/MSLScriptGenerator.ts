/**
 * Modern Script Language (MSL) Generator
 * Concrete implementation for Palletizer MSL format
 */

import { BaseScriptGenerator } from '../core/BaseScriptGenerator'
import { ScriptCommand, MovementCommand, GroupCommand, SpeedCommand, FunctionCommand, LoopCommand } from '../types/ScriptTypes'

export class MSLScriptGenerator extends BaseScriptGenerator {
  protected generateHeader(): string {
    if (!this.options.includeComments) return ''
    
    return [
      this.generateComment('Generated Palletizer Script'),
      this.generateComment('Modern Script Language (MSL)'),
      this.generateComment(`Generated at: ${new Date().toISOString()}`),
      ''
    ].join(this.options.lineEndings)
  }

  protected generateBody(commands: ScriptCommand[]): string {
    const lines: string[] = []
    
    commands.forEach((command, index) => {
      if (this.options.includeComments && command.metadata?.description) {
        lines.push(this.generateComment(`Step ${index + 1}: ${command.metadata.description}`))
      }
      
      const commandLine = this.formatCommand(command)
      if (commandLine) {
        lines.push(commandLine)
      }
      
      // Add spacing between commands for readability
      if (this.options.includeComments && index < commands.length - 1) {
        lines.push('')
      }
    })

    return lines.join(this.options.lineEndings)
  }

  protected generateFooter(): string {
    if (!this.options.includeComments) return ''
    
    return [
      '',
      this.generateComment('End of script')
    ].join(this.options.lineEndings)
  }

  protected formatCommand(command: ScriptCommand): string {
    switch (command.type) {
      case 'MOVE':
        return this.formatMovementCommand(command as MovementCommand)
      
      case 'GROUP':
        return this.formatGroupCommand(command as GroupCommand)
      
      case 'HOME':
        return 'HOME;'
      
      case 'ZERO':
        return 'ZERO;'
      
      case 'GRIPPER':
        return command.parameters.action === 'open' ? 'G0;' : 'G1;'
      
      case 'WAIT':
        return 'WAIT;'
      
      case 'SPEED':
        return this.formatSpeedCommand(command as SpeedCommand)
      
      case 'FUNC':
        return this.formatFunctionCommand(command as FunctionCommand)
      
      case 'CALL':
        return `CALL(${command.parameters.name});`
      
      case 'LOOP':
        return this.formatLoopCommand(command as LoopCommand)
      
      case 'ENDLOOP':
        return '}'
      
      case 'ENDFUNC':
        return '}'
      
      default:
        return this.generateComment(`Unknown command: ${command.type}`)
    }
  }

  private formatMovementCommand(command: MovementCommand): string {
    const { axis, position, endPosition, delay } = command.parameters
    
    // MSL format: X(100); X(100,d1000); X(100,d500,200);
    const params = []
    
    if (position !== undefined) {
      params.push(position.toString())
    }
    
    if (delay) {
      params.push(`d${delay}`)
    }
    
    if (endPosition !== undefined && endPosition !== position) {
      params.push(endPosition.toString())
    }
    
    return `${axis}(${params.join(',')});`
  }

  private formatGroupCommand(command: GroupCommand): string {
    const { axes } = command.parameters
    
    // MSL format: GROUP(X(100), Y(50,d500), Z(10));
    const axesPart = axes.map(a => {
      const params = []
      
      if (a.position !== undefined) {
        params.push(a.position.toString())
      }
      
      if (a.delay) {
        params.push(`d${a.delay}`)
      }
      
      if (a.endPosition !== undefined && a.endPosition !== a.position) {
        params.push(a.endPosition.toString())
      }
      
      return `${a.axis}(${params.join(',')})`
    }).join(', ')
    
    return `GROUP(${axesPart});`
  }

  private formatSpeedCommand(command: SpeedCommand): string {
    const { axis, speed } = command.parameters
    
    // MSL format: SPEED;1000; or SPEED;x;500;
    if (axis === 'ALL') {
      return `SPEED;${speed};`
    } else {
      return `SPEED;${axis.toLowerCase()};${speed};`
    }
  }

  private formatFunctionCommand(command: FunctionCommand): string {
    const { name, body } = command.parameters
    
    // Old MSL format: FUNC(name) { ... }
    let result = `FUNC(${name}) {`
    
    if (Array.isArray(body)) {
      body.forEach(cmd => {
        const cmdLine = this.formatCommand(cmd)
        if (cmdLine) {
          result += cmdLine
        }
      })
    }
    
    result += '}'
    return result
  }

  private formatLoopCommand(command: LoopCommand): string {
    const { count, body } = command.parameters
    
    // Old MSL format: LOOP(count) { ... }
    let result = `LOOP(${count}) {`
    
    if (Array.isArray(body)) {
      body.forEach(cmd => {
        const cmdLine = this.formatCommand(cmd)
        if (cmdLine) {
          result += cmdLine
        }
      })
    }
    
    result += '}'
    return result
  }

  protected validateSingleCommand(command: ScriptCommand): { commandId: string; message: string; severity: 'error' | 'warning' } | null {
    switch (command.type) {
      case 'MOVE':
        const moveCmd = command as MovementCommand
        if (!moveCmd.parameters.axis || moveCmd.parameters.position === undefined) {
          return {
            commandId: command.id,
            message: 'Movement command requires axis and position',
            severity: 'error'
          }
        }
        break
      
      case 'GROUP':
        const groupCmd = command as GroupCommand
        if (!Array.isArray(groupCmd.parameters.axes) || groupCmd.parameters.axes.length === 0) {
          return {
            commandId: command.id,
            message: 'Group command requires at least one axis',
            severity: 'error'
          }
        }
        break
      
      case 'SPEED':
        const speedCmd = command as SpeedCommand
        if (!speedCmd.parameters.axis || !speedCmd.parameters.speed) {
          return {
            commandId: command.id,
            message: 'Speed command requires axis and speed value',
            severity: 'error'
          }
        }
        break
      
      case 'FUNC':
      case 'CALL':
        if (!command.parameters.name) {
          return {
            commandId: command.id,
            message: 'Function command requires name',
            severity: 'error'
          }
        }
        break
      
      case 'LOOP':
        const loopCmd = command as LoopCommand
        if (!loopCmd.parameters.count || loopCmd.parameters.count < 1) {
          return {
            commandId: command.id,
            message: 'Loop command requires valid count',
            severity: 'error'
          }
        }
        break
    }

    return null
  }
}