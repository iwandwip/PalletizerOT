import { BaseParser } from './BaseParser';
import { Command } from '../types/CommandTypes';

export class SystemParser extends BaseParser {
  protected commandType = 'SYSTEM';

  canParse(line: string): boolean {
    return line.startsWith('HOME(') || 
           line === 'ZERO()' || 
           line.startsWith('SPEED(') ||
           line.startsWith('SET(') ||
           line === 'WAIT()' ||
           line === 'DETECT()' ||
           line.startsWith('DELAY(');
  }

  parse(line: string, lineNumber: number): Command | null {
    const cleanedLine = this.cleanLine(line);
    
    if (!this.canParse(cleanedLine)) {
      return null;
    }

    // HOME commands
    if (cleanedLine.startsWith('HOME(')) {
      return this.parseHomeCommand(cleanedLine, lineNumber);
    }
    
    // ZERO command
    if (cleanedLine === 'ZERO()') {
      return { type: 'ZERO', data: {}, line: lineNumber };
    }
    
    // SPEED commands
    if (cleanedLine.startsWith('SPEED(')) {
      return this.parseSpeedCommand(cleanedLine, lineNumber);
    }
    
    // SET commands
    if (cleanedLine.startsWith('SET(')) {
      return this.parseSetCommand(cleanedLine, lineNumber);
    }
    
    // WAIT command
    if (cleanedLine === 'WAIT()') {
      return { type: 'WAIT', data: {}, line: lineNumber };
    }
    
    // DETECT command
    if (cleanedLine === 'DETECT()') {
      return { type: 'DETECT', data: {}, line: lineNumber };
    }
    
    // DELAY command
    if (cleanedLine.startsWith('DELAY(')) {
      return this.parseDelayCommand(cleanedLine, lineNumber);
    }

    return null;
  }

  private parseHomeCommand(line: string, lineNumber: number): Command {
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
}