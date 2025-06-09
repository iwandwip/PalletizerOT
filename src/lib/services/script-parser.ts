export interface ParsedCommand {
  type: 'MOVEMENT' | 'GROUP' | 'SPEED' | 'SYSTEM' | 'SYNC' | 'FUNCTION' | 'CALL'
  raw: string
  data: any
  lineNumber: number
}

export interface ParsedFunction {
  name: string
  commands: ParsedCommand[]
  lineNumber: number
}

export interface ParseResult {
  commands: ParsedCommand[]
  functions: ParsedFunction[]
  totalCommands: number
  errors: string[]
  warnings: string[]
}

class ScriptParser {
  parse(script: string): ParseResult {
    const result: ParseResult = {
      commands: [],
      functions: [],
      totalCommands: 0,
      errors: [],
      warnings: []
    }

    const lines = script.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    let currentLine = 0

    try {
      while (currentLine < lines.length) {
        const line = lines[currentLine]
        
        if (line.startsWith('FUNC(')) {
          const funcResult = this.parseFunction(lines, currentLine)
          if (funcResult.func) {
            result.functions.push(funcResult.func)
          }
          if (funcResult.errors.length > 0) {
            result.errors.push(...funcResult.errors)
          }
          currentLine = funcResult.nextLine
        } else {
          const command = this.parseCommand(line, currentLine + 1)
          if (command) {
            result.commands.push(command)
            result.totalCommands++
          }
          currentLine++
        }
      }
    } catch (error: any) {
      result.errors.push(`Parse error: ${error.message}`)
    }

    return result
  }

  private parseFunction(lines: string[], startLine: number): { func: ParsedFunction | null, errors: string[], nextLine: number } {
    const errors: string[] = []
    const line = lines[startLine]
    
    const funcMatch = line.match(/FUNC\(([^)]+)\)\s*\{?/)
    if (!funcMatch) {
      errors.push(`Invalid function syntax at line ${startLine + 1}`)
      return { func: null, errors, nextLine: startLine + 1 }
    }

    const funcName = funcMatch[1].trim()
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

    const func: ParsedFunction = {
      name: funcName,
      commands,
      lineNumber: startLine + 1
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
        lineNumber
      }
    }

    if (cleanLine.startsWith('SPEED;')) {
      return {
        type: 'SPEED',
        raw: cleanLine,
        data: this.parseSpeedCommand(cleanLine),
        lineNumber
      }
    }

    if (['PLAY', 'PAUSE', 'STOP', 'IDLE', 'ZERO'].includes(cleanLine)) {
      return {
        type: 'SYSTEM',
        raw: cleanLine,
        data: { command: cleanLine },
        lineNumber
      }
    }

    if (cleanLine.startsWith('SET(') || cleanLine === 'WAIT' || cleanLine === 'DETECT') {
      return {
        type: 'SYNC',
        raw: cleanLine,
        data: this.parseSyncCommand(cleanLine),
        lineNumber
      }
    }

    if (cleanLine.startsWith('CALL(') && cleanLine.endsWith(')')) {
      return {
        type: 'CALL',
        raw: cleanLine,
        data: { functionName: cleanLine.slice(5, -1) },
        lineNumber
      }
    }

    if (this.isMovementCommand(cleanLine)) {
      return {
        type: 'MOVEMENT',
        raw: cleanLine,
        data: this.parseMovementCommand(cleanLine),
        lineNumber
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
        axis = current.trim()
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
    
    return { axes }
  }

  private parseSpeedCommand(command: string): any {
    const parts = command.split(';')
    
    if (parts.length === 2) {
      return { type: 'global', speed: parseInt(parts[1]) }
    } else if (parts.length === 3) {
      return { type: 'axis', axis: parts[1], speed: parseInt(parts[2]) }
    }
    
    return {}
  }

  private parseSyncCommand(command: string): any {
    if (command.startsWith('SET(')) {
      const value = command.slice(4, -1)
      return { type: 'set', value: parseInt(value) }
    }
    
    return { type: command.toLowerCase() }
  }

  private isMovementCommand(command: string): boolean {
    return /^[XYZGT]\(/.test(command) || command.includes(',')
  }

  private parseMovementCommand(command: string): any {
    if (command.includes(',')) {
      const axes: any = {}
      const parts = command.split(',')
      
      for (const part of parts) {
        const trimmed = part.trim()
        const match = trimmed.match(/^([XYZGT])\(([^)]+)\)/)
        if (match) {
          axes[match[1]] = this.parseParameters(match[2])
        }
      }
      
      return { type: 'multi', axes }
    } else {
      const match = command.match(/^([XYZGT])\(([^)]+)\)/)
      if (match) {
        return {
          type: 'single',
          axis: match[1],
          parameters: this.parseParameters(match[2])
        }
      }
    }
    
    return {}
  }

  private parseParameters(params: string): any {
    const parts = params.split(',').map(p => p.trim())
    const result: any = { positions: [], delays: [] }
    
    for (const part of parts) {
      if (part.startsWith('d')) {
        result.delays.push(parseInt(part.slice(1)))
      } else {
        result.positions.push(parseInt(part))
      }
    }
    
    return result
  }

  expandScript(script: string): ParsedCommand[] {
    const parseResult = this.parse(script)
    const expandedCommands: ParsedCommand[] = []
    
    const functionMap = new Map<string, ParsedFunction>()
    parseResult.functions.forEach(func => {
      functionMap.set(func.name, func)
    })
    
    const expandCommands = (commands: ParsedCommand[]): void => {
      for (const command of commands) {
        if (command.type === 'CALL') {
          const funcName = command.data.functionName
          const func = functionMap.get(funcName)
          if (func) {
            expandCommands(func.commands)
          }
        } else {
          expandedCommands.push(command)
        }
      }
    }
    
    expandCommands(parseResult.commands)
    
    return expandedCommands
  }
}

export const scriptParser = new ScriptParser()