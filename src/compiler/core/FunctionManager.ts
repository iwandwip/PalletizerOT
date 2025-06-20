import { Command, Function } from '../types/CommandTypes';

export class FunctionManager {
  private functions: Map<string, Function> = new Map();

  /**
   * Clear all stored functions
   */
  public clear(): void {
    this.functions.clear();
  }

  /**
   * Add a function to the manager
   */
  public addFunction(func: Function): void {
    this.functions.set(func.name, func);
  }

  /**
   * Get a function by name
   */
  public getFunction(name: string): Function | undefined {
    return this.functions.get(name);
  }

  /**
   * Check if function exists
   */
  public hasFunction(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Get all function names
   */
  public getFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Extract functions from script lines
   */
  public extractFunctions(lines: string[]): void {
    this.clear();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/;$/, '').trim();
      
      // Handle MSL format: FUNC(name) {
      if (line.startsWith('FUNC(')) {
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
              // Note: Command parsing will be done by the main compiler
              // This is just for structure extraction
              commands.push({
                type: 'MOVE', // Placeholder, will be parsed later
                data: { raw: funcLine },
                line: i + 1
              });
            } catch (error: unknown) {
              throw new Error(`Function ${funcName}, Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          i++;
        }
        
        if (i >= lines.length) {
          throw new Error(`Function ${funcName} is missing closing '}'`);
        }
        
        this.addFunction({
          name: funcName,
          commands,
          startLine,
          endLine: i
        });
      }
    }
  }

  /**
   * Skip to end of function definition
   */
  public skipToFunctionEnd(lines: string[], startIndex: number): number {
    let i = startIndex + 1;
    let braceCount = 0;
    
    // Check if opening brace is on same line as FUNC
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
}