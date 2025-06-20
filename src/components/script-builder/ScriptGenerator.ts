/**
 * Legacy wrapper for script generation
 * Maintains backward compatibility while using new Script Engine
 */

import { ScriptEngine } from '@/lib/script-engine'
import { BlockInstance } from './types'

// Re-export for backward compatibility
export { BlockInstance } from './types'

/**
 * @deprecated Use ScriptEngine.generateFromBlocks() instead
 */
export function generateScriptFromBlocks(blocks: BlockInstance[]): string {
  if (blocks.length === 0) {
    return '// No blocks to generate script from'
  }

  const scriptEngine = ScriptEngine.getInstance()
  
  try {
    return scriptEngine.generateFromBlocks(blocks)
  } catch (error) {
    console.error('Script generation failed:', error)
    return `// Error generating script: ${(error as Error).message}`
  }
}

/**
 * @deprecated Use ScriptEngine.parseScript() instead
 */
export function parseScriptToBlocks(): BlockInstance[] {
  // This would be the reverse operation - parsing text script back to blocks
  // For now, returning empty array as this is complex and not immediately needed
  // Could be implemented later for full backward compatibility
  return []
}