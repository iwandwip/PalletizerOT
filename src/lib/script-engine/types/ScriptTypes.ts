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
    endPosition?: number  // For range movement: X(100,d500,200)
    delay?: number        // For delay: d1000 = 1000ms
    speed?: number        // Legacy support
  }
}

export interface GroupCommand extends ScriptCommand {
  type: 'GROUP'
  parameters: {
    axes: Array<{
      axis: 'X' | 'Y' | 'Z' | 'T' | 'G'
      position: number
      endPosition?: number  // For range movement in group
      delay?: number        // For individual delays in group
    }>
    speed?: number  // Legacy support
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
  step: number
  action: 'MOVE' | 'GROUP_MOVE' | 'SYSTEM' | 'WAIT'
  summary: string
  timeout: number
  notes: string
  data: StepCommandData
}

export interface StepCommandData {
  // For MOVE commands
  axis?: string
  position?: number
  speed?: number
  
  // For GROUP_MOVE commands
  axes?: Array<{
    axis: string
    position: number
    speed?: number
  }>
  
  // For SYSTEM commands
  systemCommand?: 'GRIPPER_OPEN' | 'GRIPPER_CLOSE' | 'HOME' | 'ZERO'
  
  // For WAIT commands
  duration?: number
}

export interface CompiledStep {
  id: number
  action: string
  axis?: string
  position?: number
  speed?: number
  serial_cmd?: string
  expect_response?: string
  timeout: number
  parallel?: boolean
  commands?: Array<{
    axis: string
    position: number
    serial_cmd: string
  }>
  expect_responses?: string[]
  command?: string
  duration?: number
}

export interface CompiledScript {
  scriptId: string
  metadata: {
    totalSteps: number
    estimatedTime: number
    axes: string[]
  }
  steps: CompiledStep[]
}