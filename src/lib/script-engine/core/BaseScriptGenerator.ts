/**
 * Abstract base class for all script generators
 * Implements the Template Method pattern
 */

import { ScriptCommand, ScriptGenerationOptions, ScriptValidationResult } from '../types/ScriptTypes'

export abstract class BaseScriptGenerator {
  protected options: ScriptGenerationOptions

  constructor(options: Partial<ScriptGenerationOptions> = {}) {
    this.options = {
      format: 'MSL',
      includeComments: true,
      indentation: '  ',
      lineEndings: '\n',
      validation: true,
      ...options
    }
  }

  /**
   * Main method to generate script from commands
   * Template Method pattern - defines the algorithm structure
   */
  public generateScript(commands: ScriptCommand[]): string {
    if (this.options.validation) {
      const validation = this.validateCommands(commands)
      if (!validation.isValid) {
        throw new Error(`Script validation failed: ${validation.errors[0]?.message}`)
      }
    }

    const processedCommands = this.preprocessCommands(commands)
    const header = this.generateHeader()
    const body = this.generateBody(processedCommands)
    const footer = this.generateFooter()

    return this.assembleScript([header, body, footer].filter(Boolean))
  }

  /**
   * Abstract methods to be implemented by concrete generators
   */
  protected abstract generateHeader(): string
  protected abstract generateBody(commands: ScriptCommand[]): string
  protected abstract generateFooter(): string
  protected abstract formatCommand(command: ScriptCommand): string

  /**
   * Concrete methods with default implementations
   */
  protected preprocessCommands(commands: ScriptCommand[]): ScriptCommand[] {
    return commands.filter(cmd => cmd.type !== undefined)
  }

  protected validateCommands(commands: ScriptCommand[]): ScriptValidationResult {
    const errors: Array<{ commandId: string; message: string; severity: 'error' | 'warning' }> = []
    const warnings: Array<{ commandId: string; message: string }> = []

    commands.forEach(cmd => {
      if (!cmd.id) {
        errors.push({
          commandId: cmd.id || 'unknown',
          message: 'Command missing ID',
          severity: 'error'
        })
      }

      if (!cmd.type) {
        errors.push({
          commandId: cmd.id,
          message: 'Command missing type',
          severity: 'error'
        })
      }

      // Additional validation can be added here
      const commandValidation = this.validateSingleCommand(cmd)
      if (commandValidation) {
        if (commandValidation.severity === 'error') {
          errors.push(commandValidation)
        } else {
          warnings.push({ commandId: cmd.id, message: commandValidation.message })
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  protected validateSingleCommand(command: ScriptCommand): { commandId: string; message: string; severity: 'error' | 'warning' } | null {
    // Override in subclasses for specific validation
    return null
  }

  protected assembleScript(parts: string[]): string {
    return parts.join(this.options.lineEndings)
  }

  protected addIndentation(text: string, level: number = 1): string {
    const indent = this.options.indentation.repeat(level)
    return text.split('\n').map(line => line.trim() ? indent + line : line).join('\n')
  }

  protected generateComment(text: string): string {
    if (!this.options.includeComments) return ''
    return `// ${text}`
  }

  /**
   * Configuration methods
   */
  public setOptions(options: Partial<ScriptGenerationOptions>): void {
    this.options = { ...this.options, ...options }
  }

  public getOptions(): ScriptGenerationOptions {
    return { ...this.options }
  }
}