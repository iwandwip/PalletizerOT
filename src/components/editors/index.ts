/**
 * Editor components index
 * Barrel export for all editor components
 */

export { TextEditor } from './TextEditor'
export { SpreadsheetEditor } from './SpreadsheetEditor'

// Re-export types for convenience
export type { 
  ScriptCommand,
  ScriptGenerationOptions,
  SpreadsheetRow
} from '@/lib/script-engine'