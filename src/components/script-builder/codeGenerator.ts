import { BlockInstance } from './types'
import { getBlockDefinition } from './BlockTypes'

export function generateScriptFromBlocks(blocks: BlockInstance[]): string {
  if (blocks.length === 0) {
    return '// No blocks to generate script from'
  }

  const lines: string[] = []
  
  // Add header comment
  lines.push('// Generated from Visual Block Editor')
  lines.push('// Modern Script Language (MSL) for Palletizer')
  lines.push('')

  // Process blocks in order (simple sequential processing for now)
  for (const block of blocks) {
    const definition = getBlockDefinition(block.definitionId)
    if (!definition) continue

    const line = generateCommandFromBlock(block, definition)
    if (line) {
      lines.push(line)
    }
  }

  return lines.join('\n')
}

function generateCommandFromBlock(block: BlockInstance, definition: any): string {
  const params = block.parameters

  switch (block.definitionId) {
    case 'move-x':
      const xSpeed = params.speed && params.speed !== 1500 ? ` F${params.speed}` : ''
      return `X${params.position}${xSpeed}`

    case 'move-y':
      const ySpeed = params.speed && params.speed !== 1500 ? ` F${params.speed}` : ''
      return `Y${params.position}${ySpeed}`

    case 'move-z':
      const zSpeed = params.speed && params.speed !== 1500 ? ` F${params.speed}` : ''
      return `Z${params.position}${zSpeed}`

    case 'group-move':
      const groupSpeed = params.speed && params.speed !== 1500 ? ` F${params.speed}` : ''
      const axes = []
      if (params.x !== 0) axes.push(`X${params.x}`)
      if (params.y !== 0) axes.push(`Y${params.y}`)
      if (params.z !== 0) axes.push(`Z${params.z}`)
      
      if (axes.length > 1) {
        return `GROUP ${axes.join(' ')}${groupSpeed}`
      } else if (axes.length === 1) {
        return `${axes[0]}${groupSpeed}`
      }
      return '// Empty group move'

    case 'home':
      return 'HOME'

    case 'zero':
      return 'ZERO'

    case 'gripper':
      return params.action === 'open' ? 'G0' : 'G1'

    case 'wait':
      return 'SYNC'

    case 'loop':
      return `LOOP ${params.count}\n// Add loop content here\nENDLOOP`

    case 'function':
      return `FUNC ${params.name}\n// Add function content here\nENDFUNC`

    case 'call-function':
      return `CALL ${params.name}`

    case 'set-speed':
      if (params.axis === 'all') {
        return `SPEED ALL ${params.speed}`
      } else {
        return `SPEED ${params.axis.toUpperCase()} ${params.speed}`
      }

    default:
      return `// Unknown block: ${definition.label}`
  }
}

export function parseScriptToBlocks(script: string): BlockInstance[] {
  // This would be the reverse operation - parsing text script back to blocks
  // For now, returning empty array as this is complex and not immediately needed
  // Could be implemented later for full backward compatibility
  return []
}