export interface ParsedCommand {
  type: 'MOVEMENT' | 'GROUP' | 'SPEED' | 'SYSTEM' | 'SYNC' | 'FUNCTION' | 'CALL' | 'WAIT' | 'DETECT'
  raw: string
  data: any
  lineNumber: number
  estimated_duration?: number
  dependencies?: string[]
}

export interface ParsedFunction {
  name: string
  commands: ParsedCommand[]
  lineNumber: number
  estimated_duration: number
}

export interface ParseResult {
  commands: ParsedCommand[]
  functions: ParsedFunction[]
  totalCommands: number
  totalDuration: number
  errors: string[]
  warnings: string[]
  syncPoints: number
  complexityScore: number
}

export interface ValidationRule {
  name: string
  check: (command: ParsedCommand) => boolean
  message: string
  severity: 'error' | 'warning'
}

class ScriptParser {
  private validationRules: ValidationRule[] = [
    {
      name: 'ValidAxis',
      check: (cmd) => {
        if (cmd.type === 'MOVEMENT' && cmd.data.axis) {
          return ['X', 'Y', 'Z', 'T', 'G'].includes(cmd.data.axis.toUpperCase())
        }
        return true
      },
      message: 'Invalid axis identifier. Use X, Y, Z, T, or G',
      severity: 'error'
    },
    {
      name: 'ValidSpeed',
      check: (cmd) => {
        if (cmd.type === 'SPEED' && cmd.data.speed) {
          return cmd.data.speed >= 10 && cmd.data.speed <= 10000
        }
        return true
      },
      message: 'Speed value must be between 10 and 10000',
      severity: 'error'
    },
    {
      name: 'ValidPosition',
      check: (cmd) => {
        if (cmd.type === 'MOVEMENT' && cmd.data.parameters?.positions) {
          return cmd.data.parameters.positions.every((pos: number) => 
            pos >= -50000 && pos <= 50000
          )
        }
        return true
      },
      message: 'Position values should be between -50000 and 50000',
      severity: 'warning'
    },
    {
      name: 'ValidSetValue',
      check: (cmd) => {
        if (cmd.type === 'SYNC' && cmd.data.type === 'set') {
          return cmd.data.value === 0 || cmd.data.value === 1
        }
        return true
      },
      message: 'SET command value must be 0 or 1',
      severity: 'error'
    }
  ]

  parse(script: string): ParseResult {
    const result: ParseResult = {
      commands: [],
      functions: [],
      totalCommands: 0,
      totalDuration: 0,
      errors: [],
      warnings: [],
      syncPoints: 0,
      complexityScore: 0
    }

    const lines = this.preprocessScript(script)
    let currentLine = 0

    try {
      while (currentLine < lines.length) {
        const line = lines[currentLine]
        
        if (this.isFunctionDefinition(line)) {
          const funcResult = this.parseFunction(lines, currentLine)
          if (funcResult.func) {
            result.functions.push(funcResult.func)
            result.totalDuration += funcResult.func.estimated_duration
          }
          result.errors.push(...funcResult.errors)
          currentLine = funcResult.nextLine
        } else {
          const command = this.parseCommand(line, currentLine + 1)
          if (command) {
            this.validateCommand(command, result)
            result.commands.push(command)
            result.totalCommands++
            result.totalDuration += command.estimated_duration || 0
            
            if (command.type === 'SYNC') {
              result.syncPoints++
            }
          }
          currentLine++
        }
      }
      
      result.complexityScore = this.calculateComplexity(result)
      this.performGlobalValidation(result)
      
    } catch (error: any) {
      result.errors.push(`Parse error: ${error.message}`)
    }

    return result
  }

