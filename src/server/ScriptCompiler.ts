interface Command {
  type: 'MOVE' | 'GROUP' | 'GROUPSYNC' | 'HOME' | 'ZERO' | 'SPEED' | 'SET' | 'WAIT' | 'DETECT' | 'DELAY' | 'FUNC' | 'CALL' | 'LOOP';
  data?: Record<string, unknown>;
  line?: number;
}

interface Function {
  name: string;
  commands: Command[];
  startLine: number;
  endLine: number;
}

export class ScriptCompiler {
  private functions: Map<string, Function> = new Map();
  private variables: Map<string, number> = new Map();

  public async parse(script: string): Promise<Command[]> {
    return this.compileScript(script);
  }

  public compileScript(script: string): Command[] {
    const lines = script.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const commands: Command[] = [];
    
    // First pass: extract functions
    this.extractFunctions(lines);
    
    // Second pass: parse main commands
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      if (line.startsWith('//') || line.startsWith('#')) {
        i++;
        continue;
      }
      
      // Skip function definitions completely
      if (line.startsWith('FUNC(') || line.startsWith('FUNC ')) {
        i = this.skipToFunctionEnd(lines, i) + 1;
        continue;
      }
      
      // Skip standalone braces
      if (line === '{' || line === '}') {
        i++;
        continue;
      }
      
      // Handle LOOP
      if (line.startsWith('LOOP(')) {
        const loopCommands = this.parseLoop(lines, i);
        commands.push(...loopCommands);
        i = this.skipToLoopEnd(lines, i) + 1;
        continue;
      }
      
      try {
        const command = this.parseLine(line, lineNumber);
        if (command) {
          commands.push(command);
        }
      } catch (error: unknown) {
        throw new Error(`Line ${lineNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      i++;
    }
    
    // Expand function calls
    const expandedCommands = this.expandFunctionCalls(commands);
    
    return expandedCommands;
  }

  private extractFunctions(lines: string[]): void {
    this.functions.clear();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/;$/, '').trim();
      
      // Handle legacy format: FUNC name
      if (line.startsWith('FUNC ')) {
        const funcName = line.substring(5).trim();
        const startLine = i;
        const commands: Command[] = [];
        
        i++; // Move to first command in function
        while (i < lines.length && !lines[i].startsWith('ENDFUNC')) {
          const funcLine = lines[i];
          if (!funcLine.startsWith('//') && !funcLine.startsWith('#')) {
            try {
              const command = this.parseLine(funcLine, i + 1);
              if (command) {
                commands.push(command);
              }
            } catch (error: unknown) {
              throw new Error(`Function ${funcName}, Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          i++;
        }
        
        if (i >= lines.length) {
          throw new Error(`Function ${funcName} is missing ENDFUNC`);
        }
        
        this.functions.set(funcName, {
          name: funcName,
          commands,
          startLine,
          endLine: i
        });
      }
      
      // Handle MSL format: FUNC(name) {
      else if (line.startsWith('FUNC(')) {
        const match = line.match(/FUNC\(([^)]+)\)\s*\{?/);
        if (!match) {
          throw new Error(`Invalid MSL function definition: ${line}`);
        }
        
        const funcName = match[1];
        const startLine = i;
        const commands: Command[] = [];
        
        i++; // Move to first command in function
        while (i < lines.length && !lines[i].trim().startsWith('}')) {
          const funcLine = lines[i];
          if (!funcLine.startsWith('//') && !funcLine.startsWith('#') && funcLine.trim() !== '') {
            try {
              const command = this.parseLine(funcLine, i + 1);
              if (command) {
                commands.push(command);
              }
            } catch (error: unknown) {
              throw new Error(`Function ${funcName}, Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          i++;
        }
        
        if (i >= lines.length) {
          throw new Error(`Function ${funcName} is missing closing '}'`);
        }
        
        this.functions.set(funcName, {
          name: funcName,
          commands,
          startLine,
          endLine: i
        });
      }
    }
  }

  private parseLine(line: string, lineNumber: number): Command | null {
    if (!line || line.length === 0) return null;
    
    // Remove semicolon if present
    line = line.replace(/;$/, '').trim()
    
    // Handle MSL format with parentheses: X(100), Y(50), etc.
    if (/^[XYZTG]\(/.test(line)) {
      return this.parseAxisMove(line, lineNumber);
    }
    
    // Handle MSL GROUP format: GROUP(X(100), Y(50), Z(10))
    if (line.startsWith('GROUP(')) {
      return this.parseGroupMove(line, lineNumber);
    }
    
    // Handle MSL GROUPSYNC format: GROUPSYNC(X(100), Y(50), Z(10))
    if (line.startsWith('GROUPSYNC(')) {
      return this.parseGroupMove(line, lineNumber);
    }
    
    // Handle HOME commands: HOME() or HOME(X)
    if (line.startsWith('HOME(')) {
      return this.parseHomeCommand(line, lineNumber);
    }
    
    // Handle ZERO command: ZERO()
    if (line === 'ZERO()') {
      return { type: 'ZERO', data: {}, line: lineNumber };
    }
    
    // Handle SPEED commands: SPEED(1000) or SPEED(X, 2000)
    if (line.startsWith('SPEED(')) {
      return this.parseSpeedCommand(line, lineNumber);
    }
    
    // Handle SET commands: SET(1) or SET(0)
    if (line.startsWith('SET(')) {
      return this.parseSetCommand(line, lineNumber);
    }
    
    // Handle WAIT command: WAIT()
    if (line === 'WAIT()') {
      return { type: 'WAIT', data: {}, line: lineNumber };
    }
    
    // Handle DETECT command: DETECT()
    if (line === 'DETECT()') {
      return { type: 'DETECT', data: {}, line: lineNumber };
    }
    
    // Handle DELAY command: DELAY(1000)
    if (line.startsWith('DELAY(')) {
      return this.parseDelayCommand(line, lineNumber);
    }
    
    // Handle CALL format: CALL(name)
    if (line.startsWith('CALL(')) {
      return this.parseFunctionCall(line, lineNumber);
    }
    
    const parts = line.split(' ');
    const cmd = parts[0].toUpperCase();
    
    switch (cmd) {
      case 'X':
      case 'Y':
      case 'Z':
      case 'T':
      case 'G':
        return this.parseAxisMove(line, lineNumber);
        
      case 'GROUP':
        return this.parseGroupMove(line, lineNumber);
        
      case 'SYNC':
      case 'WAIT':
        return { type: 'SYNC', line: lineNumber };
        
      case 'CALL':
        return this.parseFunctionCall(line, lineNumber);
        
      case 'LOOP':
        return this.parseLoopStart(line, lineNumber);
        
      case 'HOME':
        return { type: 'HOME', line: lineNumber };
        
      case 'ZERO':
        return { type: 'ZERO', line: lineNumber };
        
      case 'SPEED':
        return this.parseSpeedCommand(line, lineNumber);
        
      case 'ACCEL':
        return this.parseAccelCommand(line, lineNumber);
        
      case 'SET':
        // Handle SET(1) or SET(0)
        if (line.includes('(')) {
          const match = line.match(/SET\((\d+)\)/)
          if (match) {
            return {
              type: 'SYNC',
              data: { pin: parseInt(match[1]) },
              line: lineNumber
            }
          }
        }
        break;
        
      default:
        // Try to parse as axis command with different format
        if (this.isAxisCommand(line)) {
          return this.parseAxisMove(line, lineNumber);
        }
        throw new Error(`Unknown command: ${cmd}`);
    }
    
    return null;
  }

  private parseAxisMove(line: string, lineNumber: number): Command {
    const data: Record<string, unknown> = {};
    let speed: number | undefined;
    let accel: number | undefined;
    
    // Parse formats like: X100 Y200 F1000 A500
    const parts = line.split(' ');
    
    for (const part of parts) {
      if (!part) continue;
      
      const firstChar = part[0].toUpperCase();
      const value = this.parseValue(part.substring(1));
      
      if (['X', 'Y', 'Z', 'T', 'G'].includes(firstChar)) {
        data[firstChar] = value;
      } else if (firstChar === 'F') {
        speed = value;
      } else if (firstChar === 'A') {
        accel = value;
      }
    }
    
    if (Object.keys(data).length === 0) {
      throw new Error('No axis movement specified');
    }
    
    if (speed !== undefined) data.speed = speed;
    if (accel !== undefined) data.accel = accel;
    
    return {
      type: 'MOVE',
      data,
      line: lineNumber
    };
  }

  private parseGroupMove(line: string, lineNumber: number): Command {
    const data: Record<string, unknown> = {};
    let speed: number | undefined;
    let accel: number | undefined;
    
    // Parse: GROUP X100 Y200 Z50 F1000 A500
    const parts = line.split(' ').slice(1); // Skip "GROUP"
    
    for (const part of parts) {
      if (!part) continue;
      
      const firstChar = part[0].toUpperCase();
      const value = this.parseValue(part.substring(1));
      
      if (['X', 'Y', 'Z', 'T', 'G'].includes(firstChar)) {
        data[firstChar] = value;
      } else if (firstChar === 'F') {
        speed = value;
      } else if (firstChar === 'A') {
        accel = value;
      }
    }
    
    if (Object.keys(data).length === 0) {
      throw new Error('No axis movement specified in GROUP command');
    }
    
    if (speed !== undefined) data.speed = speed;
    if (accel !== undefined) data.accel = accel;
    
    return {
      type: 'GROUP',
      data,
      line: lineNumber
    };
  }

  private parseFunctionCall(line: string, lineNumber: number): Command {
    const parts = line.split(' ');
    if (parts.length < 2) {
      throw new Error('CALL command requires function name');
    }
    
    const funcName = parts[1];
    if (!this.functions.has(funcName)) {
      throw new Error(`Function '${funcName}' not found`);
    }
    
    return {
      type: 'CALL',
      data: { functionName: funcName },
      line: lineNumber
    };
  }

  private parseLoopStart(line: string, lineNumber: number): Command {
    const parts = line.split(' ');
    if (parts.length < 2) {
      throw new Error('LOOP command requires iteration count');
    }
    
    const count = this.parseValue(parts[1]);
    return {
      type: 'LOOP',
      data: { count },
      line: lineNumber
    };
  }

  private parseSpeedCommand(line: string, lineNumber: number): Command {
    const data: Record<string, unknown> = {};
    const parts = line.split(' ').slice(1); // Skip "SPEED"
    
    for (const part of parts) {
      if (!part) continue;
      
      const firstChar = part[0].toUpperCase();
      if (['X', 'Y', 'Z', 'T', 'G'].includes(firstChar)) {
        data[firstChar] = this.parseValue(part.substring(1));
      }
    }
    
    return {
      type: 'SET_SPEED',
      data,
      line: lineNumber
    };
  }

  private parseAccelCommand(line: string, lineNumber: number): Command {
    const data: Record<string, unknown> = {};
    const parts = line.split(' ').slice(1); // Skip "ACCEL"
    
    for (const part of parts) {
      if (!part) continue;
      
      const firstChar = part[0].toUpperCase();
      if (['X', 'Y', 'Z', 'T', 'G'].includes(firstChar)) {
        data[firstChar] = this.parseValue(part.substring(1));
      }
    }
    
    return {
      type: 'SET_ACCEL',
      data,
      line: lineNumber
    };
  }

  private parseVariableAssignment(line: string): void {
    const [name, value] = line.split('=').map(s => s.trim());
    this.variables.set(name, this.parseValue(value));
  }

  private parseValue(valueStr: string): number {
    if (!valueStr) return 0;
    
    // Check if it's a variable
    if (this.variables.has(valueStr)) {
      return this.variables.get(valueStr)!;
    }
    
    // Parse as number
    const num = parseFloat(valueStr);
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${valueStr}`);
    }
    
    return num;
  }

  private isAxisCommand(line: string): boolean {
    return /^[XYZTG]\d/.test(line);
  }

  private parseLoop(lines: string[], startIndex: number): Command[] {
    const commands: Command[] = [];
    const loopLine = lines[startIndex];
    
    // Parse LOOP(2) format
    const match = loopLine.match(/LOOP\((\d+)\)/);
    if (!match) {
      throw new Error(`Invalid LOOP format: ${loopLine}`);
    }
    
    const count = parseInt(match[1]);
    
    // Get commands inside loop
    const loopCommands: Command[] = [];
    let i = startIndex + 1;
    
    // Skip opening brace if present
    if (lines[i] && lines[i].trim() === '{') {
      i++;
    }
    
    while (i < lines.length && !lines[i].trim().startsWith('}')) {
      const line = lines[i];
      if (!line.startsWith('//') && !line.startsWith('#') && line.trim() !== '') {
        const command = this.parseLine(line, i + 1);
        if (command) {
          loopCommands.push(command);
        }
      }
      i++;
    }
    
    // Expand loop
    for (let j = 0; j < count; j++) {
      commands.push(...this.expandFunctionCalls(loopCommands));
    }
    
    return commands;
  }

  private expandFunctionCalls(commands: Command[]): Command[] {
    const expanded: Command[] = [];
    
    for (const command of commands) {
      if (command.type === 'CALL') {
        const funcName = command.data?.functionName as string;
        const func = this.functions.get(funcName);
        if (func) {
          const expandedFuncCommands = this.expandFunctionCalls(func.commands);
          expanded.push(...expandedFuncCommands);
        }
      } else {
        expanded.push(command);
      }
    }
    
    return expanded;
  }

  private skipToFunctionEnd(lines: string[], startIndex: number): number {
    let i = startIndex + 1;
    let braceCount = 0;
    
    console.log(`skipToFunctionEnd starting at line ${startIndex+1}: "${lines[startIndex]}"`);
    
    // Check if it's MSL format FUNC(name) { or legacy FUNC name
    const isLegacy = lines[startIndex].startsWith('FUNC ');
    
    if (isLegacy) {
      // Legacy format: skip until ENDFUNC
      while (i < lines.length && !lines[i].startsWith('ENDFUNC')) {
        i++;
      }
    } else {
      // MSL format: skip until closing brace
      // Check if opening brace is on same line as FUNC
      if (lines[startIndex].includes('{')) {
        braceCount = 1;
        console.log('Opening brace found on FUNC line');
      } else if (lines[i] && lines[i].trim() === '{') {
        braceCount = 1;
        i++;
        console.log('Opening brace found on next line');
      }
      
      while (i < lines.length && braceCount > 0) {
        const line = lines[i].trim();
        console.log(`  Checking line ${i+1}: "${line}" (braceCount: ${braceCount})`);
        
        if (line === '{') {
          braceCount++;
        } else if (line === '}') {
          braceCount--;
          if (braceCount === 0) {
            console.log(`Function ends at line ${i+1}`);
            break;
          }
        }
        i++;
      }
    }
    
    return i;
  }

  private skipToLoopEnd(lines: string[], startIndex: number): number {
    let i = startIndex + 1;
    let braceCount = 0;
    
    // Check if opening brace is on same line as LOOP
    if (lines[startIndex].includes('{')) {
      braceCount = 1;
    } else if (lines[i] && lines[i].trim() === '{') {
      braceCount = 1;
      i++;
    }
    
    while (i < lines.length && braceCount > 0) {
      const line = lines[i].trim();
      
      if (line === '{') {
        braceCount++;
      } else if (line === '}') {
        braceCount--;
        if (braceCount === 0) {
          break;
        }
      }
      i++;
    }
    return i;
  }

  // New MSL parsing methods
  private parseMSLAxisMove(line: string, lineNumber: number): Command {
    // Parse X(100), Y(50,d1000), Z(10,d500,200), etc.
    const axis = line.charAt(0).toUpperCase();
    const match = line.match(/^[XYZTG]\(([^)]+)\)/);
    
    if (!match) {
      throw new Error(`Invalid MSL axis command format: ${line}`);
    }
    
    const paramStr = match[1];
    const params = paramStr.split(',').map(p => p.trim());
    
    const data: Record<string, unknown> = { [axis]: null };
    let position: number | undefined;
    let endPosition: number | undefined;
    let delay: number | undefined;
    
    params.forEach(param => {
      if (param.startsWith('d')) {
        // Delay parameter: d1000
        delay = parseInt(param.substring(1));
      } else {
        // Position parameter: 100
        const pos = parseInt(param);
        if (position === undefined) {
          position = pos;
        } else {
          endPosition = pos;
        }
      }
    });
    
    if (position !== undefined) {
      data[axis] = position;
    }
    if (endPosition !== undefined) {
      data[`${axis}_end`] = endPosition;
    }
    if (delay !== undefined) {
      data.delay = delay;
    }
    
    return {
      type: 'MOVE',
      data,
      line: lineNumber
    };
  }

  private parseMSLGroupMove(line: string, lineNumber: number): Command {
    // Parse GROUP(X(100), Y(50,d500), Z(10))
    const match = line.match(/GROUP\(([^)]+)\)/);
    
    if (!match) {
      throw new Error(`Invalid MSL GROUP command format: ${line}`);
    }
    
    const movementsStr = match[1];
    const movements = movementsStr.split(',').map(m => m.trim());
    const data: Record<string, unknown> = {};
    
    movements.forEach(movement => {
      const axisMatch = movement.match(/([XYZTG])\(([^)]+)\)/);
      if (axisMatch) {
        const axis = axisMatch[1].toUpperCase();
        const paramStr = axisMatch[2];
        const params = paramStr.split(',').map(p => p.trim());
        
        let position: number | undefined;
        let endPosition: number | undefined;
        let delay: number | undefined;
        
        params.forEach(param => {
          if (param.startsWith('d')) {
            delay = parseInt(param.substring(1));
          } else {
            const pos = parseInt(param);
            if (position === undefined) {
              position = pos;
            } else {
              endPosition = pos;
            }
          }
        });
        
        if (position !== undefined) {
          data[axis] = position;
        }
        if (endPosition !== undefined) {
          data[`${axis}_end`] = endPosition;
        }
        if (delay !== undefined) {
          data[`${axis}_delay`] = delay;
        }
      }
    });
    
    return {
      type: 'GROUP',
      data,
      line: lineNumber
    };
  }

