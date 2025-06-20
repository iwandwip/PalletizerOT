/**
 * Core types for the script generation system
 */

export interface ScriptCommand {
  id: string
  type: CommandType
  parameters: Record<string, unknown>
  metadata?: {
    order?: number
    description?: string
    tags?: string[]
  }
}

export type CommandType = 
  | 'MOVE'
  | 'GROUP' 
  | 'HOME'
  | 'ZERO'
  | 'GRIPPER'
  | 'WAIT'
  | 'SPEED'
  | 'FUNC'
  | 'CALL'
  | 'LOOP'
  | 'ENDLOOP'
  | 'ENDFUNC'

export interface MovementCommand extends ScriptCommand {
  type: 'MOVE'
  parameters: {
    axis: 'X' | 'Y' | 'Z' | 'T' | 'G'
    position: number
    speed?: number
  }
}

export interface GroupCommand extends ScriptCommand {
  type: 'GROUP'
  parameters: {
    axes: Array<{
      axis: 'X' | 'Y' | 'Z' | 'T' | 'G'
      position: number
    }>
    speed?: number
  }
}

export interface SpeedCommand extends ScriptCommand {
  type: 'SPEED'
  parameters: {
    axis: 'X' | 'Y' | 'Z' | 'T' | 'G' | 'ALL'
    speed: number
  }
}

export interface FunctionCommand extends ScriptCommand {
  type: 'FUNC'
  parameters: {
    name: string
    body: ScriptCommand[]
  }
}

export interface LoopCommand extends ScriptCommand {
  type: 'LOOP'
  parameters: {
    count: number
    body: ScriptCommand[]
  }
}

export interface ScriptGenerationOptions {
  format: 'MSL' | 'GCODE' | 'JSON'
  includeComments: boolean
  indentation: string
  lineEndings: '\n' | '\r\n'
  validation: boolean
}

export interface ScriptValidationResult {
  isValid: boolean
  errors: Array<{
    commandId: string
    message: string
    severity: 'error' | 'warning'
  }>
  warnings: Array<{
    commandId: string
    message: string
  }>
}

export interface EditorState {
  commands: ScriptCommand[]
  selectedCommandIds: string[]
  isDirty: boolean
  lastModified: Date
}


export interface SpreadsheetRow {
  id: string
  command: CommandType
  axis?: string
  position?: string
  speed?: string
  notes?: string
}