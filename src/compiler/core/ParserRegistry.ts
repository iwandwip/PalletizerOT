import { BaseParser } from '../parsers/BaseParser';
import { MovementParser } from '../parsers/MovementParser';
import { GroupParser } from '../parsers/GroupParser';
import { SystemParser } from '../parsers/SystemParser';
import { ControlFlowParser } from '../parsers/ControlFlowParser';
import { Command } from '../types/CommandTypes';

export class ParserRegistry {
  private parsers: BaseParser[] = [];

  constructor() {
    this.registerDefaultParsers();
  }

  /**
   * Register default parsers in order of priority
   */
  private registerDefaultParsers(): void {
    this.parsers = [
      new MovementParser(),
      new GroupParser(),
      new SystemParser(),
      new ControlFlowParser()
    ];
  }

  /**
   * Register a custom parser
   */
  public registerParser(parser: BaseParser): void {
    this.parsers.push(parser);
  }

  /**
   * Parse a line using the first matching parser
   */
  public parseLine(line: string, lineNumber: number): Command | null {
    const cleanedLine = line.replace(/;$/, '').trim();
    
    if (!cleanedLine || cleanedLine.startsWith('//') || cleanedLine.startsWith('#')) {
      return null;
    }

    for (const parser of this.parsers) {
      if (parser.canParse(cleanedLine)) {
        try {
          return parser.parse(cleanedLine, lineNumber);
        } catch (error) {
          throw new Error(`Parser error on line ${lineNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    throw new Error(`No parser found for line ${lineNumber}: "${line}"`);
  }

  /**
   * Get all registered parsers
   */
  public getParsers(): BaseParser[] {
    return [...this.parsers];
  }
}