  private parseMSLFunctionCall(line: string, lineNumber: number): Command {
    // Parse CALL(functionName)
    const match = line.match(/CALL\(([^)]+)\)/);
    
    if (!match) {
      throw new Error(`Invalid MSL CALL command format: ${line}`);
    }
    
    const funcName = match[1];
    if (!this.functions.has(funcName)) {
      throw new Error(`Function '${funcName}' not found`);
    }
    
    return {
      type: 'CALL',
      data: { functionName: funcName },
      line: lineNumber
    };
  }

  private parseMSLSpeedCommand(line: string, lineNumber: number): Command {
    // Parse SPEED;1000; or SPEED;x;500;
    const parts = line.split(';').filter(p => p.trim());
    const data: Record<string, unknown> = {};
    
    if (parts.length === 2) {
      // SPEED;1000; - set all axes
      data.ALL = parseInt(parts[1]);
    } else if (parts.length === 3) {
      // SPEED;x;500; - set specific axis
      const axis = parts[1].toUpperCase();
      data[axis] = parseInt(parts[2]);
    } else {
      throw new Error(`Invalid MSL SPEED command format: ${line}`);
    }
    
    return {
      type: 'SPEED',
      data,
      line: lineNumber
    };
  }

  // New parsing methods for updated MSL syntax
  private parseAxisMove(line: string, lineNumber: number): Command {
    // Parse X(100, 200, 300) - multiple positions
    const axis = line.charAt(0).toUpperCase();
    const match = line.match(/^[XYZTG]\(([^)]+)\)/);
    
    if (!match) {
      throw new Error(`Invalid axis command format: ${line}`);
    }
    
    const paramStr = match[1];
    const positions = paramStr.split(',').map(p => parseInt(p.trim()));
    
    // Store all positions for multi-parameter movement
    const data: Record<string, unknown> = { [axis]: positions };
    
    return {
      type: 'MOVE',
      data,
      line: lineNumber
    };
  }

  private parseGroupMove(line: string, lineNumber: number): Command {
    // Parse GROUP(X(100, 200), Y(50), Z(10, 20, 30)) and GROUPSYNC(...)
    const isGroupSync = line.startsWith('GROUPSYNC');
    
    // Fix regex to handle nested parentheses properly
    const match = line.match(/(GROUP|GROUPSYNC)\((.+)\)$/);
    
    if (!match) {
      throw new Error(`Invalid ${isGroupSync ? 'GROUPSYNC' : 'GROUP'} command format: ${line}`);
    }
    
    const movementsStr = match[2];
    const movements = this.splitGroupMovements(movementsStr);
    const data: Record<string, unknown> = {};
    
    movements.forEach(movement => {
      const axisMatch = movement.match(/([XYZTG])\(([^)]+)\)/);
      if (axisMatch) {
        const axis = axisMatch[1].toUpperCase();
        const positions = axisMatch[2].split(',').map(p => parseInt(p.trim()));
        data[axis] = positions; // Store all positions for GROUP/GROUPSYNC
      }
    });
    
    return {
      type: isGroupSync ? 'GROUPSYNC' : 'GROUP',
      data,
      line: lineNumber
    };
  }

  private parseHomeCommand(line: string, lineNumber: number): Command {
    // Parse HOME() or HOME(X)
    const match = line.match(/HOME\(([^)]*)\)/);
    
    if (!match) {
      throw new Error(`Invalid HOME command format: ${line}`);
    }
    
    const param = match[1].trim();
    const data: Record<string, unknown> = {};
    
    if (param) {
      data[param.toUpperCase()] = true;
    }
    
    return {
      type: 'HOME',
      data,
      line: lineNumber
    };
  }

  private parseSpeedCommand(line: string, lineNumber: number): Command {
    // Parse SPEED(1000) or SPEED(X, 2000)
    const match = line.match(/SPEED\(([^)]+)\)/);
    
    if (!match) {
      throw new Error(`Invalid SPEED command format: ${line}`);
    }
    
    const params = match[1].split(',').map(p => p.trim());
    const data: Record<string, unknown> = {};
    
    if (params.length === 1) {
      // SPEED(1000) - global speed
      data.ALL = parseInt(params[0]);
    } else if (params.length === 2) {
      // SPEED(X, 2000) - axis specific
      const axis = params[0].toUpperCase();
      data[axis] = parseInt(params[1]);
    } else {
      throw new Error(`Invalid SPEED command parameters: ${line}`);
    }
    
    return {
      type: 'SPEED',
      data,
      line: lineNumber
    };
  }

  private parseSetCommand(line: string, lineNumber: number): Command {
    // Parse SET(1) or SET(0)
    const match = line.match(/SET\(([^)]+)\)/);
    
    if (!match) {
      throw new Error(`Invalid SET command format: ${line}`);
    }
    
    const pin = parseInt(match[1]);
    
    return {
      type: 'SET',
      data: { pin },
      line: lineNumber
    };
  }

  private parseDelayCommand(line: string, lineNumber: number): Command {
    // Parse DELAY(1000)
    const match = line.match(/DELAY\(([^)]+)\)/);
    
    if (!match) {
      throw new Error(`Invalid DELAY command format: ${line}`);
    }
    
    const milliseconds = parseInt(match[1]);
    
    return {
      type: 'DELAY',
      data: { milliseconds },
      line: lineNumber
    };
  }

  private parseFunctionCall(line: string, lineNumber: number): Command {
    // Parse CALL(functionName)
    const match = line.match(/CALL\(([^)]+)\)/);
    
    if (!match) {
      throw new Error(`Invalid CALL command format: ${line}`);
    }
    
    const functionName = match[1].trim();
    
    if (!this.functions.has(functionName)) {
      throw new Error(`Function '${functionName}' not found`);
    }
    
    return {
      type: 'CALL',
      data: { functionName },
      line: lineNumber
    };
  }

  private splitGroupMovements(movementsStr: string): string[] {
    // Simple approach: split by ), then add back the closing parenthesis
    // INPUT: "X(100, 200, 300, 400, 500), Y(100, 200, 300, 400, 500), Z(100, 200, 300, 400, 500)"
    const parts = movementsStr.split('),');
    const movements: string[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i].trim();
      
      // Add back closing parenthesis except for the last part
      if (i < parts.length - 1) {
        part += ')';
      }
      
      // Remove any leading comma
      part = part.replace(/^,\s*/, '');
      
      if (part.length > 0) {
        movements.push(part);
      }
    }
    
    return movements;
  }

  public compileToText(script: string): string {
    const commands = this.compileScript(script);
    return commands.map(cmd => this.commandToText(cmd)).join('\n');
  }

  private commandToText(command: Command): string {
    switch (command.type) {
      case 'HOME':
        if (command.data && Object.keys(command.data).length > 0) {
          const axis = Object.keys(command.data)[0];
          return `HOME:${axis}`;
        }
        return 'HOME';
        
      case 'ZERO':
        return 'ZERO';
        
      case 'SPEED':
        if (command.data?.ALL) {
          return `SPEED:ALL:${command.data.ALL}`;
        } else {
          const axis = Object.keys(command.data || {})[0];
          const value = command.data?.[axis];
          return `SPEED:${axis}:${value}`;
        }
        
      case 'MOVE':
        const axis = Object.keys(command.data || {})[0];
        const positions = command.data?.[axis];
        if (Array.isArray(positions)) {
          return `MOVE:${axis}${positions.join(',')}`;
        }
        return `MOVE:${axis}${positions}`;
        
      case 'GROUP':
        if (!command.data || Object.keys(command.data).length === 0) {
          console.error('GROUP command has no data:', command);
          return 'GROUP:';
        }
        const groupAxes = Object.keys(command.data)
          .filter(key => !key.includes('_'))
          .map(axis => {
            const positions = command.data?.[axis];
            if (Array.isArray(positions)) {
              return `${axis}${positions.join(',')}`;
            }
            return `${axis}${positions}`;
          })
          .join(':');
        return `GROUP:${groupAxes}`;
        
      case 'GROUPSYNC':
        if (!command.data || Object.keys(command.data).length === 0) {
          console.error('GROUPSYNC command has no data:', command);
          return 'GROUPSYNC:';
        }
        const syncAxes = Object.keys(command.data)
          .filter(key => !key.includes('_'))
          .map(axis => {
            const positions = command.data?.[axis];
            if (Array.isArray(positions)) {
              return `${axis}${positions.join(',')}`;
            }
            return `${axis}${positions}`;
          })
          .join(':');
        return `GROUPSYNC:${syncAxes}`;
        
      case 'SET':
        return `SET:${command.data?.pin}`;
        
      case 'WAIT':
        return 'WAIT';
        
      case 'DETECT':
        return 'DETECT';
        
      case 'DELAY':
        return `DELAY:${command.data?.milliseconds}`;
        
      default:
        return `UNKNOWN:${command.type}`;
    }
  }
}