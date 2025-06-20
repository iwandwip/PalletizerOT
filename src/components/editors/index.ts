/**
 * Editor components index
 * Barrel export for all editor components
 */

export { TextEditor } from './TextEditor'
export { VisualEditor } from './VisualEditor'
export { TimelineEditor } from './TimelineEditor'
export { SpreadsheetEditor } from './SpreadsheetEditor'

// Re-export types for convenience
export type { 
  ScriptCommand,
  ScriptGenerationOptions,
  BlockInstance,
  TimelineCommandData,
  SpreadsheetRow
} from '@/lib/script-engine'