/**
 * Adapter classes to convert editor-specific data to unified ScriptCommand format
 * Adapter pattern implementation
 */

import { 
  ScriptCommand, 
  BlockInstance, 
  TimelineCommandData, 
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
 * Adapter for Visual Block Editor
 */
export class BlockEditorAdapter extends BaseEditorAdapter {
  convertToCommands(blocks: BlockInstance[]): ScriptCommand[] {
    // Sort blocks by execution order
    const sortedBlocks = this.sortBlocksByOrder(blocks)
    
    return sortedBlocks.map(block => this.convertBlockToCommand(block))
  }

  private sortBlocksByOrder(blocks: BlockInstance[]): BlockInstance[] {
    // Find start blocks
    const startBlocks = blocks.filter(block => block.role === 'start')
    const normalBlocks = blocks.filter(block => block.role === 'normal' || !block.role)
    const endBlocks = blocks.filter(block => block.role === 'end')
    
    // Simple ordering - can be enhanced with connection traversal
    return [
      ...startBlocks.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0)),
      ...normalBlocks.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0)),
      ...endBlocks.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0))
    ]
  }

  private convertBlockToCommand(block: BlockInstance): ScriptCommand {
    const command: ScriptCommand = {
      id: block.id,
      type: this.mapBlockTypeToCommandType(block.definitionId),
      parameters: { ...block.parameters },
      metadata: {
        order: block.executionOrder,
        description: `Block: ${block.definitionId}`,
        tags: ['visual-editor']
      }
    }

    return command
  }

  private mapBlockTypeToCommandType(blockType: string): ScriptCommand['type'] {
    const mapping: Record<string, ScriptCommand['type']> = {
      'move-x': 'MOVE',
      'move-y': 'MOVE', 
      'move-z': 'MOVE',
      'group-move': 'GROUP',
      'home': 'HOME',
      'zero': 'ZERO',
      'gripper': 'GRIPPER',
      'wait': 'WAIT',
      'set-speed': 'SPEED',
      'function': 'FUNC',
      'call-function': 'CALL',
      'loop': 'LOOP'
    }

    return mapping[blockType] || 'MOVE'
  }
}

/**
 * Adapter for Timeline Editor
 */
export class TimelineEditorAdapter extends BaseEditorAdapter {
  convertToCommands(timelineData: TimelineCommandData[]): ScriptCommand[] {
    return timelineData.map((item, index) => ({
      id: item.id,
      type: item.type,
      parameters: { ...item.parameters },
      metadata: {
        order: index + 1,
        description: item.label,
        tags: ['timeline-editor']
      }
    }))
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
      type: row.command,
      parameters: this.buildParameters(row),
      metadata: {
        order: index + 1,
        description: row.notes || `${row.command} command`,
        tags: ['spreadsheet-editor']
      }
    }

    return command
  }

  private buildParameters(row: SpreadsheetRow): Record<string, unknown> {
    const params: Record<string, unknown> = {}

    switch (row.command) {
      case 'MOVE':
        if (row.axis) params.axis = row.axis
        if (row.position) params.position = this.parseNumber(row.position)
        if (row.speed) params.speed = this.parseNumber(row.speed)
        break

      case 'GROUP':
        if (row.axis && row.position) {
          const axes = row.axis.split(',').map(a => a.trim())
          const positions = row.position.split(',').map(p => this.parseNumber(p.trim()))
          params.axes = axes.map((axis, i) => ({
            axis,
            position: positions[i] || 0
          }))
        }
        if (row.speed) params.speed = this.parseNumber(row.speed)
        break

      case 'SPEED':
        if (row.axis) params.axis = row.axis
        if (row.speed) params.speed = this.parseNumber(row.speed)
        break

      case 'GRIPPER':
        if (row.position) params.action = row.position.toLowerCase()
        break

      case 'FUNC':
      case 'CALL':
        if (row.axis) params.name = row.axis
        break

      case 'LOOP':
        if (row.position) params.count = this.parseNumber(row.position)
        break

      default:
        // Copy all available fields for unknown commands
        if (row.axis) params.axis = row.axis
        if (row.position) params.position = row.position
        if (row.speed) params.speed = row.speed
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
    // Handle axis movements (X100, Y200, etc.)
    if (/^[XYZTG]-?\d+/.test(command)) {
      return 'MOVE'
    }

    const mapping: Record<string, ScriptCommand['type']> = {
      'GROUP': 'GROUP',
      'HOME': 'HOME',
      'ZERO': 'ZERO',
      'G0': 'GRIPPER',
      'G1': 'GRIPPER',
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

    // Handle movement commands (X100 F1500)
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
        // Parse "GROUP X100 Y200 Z50 F1500"
        const movements = parts.slice(1).filter(p => /^[XYZTG]-?\d+/.test(p))
        params.axes = movements.map(m => ({
          axis: m.charAt(0),
          position: parseInt(m.slice(1))
        }))
        
        const speedMatch = line.match(/F(\d+)/)
        if (speedMatch) {
          params.speed = parseInt(speedMatch[1])
        }
        break

      case 'SPEED':
        // Parse "SPEED X 1500" or "SPEED ALL 2000"
        if (parts.length >= 3) {
          params.axis = parts[1]
          params.speed = parseInt(parts[2])
        }
        break

      case 'FUNC':
      case 'CALL':
        // Parse "FUNC pickup" or "CALL pickup"
        if (parts.length >= 2) {
          params.name = parts[1]
        }
        break

      case 'LOOP':
        // Parse "LOOP 5"
        if (parts.length >= 2) {
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