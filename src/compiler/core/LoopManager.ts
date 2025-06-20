import { Command } from '../types/CommandTypes';

export class LoopManager {
  /**
   * Parse and expand loop commands
   */
  public parseLoop(lines: string[], startIndex: number, parseLineFn: (line: string, lineNumber: number) => Command | null): Command[] {
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
        const command = parseLineFn(line, i + 1);
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

  /**
   * Skip to end of loop definition
   */
  public skipToLoopEnd(lines: string[], startIndex: number): number {
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
}