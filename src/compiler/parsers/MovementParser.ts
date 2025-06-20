import { BaseParser } from './BaseParser';
import { Command } from '../types/CommandTypes';

export class MovementParser extends BaseParser {
  protected commandType = 'MOVE';

  canParse(line: string): boolean {
    return /^[XYZTG]\(/.test(line);
  }

  parse(line: string, lineNumber: number): Command | null {
    const cleanedLine = this.cleanLine(line);
    
    if (!this.canParse(cleanedLine)) {
      return null;
    }

    const axis = cleanedLine.charAt(0).toUpperCase();
    const match = cleanedLine.match(/^[XYZTG]\(([^)]+)\)/);
    
    if (!match) {
      throw new Error(`Invalid axis command format: ${line}`);
    }
    
    const paramStr = match[1];
    const positions = this.parseParameters(paramStr);
    
    return {
      type: 'MOVE',
      data: { [axis]: positions },
      line: lineNumber
    };
  }
}