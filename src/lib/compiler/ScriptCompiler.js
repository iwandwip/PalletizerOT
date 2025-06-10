class ScriptCompiler {
  constructor() {
    this.functions = new Map()
    this.commands = []
    this.errors = []
  }

  compile(script) {
    this.functions.clear()
    this.commands = []
    this.errors = []

    try {
      const cleaned = this.cleanScript(script)
      const tokens = this.tokenize(cleaned)
      this.parseFunctions(tokens)
      this.parseMainScript(tokens)
      
      return {
        success: this.errors.length === 0,
        commands: this.commands,
        errors: this.errors,
        functions: Array.from(this.functions.keys()),
        totalCommands: this.commands.length
      }
    } catch (error) {
      this.errors.push(`Compilation error: ${error.message}`)
      return {
        success: false,
        commands: [],
        errors: this.errors,
        functions: [],
        totalCommands: 0
      }
    }
  }

  cleanScript(script) {
    return script
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim()
  }

  tokenize(script) {
    const tokens = []
    const lines = script.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.length === 0) continue
      
      tokens.push({
        type: this.getTokenType(line),
        content: line,
        line: i + 1
      })
    }
    
    return tokens
  }

  getTokenType(line) {
    if (line.startsWith('FUNC(')) return 'FUNCTION_DEF'
    if (line.startsWith('CALL(')) return 'FUNCTION_CALL'
    if (line.startsWith('GROUP(')) return 'GROUP_COMMAND'
    if (line === '{') return 'BLOCK_START'
    if (line === '}') return 'BLOCK_END'
    if (['PLAY', 'PAUSE', 'STOP', 'ZERO', 'IDLE'].includes(line)) return 'SYSTEM_COMMAND'
    if (line.startsWith('SPEED;')) return 'SPEED_COMMAND'
    if (['SET(1)', 'SET(0)', 'WAIT', 'DETECT'].includes(line)) return 'SYNC_COMMAND'
    if (this.isMovementCommand(line)) return 'MOVEMENT_COMMAND'
    return 'UNKNOWN'
  }

  isMovementCommand(line) {
    return /^[XYZTG]\(.*\);?$/.test(line)
  }

  parseFunctions(tokens) {
    let i = 0
    while (i < tokens.length) {
      if (tokens[i].type === 'FUNCTION_DEF') {
        const funcResult = this.parseFunction(tokens, i)
        if (funcResult.success) {
          i = funcResult.nextIndex
        } else {
          this.errors.push(...funcResult.errors)
          i++
        }
      } else {
        i++
      }
    }
  }

  parseFunction(tokens, startIndex) {
    const funcLine = tokens[startIndex].content
    const funcMatch = funcLine.match(/^FUNC\(([^)]+)\)/)
    
    if (!funcMatch) {
      return {
        success: false,
        errors: [`Invalid function definition at line ${tokens[startIndex].line}`],
        nextIndex: startIndex + 1
      }
    }

    const funcName = funcMatch[1].trim()
    let i = startIndex + 1
    
    if (i >= tokens.length || tokens[i].type !== 'BLOCK_START') {
      return {
        success: false,
        errors: [`Missing '{' after function ${funcName} at line ${tokens[startIndex].line}`],
        nextIndex: startIndex + 1
      }
    }

    i++
    const funcCommands = []
    let braceCount = 1

    while (i < tokens.length && braceCount > 0) {
      if (tokens[i].type === 'BLOCK_START') {
        braceCount++
      } else if (tokens[i].type === 'BLOCK_END') {
        braceCount--
      }
      
      if (braceCount > 0) {
        funcCommands.push(tokens[i])
      }
      i++
    }

    if (braceCount > 0) {
      return {
        success: false,
        errors: [`Unclosed function ${funcName} at line ${tokens[startIndex].line}`],
        nextIndex: i
      }
    }

    this.functions.set(funcName, funcCommands)
    return {
      success: true,
      errors: [],
      nextIndex: i
    }
  }

  parseMainScript(tokens) {
    const mainTokens = tokens.filter(token => 
      !['FUNCTION_DEF', 'BLOCK_START', 'BLOCK_END'].includes(token.type) &&
      !this.isInsideFunction(token, tokens)
    )

    for (const token of mainTokens) {
      this.processToken(token)
    }
  }

  isInsideFunction(targetToken, allTokens) {
    let insideFunction = false
    let braceCount = 0

    for (const token of allTokens) {
      if (token === targetToken) {
        return insideFunction && braceCount > 0
      }
      
      if (token.type === 'FUNCTION_DEF') {
        insideFunction = true
        braceCount = 0
      } else if (token.type === 'BLOCK_START' && insideFunction) {
        braceCount++
      } else if (token.type === 'BLOCK_END' && insideFunction) {
        braceCount--
        if (braceCount === 0) {
          insideFunction = false
        }
      }
    }
    
    return false
  }

  processToken(token) {
    switch (token.type) {
      case 'FUNCTION_CALL':
        this.processFunctionCall(token)
        break
      case 'GROUP_COMMAND':
        this.processGroupCommand(token)
        break
      case 'MOVEMENT_COMMAND':
        this.processMovementCommand(token)
        break
      case 'SPEED_COMMAND':
        this.processSpeedCommand(token)
        break
      case 'SYNC_COMMAND':
        this.processSyncCommand(token)
        break
      case 'SYSTEM_COMMAND':
        this.processSystemCommand(token)
        break
      default:
        this.errors.push(`Unknown command at line ${token.line}: ${token.content}`)
    }
  }

  processFunctionCall(token) {
    const match = token.content.match(/^CALL\(([^)]+)\)/)
    if (!match) {
      this.errors.push(`Invalid function call at line ${token.line}`)
      return
    }

    const funcName = match[1].trim()
    if (!this.functions.has(funcName)) {
      this.errors.push(`Function '${funcName}' not found at line ${token.line}`)
      return
    }

    const funcCommands = this.functions.get(funcName)
    for (const cmd of funcCommands) {
      this.processToken(cmd)
    }
  }

  processGroupCommand(token) {
    const match = token.content.match(/^GROUP\((.*)\)/)
    if (!match) {
      this.errors.push(`Invalid GROUP command at line ${token.line}`)
      return
    }

    const groupContent = match[1].trim()
    const commands = this.parseGroupCommands(groupContent)
    
    if (commands.length === 0) {
      this.errors.push(`Empty GROUP command at line ${token.line}`)
      return
    }

    const broadcastParts = []
    for (const cmd of commands) {
      const converted = this.convertToSimpleCommand(cmd, token.line)
      if (converted) {
        broadcastParts.push(converted)
      }
    }

    if (broadcastParts.length > 0) {
      this.commands.push(`BROADCAST;${broadcastParts.join(';')}`)
    }
  }

  parseGroupCommands(groupContent) {
    const commands = []
    let current = ''
    let parenCount = 0
    
    for (let i = 0; i < groupContent.length; i++) {
      const char = groupContent[i]
      
      if (char === '(') {
        parenCount++
      } else if (char === ')') {
        parenCount--
      }
      
      if (char === ',' && parenCount === 0) {
        if (current.trim()) {
          commands.push(current.trim())
        }
        current = ''
      } else {
        current += char
      }
    }
    
    if (current.trim()) {
      commands.push(current.trim())
    }
    
    return commands
  }

  processMovementCommand(token) {
    const converted = this.convertToSimpleCommand(token.content, token.line)
    if (converted) {
      this.commands.push(converted)
    }
  }

  convertToSimpleCommand(command, line) {
    const match = command.match(/^([XYZTG])\((.*)\)/)
    if (!match) {
      this.errors.push(`Invalid movement command at line ${line}: ${command}`)
      return null
    }

    const axis = match[1].toLowerCase()
    const params = match[2].split(',').map(p => p.trim())
    
    if (params.length === 0 || !params[0]) {
      this.errors.push(`Missing position parameter at line ${line}: ${command}`)
      return null
    }

    const position = params[0]
    if (!/^\d+$/.test(position)) {
      this.errors.push(`Invalid position parameter at line ${line}: ${command}`)
      return null
    }

    return `${axis};1;${position}`
  }

  processSpeedCommand(token) {
    const parts = token.content.split(';')
    if (parts.length < 2) {
      this.errors.push(`Invalid SPEED command at line ${token.line}`)
      return
    }

    if (parts.length === 2) {
      this.commands.push(`SPEED;${parts[1]}`)
    } else if (parts.length === 3) {
      this.commands.push(`SPEED;${parts[1]};${parts[2]}`)
    }
  }

  processSyncCommand(token) {
    this.commands.push(token.content)
  }

  processSystemCommand(token) {
    this.commands.push(token.content)
  }
}

export default ScriptCompiler