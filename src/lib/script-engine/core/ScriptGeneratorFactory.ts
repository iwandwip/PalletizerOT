/**
 * Factory pattern for creating script generators
 * Singleton pattern for managing generator instances
 */

import { BaseScriptGenerator } from './BaseScriptGenerator'
import { MSLScriptGenerator } from '../generators/MSLScriptGenerator'
import { ScriptGenerationOptions } from '../types/ScriptTypes'

export type GeneratorType = 'MSL' | 'GCODE' | 'JSON'

export class ScriptGeneratorFactory {
  private static instance: ScriptGeneratorFactory
  private generators: Map<string, BaseScriptGenerator> = new Map()
  private defaultOptions: ScriptGenerationOptions = {
    format: 'MSL',
    includeComments: true,
    indentation: '  ',
    lineEndings: '\n',
    validation: true
  }

  private constructor() {}

  public static getInstance(): ScriptGeneratorFactory {
    if (!ScriptGeneratorFactory.instance) {
      ScriptGeneratorFactory.instance = new ScriptGeneratorFactory()
    }
    return ScriptGeneratorFactory.instance
  }

  /**
   * Get or create a generator instance
   */
  public getGenerator(type: GeneratorType, options?: Partial<ScriptGenerationOptions>): BaseScriptGenerator {
    const key = this.getGeneratorKey(type, options)
    
    if (!this.generators.has(key)) {
      const generator = this.createGenerator(type, options)
      this.generators.set(key, generator)
    }

    return this.generators.get(key)!
  }

  /**
   * Create a new generator instance
   */
  private createGenerator(type: GeneratorType, options?: Partial<ScriptGenerationOptions>): BaseScriptGenerator {
    const mergedOptions = { ...this.defaultOptions, ...options }

    switch (type) {
      case 'MSL':
        return new MSLScriptGenerator(mergedOptions)
      
      case 'GCODE':
        // Placeholder for future G-code generator
        throw new Error('G-code generator not implemented yet')
      
      case 'JSON':
        // Placeholder for future JSON generator
        throw new Error('JSON generator not implemented yet')
      
      default:
        throw new Error(`Unknown generator type: ${type}`)
    }
  }

  /**
   * Generate unique key for caching generators
   */
  private getGeneratorKey(type: GeneratorType, options?: Partial<ScriptGenerationOptions>): string {
    const optionsStr = options ? JSON.stringify(options) : ''
    return `${type}:${optionsStr}`
  }

  /**
   * Set default options for all generators
   */
  public setDefaultOptions(options: Partial<ScriptGenerationOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options }
    // Clear cache to force recreation with new defaults
    this.generators.clear()
  }

  /**
   * Get current default options
   */
  public getDefaultOptions(): ScriptGenerationOptions {
    return { ...this.defaultOptions }
  }

  /**
   * Clear generator cache
   */
  public clearCache(): void {
    this.generators.clear()
  }

  /**
   * Get all available generator types
   */
  public getAvailableTypes(): GeneratorType[] {
    return ['MSL', 'GCODE', 'JSON']
  }

  /**
   * Check if a generator type is available
   */
  public isTypeAvailable(type: GeneratorType): boolean {
    try {
      this.createGenerator(type)
      return true
    } catch {
      return false
    }
  }
}