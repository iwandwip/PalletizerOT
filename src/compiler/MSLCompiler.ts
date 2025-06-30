import { Command, Function, CompilationResult, CompilerOptions } from './types/CommandTypes';
import { FunctionManager, LoopManager, ParserRegistry } from './core';
import { TextGenerator, HybridGenerator, type HybridScript } from './generators';

/**
 * Modern Script Language Compiler
 * 
 * Main compiler class that orchestrates the compilation process:
 * 1. Parse script into commands
 * 2. Extract and manage functions
 * 3. Handle loops and control flow
 * 4. Expand function calls
 * 5. Generate output in various formats
 */
export class MSLCompiler {
  private functionManager: FunctionManager;
  private loopManager: LoopManager;
  private parserRegistry: ParserRegistry;
  private textGenerator: TextGenerator;
  private hybridGenerator: HybridGenerator;
  private options: CompilerOptions;

  constructor(options: Partial<CompilerOptions> = {}) {
    this.functionManager = new FunctionManager();
    this.loopManager = new LoopManager();
    this.parserRegistry = new ParserRegistry();
    this.textGenerator = new TextGenerator();
    this.hybridGenerator = new HybridGenerator();
    
    this.options = {
      format: 'text',
      validateSyntax: true,
      expandFunctions: true,
      expandLoops: true,
      ...options
    };
  }

  /**
   * Compile MSL script to commands
   */
  public compile(script: string): CompilationResult {
    try {
      const commands = this.compileToCommands(script);
      const textCommands = this.textGenerator.generate(commands);
      
      return {
        success: true,
        commands,
        textCommands,
        commandCount: commands.length
      };
    } catch (error) {
      return {
        success: false,
        commands: [],
        textCommands: '',
        commandCount: 0,
        error: error instanceof Error ? error.message : 'Unknown compilation error'
      };
    }
  }

  /**
   * Compile script to command objects
   */
  public compileToCommands(script: string): Command[] {
    const lines = this.preprocessScript(script);
    const commands: Command[] = [];
    
    // First pass: extract functions
    if (this.options.expandFunctions) {
      this.functionManager.extractFunctions(lines);
    }
    
    // Second pass: parse main commands
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Skip comments
      if (this.isComment(line)) {
        i++;
        continue;
      }
      
      // Skip function definitions
      if (this.isFunctionDefinition(line)) {
        i = this.functionManager.skipToFunctionEnd(lines, i) + 1;
        continue;
      }
      
      // Skip standalone braces
      if (this.isStandaloneBrace(line)) {
        i++;
        continue;
      }
      
      // Handle loops
      if (this.isLoopStart(line) && this.options.expandLoops) {
        const loopCommands = this.loopManager.parseLoop(lines, i, (line, lineNumber) => 
          this.parserRegistry.parseLine(line, lineNumber)
        );
        commands.push(...loopCommands);
        i = this.loopManager.skipToLoopEnd(lines, i) + 1;
        continue;
      }
      
      // Parse regular commands
      try {
        const command = this.parserRegistry.parseLine(line, lineNumber);
        if (command) {
          commands.push(command);
        }
      } catch (error: unknown) {
        throw new Error(`Line ${lineNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      i++;
    }
    
    // Expand function calls
    return this.options.expandFunctions ? this.expandFunctionCalls(commands) : commands;
  }

  /**
   * Compile script to text format
   */
  public compileToText(script: string): string {
    const commands = this.compileToCommands(script);
    return this.textGenerator.generate(commands);
  }

  /**
   * Compile script to hybrid format for ESP32
   */
  public compileToHybrid(script: string): HybridScript {
    const commands = this.compileToCommands(script);
    return this.hybridGenerator.generate(commands);
  }

  /**
   * Compile script to hybrid JSON string
   */
  public compileToHybridJson(script: string): string {
    const hybridScript = this.compileToHybrid(script);
    return this.hybridGenerator.toJson(hybridScript);
  }

  /**
   * Get function names for debugging
   */
  public getFunctionNames(): string[] {
    return this.functionManager.getFunctionNames();
  }

  /**
   * Update compiler options
   */
  public setOptions(options: Partial<CompilerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current compiler options
   */
  public getOptions(): CompilerOptions {
    return { ...this.options };
  }

  // Private helper methods

  private preprocessScript(script: string): string[] {
    return script
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  private isComment(line: string): boolean {
    return line.startsWith('//') || line.startsWith('#');
  }

  private isFunctionDefinition(line: string): boolean {
    return line.startsWith('FUNC(') || line.startsWith('FUNC ');
  }

  private isStandaloneBrace(line: string): boolean {
    return line === '{' || line === '}';
  }

  private isLoopStart(line: string): boolean {
    return line.startsWith('LOOP(');
  }

  private expandFunctionCalls(commands: Command[]): Command[] {
    const expanded: Command[] = [];
    
    for (const command of commands) {
      if (command.type === 'CALL') {
        const funcName = command.data?.functionName as string;
        const func = this.functionManager.getFunction(funcName);
        if (func) {
          // Parse function commands properly
          const functionCommands = this.parseFunctionCommands(func);
          const expandedFuncCommands = this.expandFunctionCalls(functionCommands);
          expanded.push(...expandedFuncCommands);
        } else {
          throw new Error(`Function '${funcName}' not found`);
        }
      } else {
        expanded.push(command);
      }
    }
    
    return expanded;
  }

  private parseFunctionCommands(func: Function): Command[] {
    const commands: Command[] = [];
    
    for (const rawCommand of func.commands) {
      if (rawCommand.data?.raw) {
        const line = rawCommand.data.raw as string;
        const lineNumber = rawCommand.line || 0;
        
        try {
          const command = this.parserRegistry.parseLine(line, lineNumber);
          if (command) {
            commands.push(command);
          }
        } catch (error) {
          throw new Error(`Function ${func.name}, Line ${lineNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return commands;
  }
}