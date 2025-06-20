/**
 * Adapter classes to convert editor-specific data to unified ScriptCommand format
 * Adapter pattern implementation
 */

import { 
  ScriptCommand, 
  SpreadsheetRow,
  MovementCommand,
  GroupCommand,
  SpeedCommand
} from '../types/ScriptTypes'

export abstract class BaseEditorAdapter {
  abstract convertToCommands(data: unknown): ScriptCommand[]
  
  protected generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Adapter for Spreadsheet Editor
 */
export class SpreadsheetEditorAdapter extends BaseEditorAdapter {
  convertToCommands(rows: SpreadsheetRow[]): ScriptCommand[] {
    return rows.map((row, index) => this.convertRowToCommand(row, index))
  }

  private convertRowToCommand(row: SpreadsheetRow, index: number): ScriptCommand {
    const command: ScriptCommand = {
      id: row.id,
      type: this.mapActionToCommandType(row.action),
      parameters: this.buildParametersFromData(row.data),
      metadata: {
        order: row.step,
        description: row.notes || row.summary,
        tags: ['spreadsheet-editor'],
        timeout: row.timeout,
        action: row.action
      }
    }

    return command
  }

  private mapActionToCommandType(action: string): CommandType {
    switch (action) {
      case 'MOVE': return 'MOVE'
      case 'GROUP_MOVE': return 'GROUP'
      case 'SYSTEM': return 'GRIPPER' // Will be handled based on systemCommand
      case 'WAIT': return 'WAIT'
      default: return 'MOVE'
    }
  }

  private buildParametersFromData(data: StepCommandData): Record<string, unknown> {
    const params: Record<string, unknown> = {}

    // For MOVE commands
    if (data.axis && data.position !== undefined) {
      params.axis = data.axis
      params.position = data.position
      if (data.speed) params.speed = data.speed
    }

    // For GROUP_MOVE commands
    if (data.axes) {
      params.axes = data.axes
    }

    // For SYSTEM commands
    if (data.systemCommand) {
      params.action = data.systemCommand.toLowerCase().replace('_', '')
    }

    // For WAIT commands
    if (data.duration) {
      params.duration = data.duration
    }

    return params
  }

  private parseNumber(value: string): number {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }
}

/**
 * Adapter for Text Editor (parse existing scripts)
 */
export class TextEditorAdapter extends BaseEditorAdapter {
  convertToCommands(scriptText: string): ScriptCommand[] {
    const lines = scriptText.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'))

    return lines.map((line, index) => this.parseLineToCommand(line, index))
  }

  private parseLineToCommand(line: string, index: number): ScriptCommand {
    const parts = line.split(/\s+/)
    const command = parts[0].toUpperCase()

    const scriptCommand: ScriptCommand = {
      id: this.generateCommandId(),
      type: this.mapTextToCommandType(command),
      parameters: this.parseLineParameters(line, command),
      metadata: {
        order: index + 1,
        description: `Parsed: ${line}`,
        tags: ['text-editor']
      }
    }

    return scriptCommand
  }

