import { BaseParser } from './BaseParser';
import { Command } from '../types/CommandTypes';

export class ControlFlowParser extends BaseParser {
  protected commandType = 'CONTROL';

  canParse(line: string): boolean {
    return line.startsWith('CALL(') || line.startsWith('LOOP(');
  }

  parse(line: string, lineNumber: number): Command | null {
    const cleanedLine = this.cleanLine(line);
    
    if (!this.canParse(cleanedLine)) {
      return null;
    }

    // CALL commands
    if (cleanedLine.startsWith('CALL(')) {
      return this.parseFunctionCall(cleanedLine, lineNumber);
    }
    
    // LOOP commands (for identification only, actual parsing done by compiler)
    if (cleanedLine.startsWith('LOOP(')) {
      return this.parseLoopStart(cleanedLine, lineNumber);
    }

    return null;
  }

  private parseFunctionCall(line: string, lineNumber: number): Command {
    const match = line.match(/CALL\(([^)]+)\)/);
    
    if (!match) {
      throw new Error(`Invalid CALL command format: ${line}`);
    }
    
    const functionName = match[1].trim();
    
    return {
      type: 'CALL',
      data: { functionName },
      line: lineNumber
    };
  }

  private parseLoopStart(line: string, lineNumber: number): Command {
    const match = line.match(/LOOP\((\d+)\)/);
    
    if (!match) {
      throw new Error(`Invalid LOOP format: ${line}`);
    }
    
    const count = parseInt(match[1]);
    
    return {
      type: 'LOOP',
      data: { count },
      line: lineNumber
    };
  }
}