import { BaseParser } from './BaseParser';
import { Command } from '../types/CommandTypes';

export class GroupParser extends BaseParser {
  protected commandType = 'GROUP';

  canParse(line: string): boolean {
    return line.startsWith('GROUP(') || line.startsWith('GROUPSYNC(');
  }

  parse(line: string, lineNumber: number): Command | null {
    const cleanedLine = this.cleanLine(line);
    
    if (!this.canParse(cleanedLine)) {
      return null;
    }

    const isGroupSync = cleanedLine.startsWith('GROUPSYNC');
    const match = cleanedLine.match(/(GROUP|GROUPSYNC)\((.+)\)$/);
    
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
        const positions = this.parseParameters(axisMatch[2]);
        data[axis] = positions;
      }
    });
    
    return {
      type: isGroupSync ? 'GROUPSYNC' : 'GROUP',
      data,
      line: lineNumber
    };
  }

  private splitGroupMovements(movementsStr: string): string[] {
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
}