  private preprocessScript(script: string): string[] {
    return script
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('//'))
      .map(line => line.replace(/\/\/.*$/, '').trim())
      .filter(line => line.length > 0)
  }

  private isFunctionDefinition(line: string): boolean {
    return line.startsWith('FUNC(') && line.includes(')')
  }

  private parseFunction(lines: string[], startLine: number): { 
    func: ParsedFunction | null, 
    errors: string[], 
    nextLine: number 
  } {
    const errors: string[] = []
    const line = lines[startLine]
    
    const funcMatch = line.match(/FUNC\(([^)]+)\)\s*\{?/)
    if (!funcMatch) {
      errors.push(`Invalid function syntax at line ${startLine + 1}`)
      return { func: null, errors, nextLine: startLine + 1 }
    }

    const funcName = funcMatch[1].trim()
    if (!/^[A-Z][A-Z0-9_]*$/.test(funcName)) {
      errors.push(`Function name '${funcName}' should use UPPER_CASE format`)
    }

    const commands: ParsedCommand[] = []
    let currentLine = startLine + 1
    let braceCount = line.includes('{') ? 1 : 0

    if (braceCount === 0) {
      while (currentLine < lines.length && !lines[currentLine].includes('{')) {
        currentLine++
      }
      if (currentLine < lines.length) {
        braceCount = 1
        currentLine++
      }
    }

    while (currentLine < lines.length && braceCount > 0) {
      const currentLineText = lines[currentLine]
      
      if (currentLineText.includes('{')) braceCount++
      if (currentLineText.includes('}')) braceCount--
      
      if (braceCount > 0) {
        const command = this.parseCommand(currentLineText, currentLine + 1)
        if (command) {
          commands.push(command)
        }
      }
      
      currentLine++
    }

    const estimatedDuration = commands.reduce((total, cmd) => 
      total + (cmd.estimated_duration || 0), 0
    )

    const func: ParsedFunction = {
      name: funcName,
      commands,
      lineNumber: startLine + 1,
      estimated_duration: estimatedDuration
    }

    return { func, errors, nextLine: currentLine }
  }

  private parseCommand(line: string, lineNumber: number): ParsedCommand | null {
    const cleanLine = line.replace(/;$/, '').trim()
    
    if (cleanLine.length === 0) return null

    if (cleanLine.startsWith('GROUP(') && cleanLine.endsWith(')')) {
      return {
        type: 'GROUP',
        raw: cleanLine,
        data: this.parseGroupCommand(cleanLine),
        lineNumber,
        estimated_duration: this.estimateGroupDuration(cleanLine)
      }
    }

    if (cleanLine.startsWith('SPEED;')) {
      return {
        type: 'SPEED',
        raw: cleanLine,
        data: this.parseSpeedCommand(cleanLine),
        lineNumber,
        estimated_duration: 100
      }
    }

    if (['PLAY', 'PAUSE', 'STOP', 'IDLE', 'ZERO'].includes(cleanLine)) {
      return {
        type: 'SYSTEM',
        raw: cleanLine,
        data: { command: cleanLine },
        lineNumber,
        estimated_duration: cleanLine === 'ZERO' ? 10000 : 500
      }
    }

    if (cleanLine.startsWith('SET(') || cleanLine === 'WAIT' || cleanLine === 'DETECT') {
      return {
        type: 'SYNC',
        raw: cleanLine,
        data: this.parseSyncCommand(cleanLine),
        lineNumber,
        estimated_duration: this.estimateSyncDuration(cleanLine)
      }
    }

    if (cleanLine.startsWith('CALL(') && cleanLine.endsWith(')')) {
      return {
        type: 'CALL',
        raw: cleanLine,
        data: { functionName: cleanLine.slice(5, -1) },
        lineNumber,
        estimated_duration: 0
      }
    }

    if (this.isMovementCommand(cleanLine)) {
      return {
        type: 'MOVEMENT',
        raw: cleanLine,
        data: this.parseMovementCommand(cleanLine),
        lineNumber,
        estimated_duration: this.estimateMovementDuration(cleanLine)
      }
    }

    return null
  }

  private parseGroupCommand(command: string): any {
    const content = command.slice(6, -1)
    const axes: any = {}
    
    let depth = 0
    let current = ''
    let axis = ''
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i]
      
      if (char === '(' && depth === 0) {
        axis = current.trim().toUpperCase()
        current = ''
        depth++
      } else if (char === '(') {
        current += char
        depth++
      } else if (char === ')') {
        depth--
        if (depth === 0) {
          axes[axis] = this.parseParameters(current)
          current = ''
          axis = ''
        } else {
          current += char
        }
      } else if (char === ',' && depth === 0) {
        current = ''
      } else {
        current += char
      }
    }
    
    return { 
      axes,
      axisCount: Object.keys(axes).length,
      simultaneous: true
    }
  }

  private parseSpeedCommand(command: string): any {
    const parts = command.split(';')
    
    if (parts.length === 2) {
      return { 
        type: 'global', 
        speed: parseInt(parts[1]),
        axis: 'ALL'
      }
    } else if (parts.length === 3) {
      return { 
        type: 'axis', 
        axis: parts[1].toUpperCase(), 
        speed: parseInt(parts[2])
      }
    }
    
    return {}
  }

  private parseSyncCommand(command: string): any {
    if (command.startsWith('SET(')) {
      const value = command.slice(4, -1)
      return { 
        type: 'set', 
        value: parseInt(value),
        action: parseInt(value) === 1 ? 'SIGNAL_HIGH' : 'SIGNAL_LOW'
      }
    }
    
    if (command === 'WAIT') {
      return { 
        type: 'wait',
        action: 'WAIT_FOR_SIGNAL',
        timeout: 30000
      }
    }
    
    if (command === 'DETECT') {
      return { 
        type: 'detect',
        action: 'MONITOR_DETECTION',
        continuous: true
      }
    }
    
    return { type: command.toLowerCase() }
  }

  private isMovementCommand(command: string): boolean {
    return /^[XYZGT]\(/.test(command) || command.includes(',')
  }

  private parseMovementCommand(command: string): any {
    if (command.includes(',') && !command.includes('(')) {
      const axes: any = {}
      const parts = command.split(',')
      
      for (const part of parts) {
        const trimmed = part.trim()
        const match = trimmed.match(/^([XYZGT])\(([^)]+)\)/)
        if (match) {
          axes[match[1].toUpperCase()] = this.parseParameters(match[2])
        }
      }
      
      return { 
        type: 'multi', 
        axes,
        sequential: true
      }
    } else {
      const match = command.match(/^([XYZGT])\(([^)]+)\)/)
      if (match) {
        return {
          type: 'single',
          axis: match[1].toUpperCase(),
          parameters: this.parseParameters(match[2])
        }
      }
    }
    
    return {}
  }

  private parseParameters(params: string): any {
    const parts = params.split(',').map(p => p.trim())
    const result: any = { 
      positions: [], 
      delays: [],
      speeds: [],
      paramCount: parts.length
    }
    
    for (const part of parts) {
      if (part.startsWith('d')) {
        result.delays.push(parseInt(part.slice(1)))
      } else if (part.startsWith('s')) {
        result.speeds.push(parseInt(part.slice(1)))
      } else if (!isNaN(parseInt(part))) {
        result.positions.push(parseInt(part))
      }
    }
    
    return result
  }

  private estimateMovementDuration(command: string): number {
    const baseTime = 1000
    const match = command.match(/d(\d+)/)
    if (match) {
      return parseInt(match[1]) + baseTime
    }
    return baseTime
  }

  private estimateGroupDuration(command: string): number {
    const delays = command.match(/d(\d+)/g)
    if (delays) {
      const maxDelay = Math.max(...delays.map(d => parseInt(d.slice(1))))
      return maxDelay + 1000
    }
    return 2000
  }

  private estimateSyncDuration(command: string): number {
    if (command === 'WAIT') return 5000
    if (command === 'DETECT') return 1000
    if (command.startsWith('SET(')) return 100
    return 500
  }

  private validateCommand(command: ParsedCommand, result: ParseResult): void {
    for (const rule of this.validationRules) {
      if (!rule.check(command)) {
        const message = `Line ${command.lineNumber}: ${rule.message}`
        if (rule.severity === 'error') {
          result.errors.push(message)
        } else {
          result.warnings.push(message)
        }
      }
    }
  }

  private performGlobalValidation(result: ParseResult): void {
    const functionNames = result.functions.map(f => f.name)
    const calledFunctions = result.commands
      .filter(c => c.type === 'CALL')
      .map(c => c.data.functionName)

    for (const called of calledFunctions) {
      if (!functionNames.includes(called)) {
        result.errors.push(`Function '${called}' is called but not defined`)
      }
    }

    const duplicateFunctions = functionNames.filter((name, index) => 
      functionNames.indexOf(name) !== index
    )
    
    for (const duplicate of duplicateFunctions) {
      result.errors.push(`Function '${duplicate}' is defined multiple times`)
    }

    if (result.syncPoints > 20) {
      result.warnings.push('High number of sync points may affect performance')
    }
  }

  private calculateComplexity(result: ParseResult): number {
    let score = result.totalCommands
    score += result.functions.length * 2
    score += result.syncPoints * 1.5
    
    const groupCommands = result.commands.filter(c => c.type === 'GROUP').length
    score += groupCommands * 1.2
    
    return Math.round(score)
  }

  expandScript(script: string): ParsedCommand[] {
    const parseResult = this.parse(script)
    const expandedCommands: ParsedCommand[] = []
    
    const functionMap = new Map<string, ParsedFunction>()
    parseResult.functions.forEach(func => {
      functionMap.set(func.name, func)
    })
    
    const expandCommands = (commands: ParsedCommand[], depth: number = 0): void => {
      if (depth > 10) {
        console.warn('Maximum function nesting depth reached')
        return
      }
      
      for (const command of commands) {
        if (command.type === 'CALL') {
          const funcName = command.data.functionName
          const func = functionMap.get(funcName)
          if (func) {
            expandCommands(func.commands, depth + 1)
          }
        } else {
          expandedCommands.push(command)
        }
      }
    }
    
    expandCommands(parseResult.commands)
    
    return expandedCommands
  }

  validateSyntax(script: string): { valid: boolean, errors: string[] } {
    const result = this.parse(script)
    return {
      valid: result.errors.length === 0,
      errors: result.errors
    }
  }

  getCommandStatistics(script: string): any {
    const result = this.parse(script)
    const stats = {
      totalCommands: result.totalCommands,
      totalFunctions: result.functions.length,
      estimatedDuration: result.totalDuration,
      complexityScore: result.complexityScore,
      syncPoints: result.syncPoints,
      commandTypes: {} as Record<string, number>
    }

    result.commands.forEach(cmd => {
      stats.commandTypes[cmd.type] = (stats.commandTypes[cmd.type] || 0) + 1
    })

    return stats
  }
}

export const scriptParser = new ScriptParser()