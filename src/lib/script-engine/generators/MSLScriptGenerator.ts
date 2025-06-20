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
        return 'HOME'
      
      case 'ZERO':
        return 'ZERO'
      
      case 'GRIPPER':
        return command.parameters.action === 'open' ? 'G0' : 'G1'
      
      case 'WAIT':
        return 'SYNC'
      
      case 'SPEED':
        return this.formatSpeedCommand(command as SpeedCommand)
      
      case 'FUNC':
        return this.formatFunctionCommand(command as FunctionCommand)
      
      case 'CALL':
        return `CALL ${command.parameters.name}`
      
      case 'LOOP':
        return this.formatLoopCommand(command as LoopCommand)
      
      case 'ENDLOOP':
        return 'ENDLOOP'
      
      case 'ENDFUNC':
        return 'ENDFUNC'
      
      default:
        return this.generateComment(`Unknown command: ${command.type}`)
    }
  }

  private formatMovementCommand(command: MovementCommand): string {
    const { axis, position, speed } = command.parameters
    const speedPart = speed && speed !== 1500 ? ` F${speed}` : ''
    return `${axis}${position}${speedPart}`
  }

  private formatGroupCommand(command: GroupCommand): string {
    const { axes, speed } = command.parameters
    const axesPart = axes.map(a => `${a.axis}${a.position}`).join(' ')
    const speedPart = speed && speed !== 1500 ? ` F${speed}` : ''
    return `GROUP ${axesPart}${speedPart}`
  }

  private formatSpeedCommand(command: SpeedCommand): string {
    const { axis, speed } = command.parameters
    return `SPEED ${axis} ${speed}`
  }

  private formatFunctionCommand(command: FunctionCommand): string {
    const { name, body } = command.parameters
    const lines = [`FUNC ${name}`]
    
    if (Array.isArray(body)) {
      body.forEach(cmd => {
        const cmdLine = this.formatCommand(cmd)
        if (cmdLine) {
          lines.push(this.addIndentation(cmdLine))
        }
      })
    }
    
    lines.push('ENDFUNC')
    return lines.join(this.options.lineEndings)
  }

  private formatLoopCommand(command: LoopCommand): string {
    const { count, body } = command.parameters
    const lines = [`LOOP ${count}`]
    
    if (Array.isArray(body)) {
      body.forEach(cmd => {
        const cmdLine = this.formatCommand(cmd)
        if (cmdLine) {
          lines.push(this.addIndentation(cmdLine))
        }
      })
    }
    
    lines.push('ENDLOOP')
    return lines.join(this.options.lineEndings)
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