  private mapTextToCommandType(command: string): ScriptCommand['type'] {
    // Handle old MSL axis movements X(100), Y(200), etc.
    if (/^[XYZTG]\(/.test(command)) {
      return 'MOVE'
    }

    // Handle new format axis movements (X100, Y200, etc.)
    if (/^[XYZTG]-?\d+/.test(command)) {
      return 'MOVE'
    }

    const mapping: Record<string, ScriptCommand['type']> = {
      'GROUP': 'GROUP',
      'HOME': 'HOME',
      'ZERO': 'ZERO',
      'G0': 'GRIPPER',
      'G1': 'GRIPPER',
      'WAIT': 'WAIT',
      'SYNC': 'WAIT',
      'SPEED': 'SPEED',
      'FUNC': 'FUNC',
      'CALL': 'CALL',
      'LOOP': 'LOOP',
      'ENDLOOP': 'ENDLOOP',
      'ENDFUNC': 'ENDFUNC'
    }

    return mapping[command] || 'MOVE'
  }

  private parseLineParameters(line: string, command: string): Record<string, unknown> {
    const params: Record<string, unknown> = {}

    // Handle MSL movement commands: X(100); X(100,d1000); X(100,d500,200); 
    if (/^[XYZTG]\(/.test(command)) {
      const axis = command.charAt(0)
      // Parse up to 5 parameters as per MSL spec
      const match = command.match(/^[XYZTG]\(([^)]+)\)/)
      if (match) {
        params.axis = axis
        const paramStr = match[1]
        const paramList = paramStr.split(',').map(p => p.trim())
        
        // Extract positions and delays from parameters
        const positions: number[] = []
        const delays: number[] = []
        
        paramList.forEach(param => {
          if (param.startsWith('d')) {
            // Delay parameter: d1000
            delays.push(parseInt(param.substring(1)))
          } else {
            // Position parameter: 100
            positions.push(parseInt(param))
          }
        })
        
        if (positions.length > 0) {
          params.position = positions[0] // Primary position
          if (positions.length > 1) {
            params.endPosition = positions[positions.length - 1] // Range movement
          }
        }
        
        if (delays.length > 0) {
          params.delay = delays[0] // Primary delay
        }
      }
      return params
    }

    // Handle new format movement commands (X100 F1500)
    if (/^[XYZTG]-?\d+/.test(command)) {
      const axis = command.charAt(0)
      const position = parseInt(command.slice(1))
      params.axis = axis
      params.position = position

      // Check for speed parameter
      const speedMatch = line.match(/F(\d+)/)
      if (speedMatch) {
        params.speed = parseInt(speedMatch[1])
      }
      return params
    }

    // Handle other commands
    const parts = line.split(/\s+/)
    
    switch (command) {
      case 'GROUP':
        // Parse MSL format: GROUP(X(100), Y(200,d500), Z(50));
        const groupMatch = line.match(/GROUP\(([^)]+)\)/)
        if (groupMatch) {
          const movementsStr = groupMatch[1]
          const movements = movementsStr.split(',').map(m => m.trim())
          params.axes = movements.map(m => {
            // Parse each movement: X(100) or Y(200,d500) etc.
            const match = m.match(/([XYZTG])\(([^)]+)\)/)
            if (match) {
              const axis = match[1]
              const paramStr = match[2]
              const paramList = paramStr.split(',').map(p => p.trim())
              
              const positions: number[] = []
              const delays: number[] = []
              
              paramList.forEach(param => {
                if (param.startsWith('d')) {
                  delays.push(parseInt(param.substring(1)))
                } else {
                  positions.push(parseInt(param))
                }
              })
              
              const axisCmd: any = { axis, position: positions[0] }
              if (positions.length > 1) {
                axisCmd.endPosition = positions[positions.length - 1]
              }
              if (delays.length > 0) {
                axisCmd.delay = delays[0]
              }
              
              return axisCmd
            }
            return null
          }).filter(Boolean)
        }
        break

      case 'SPEED':
        // Parse MSL format: "SPEED;1000;" or "SPEED;x;500;"
        if (line.includes(';')) {
          const speedParts = line.split(';').filter(p => p.trim())
          if (speedParts.length === 2) {
            // SPEED;1000; - set all axes
            params.axis = 'ALL'
            params.speed = parseInt(speedParts[1])
          } else if (speedParts.length === 3) {
            // SPEED;x;500; - set specific axis
            params.axis = speedParts[1].toUpperCase()
            params.speed = parseInt(speedParts[2])
          }
        }
        break

      case 'FUNC':
      case 'CALL':
        // Parse old MSL "FUNC(pickup)" or "CALL(pickup)" and new "FUNC pickup" or "CALL pickup"
        if (line.includes('(')) {
          // Old MSL format: FUNC(name) or CALL(name)
          const match = line.match(/(?:FUNC|CALL)\(([^)]+)\)/)
          if (match) {
            params.name = match[1]
          }
        } else if (parts.length >= 2) {
          // New format: "FUNC pickup" or "CALL pickup"
          params.name = parts[1]
        }
        break

      case 'LOOP':
        // Parse old MSL "LOOP(5)" or new "LOOP 5"
        if (line.includes('(')) {
          // Old MSL format: LOOP(count)
          const match = line.match(/LOOP\((\d+)\)/)
          if (match) {
            params.count = parseInt(match[1])
          }
        } else if (parts.length >= 2) {
          // New format: "LOOP 5"
          params.count = parseInt(parts[1])
        }
        break

      case 'G0':
        params.action = 'open'
        break

      case 'G1':
        params.action = 'close'
        break
    }

    return params
  }
}