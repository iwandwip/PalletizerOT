/**
 * Main entry point for the Script Engine
 * Facade pattern implementation
 */

export * from './types/ScriptTypes'
export * from './core/BaseScriptGenerator'
export * from './core/ScriptGeneratorFactory'
export * from './generators/MSLScriptGenerator'
export * from './adapters/EditorAdapters'

// Main Script Engine Class - Facade Pattern
import { ScriptGeneratorFactory, GeneratorType } from './core/ScriptGeneratorFactory'
import { 
  SpreadsheetEditorAdapter, 
  TextEditorAdapter 
} from './adapters/EditorAdapters'
import { 
  ScriptCommand, 
  ScriptGenerationOptions, 
  SpreadsheetRow 
} from './types/ScriptTypes'

export class ScriptEngine {
  private static instance: ScriptEngine
  private factory: ScriptGeneratorFactory
  private adapters: {
    spreadsheet: SpreadsheetEditorAdapter
    text: TextEditorAdapter
  }

  private constructor() {
    this.factory = ScriptGeneratorFactory.getInstance()
    this.adapters = {
      spreadsheet: new SpreadsheetEditorAdapter(),
      text: new TextEditorAdapter()
    }
  }

  public static getInstance(): ScriptEngine {
    if (!ScriptEngine.instance) {
      ScriptEngine.instance = new ScriptEngine()
    }
    return ScriptEngine.instance
  }


  /**
   * Generate script from Spreadsheet Editor data
   */
  public generateFromSpreadsheet(
    rows: SpreadsheetRow[], 
    options?: {
      generatorType?: GeneratorType
      generatorOptions?: Partial<ScriptGenerationOptions>
    }
  ): string {
    const commands = this.adapters.spreadsheet.convertToCommands(rows)
    const generator = this.factory.getGenerator(
      options?.generatorType || 'MSL', 
      options?.generatorOptions
    )
    return generator.generateScript(commands)
  }

  /**
   * Generate script from Text Editor (parse existing script)
   */
  public generateFromText(
    scriptText: string, 
    options?: {
      generatorType?: GeneratorType
      generatorOptions?: Partial<ScriptGenerationOptions>
    }
  ): string {
    const commands = this.adapters.text.convertToCommands(scriptText)
    const generator = this.factory.getGenerator(
      options?.generatorType || 'MSL', 
      options?.generatorOptions
    )
    return generator.generateScript(commands)
  }

  /**
   * Generate script from unified ScriptCommand array
   */
  public generateFromCommands(
    commands: ScriptCommand[], 
    options?: {
      generatorType?: GeneratorType
      generatorOptions?: Partial<ScriptGenerationOptions>
    }
  ): string {
    const generator = this.factory.getGenerator(
      options?.generatorType || 'MSL', 
      options?.generatorOptions
    )
    return generator.generateScript(commands)
  }

  /**
   * Parse script text to unified commands
   */
  public parseScript(scriptText: string): ScriptCommand[] {
    return this.adapters.text.convertToCommands(scriptText)
  }


  /**
   * Convert spreadsheet rows to unified commands
   */
  public convertSpreadsheet(rows: SpreadsheetRow[]): ScriptCommand[] {
    return this.adapters.spreadsheet.convertToCommands(rows)
  }

  /**
   * Configuration methods
   */
  public setDefaultOptions(options: Partial<ScriptGenerationOptions>): void {
    this.factory.setDefaultOptions(options)
  }

  public getDefaultOptions(): ScriptGenerationOptions {
    return this.factory.getDefaultOptions()
  }

  public getAvailableGenerators(): GeneratorType[] {
    return this.factory.getAvailableTypes()
  }

  public clearCache(): void {
    this.factory.clearCache()
  }
}