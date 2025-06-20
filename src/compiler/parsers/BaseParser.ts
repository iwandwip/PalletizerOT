import { Command } from '../types/CommandTypes';

export abstract class BaseParser {
  protected abstract commandType: string;

  /**
   * Parse a single line into a command
   */
  abstract parse(line: string, lineNumber: number): Command | null;

  /**
   * Check if this parser can handle the given line
   */
  abstract canParse(line: string): boolean;

  /**
   * Validate command syntax
   */
  protected validateSyntax(line: string): boolean {
    return line.trim().length > 0;
  }

  /**
   * Remove semicolon and trim line
   */
  protected cleanLine(line: string): string {
    return line.replace(/;$/, '').trim();
  }

  /**
   * Parse numeric value with variable support
   */
  protected parseValue(valueStr: string): number {
    if (!valueStr) return 0;
    
    const num = parseFloat(valueStr);
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${valueStr}`);
    }
    
    return num;
  }

  /**
   * Parse comma-separated parameters
   */
  protected parseParameters(paramStr: string): number[] {
    return paramStr.split(',').map(p => this.parseValue(p.trim()));
  }
}