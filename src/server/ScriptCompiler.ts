interface Command {
  type: 'MOVE' | 'GROUP' | 'SYNC' | 'CALL' | 'LOOP' | 'SET_SPEED' | 'SET_ACCEL' | 'HOME' | 'ZERO';
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
        // Skip comments
        i++;
        continue;
      }
      
      if (line.startsWith('FUNC')) {
        // Skip function definitions in main parsing
        i = this.skipToFunctionEnd(lines, i);
        continue;
      }
      
      try {
        const command = this.parseLine(line, lineNumber);
        if (command) {
          if (command.type === 'LOOP') {
            // Handle loop expansion
            const loopCommands = this.parseLoop(lines, i);
            commands.push(...loopCommands);
            i = this.skipToLoopEnd(lines, i);
          } else {
            commands.push(command);
          }
        }
      } catch (error: unknown) {
        throw new Error(`Line ${lineNumber}: ${error.message}`);
      }
      
      i++;
    }
    
    // Expand function calls
    return this.expandFunctionCalls(commands);
  }

  private extractFunctions(lines: string[]): void {
    this.functions.clear();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
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
              throw new Error(`Function ${funcName}, Line ${i + 1}: ${error.message}`);
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
    }
  }

  private parseLine(line: string, lineNumber: number): Command | null {
    if (!line || line.length === 0) return null;
    
    // Handle variable assignments
    if (line.includes('=')) {
      this.parseVariableAssignment(line);
      return null;
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
        
      default:
        // Try to parse as axis command with different format
        if (this.isAxisCommand(line)) {
          return this.parseAxisMove(line, lineNumber);
        }
        throw new Error(`Unknown command: ${cmd}`);
    }
  }

  private parseAxisMove(line: string, lineNumber: number): Command {
    const data: unknown = {};
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
    const data: unknown = {};
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
    const data: unknown = {};
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
    const data: unknown = {};
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
    const count = this.parseValue(loopLine.split(' ')[1]);
    
    // Get commands inside loop
    const loopCommands: Command[] = [];
    let i = startIndex + 1;
    
    while (i < lines.length && !lines[i].startsWith('ENDLOOP')) {
      const line = lines[i];
      if (!line.startsWith('//') && !line.startsWith('#')) {
        const command = this.parseLine(line, i + 1);
        if (command) {
          loopCommands.push(command);
        }
      }
      i++;
    }
    
    // Expand loop
    for (let j = 0; j < count; j++) {
      commands.push(...loopCommands);
    }
    
    return commands;
  }

  private expandFunctionCalls(commands: Command[]): Command[] {
    const expanded: Command[] = [];
    
    for (const command of commands) {
      if (command.type === 'CALL') {
        const funcName = command.data.functionName;
        const func = this.functions.get(funcName);
        if (func) {
          expanded.push(...this.expandFunctionCalls(func.commands));
        }
      } else {
        expanded.push(command);
      }
    }
    
    return expanded;
  }

  private skipToFunctionEnd(lines: string[], startIndex: number): number {
    let i = startIndex + 1;
    while (i < lines.length && !lines[i].startsWith('ENDFUNC')) {
      i++;
    }
    return i;
  }

  private skipToLoopEnd(lines: string[], startIndex: number): number {
    let i = startIndex + 1;
    while (i < lines.length && !lines[i].startsWith('ENDLOOP')) {
      i++;
    }
    return i;
  }
}