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

  // Sort blocks by execution order (considering connections and roles)
  const sortedBlocks = getSortedBlocks(blocks)
  
  // Process blocks in proper execution order
  for (const block of sortedBlocks) {
    const definition = getBlockDefinition(block.definitionId)
    if (!definition) continue

    const line = generateCommandFromBlock(block, definition)
    if (line) {
      lines.push(`// Block #${block.executionOrder || '?'} (${block.role || 'normal'})`)
      lines.push(line)
      lines.push('')
    }
  }

  return lines.join('\n')
}

function getSortedBlocks(blocks: BlockInstance[]): BlockInstance[] {
  // First, find start blocks
  const startBlocks = blocks.filter(block => block.role === 'start')
  const normalBlocks = blocks.filter(block => block.role === 'normal' || !block.role)
  const endBlocks = blocks.filter(block => block.role === 'end')
  
  // If we have explicit start/end blocks, use them to determine order
  if (startBlocks.length > 0 || endBlocks.length > 0) {
    const result: BlockInstance[] = []
    
    // Add start blocks first
    result.push(...startBlocks.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0)))
    
    // Add normal blocks based on their connections and execution order
    const connectedBlocks = new Set<string>()
    const addConnectedBlocks = (blockId: string) => {
      if (connectedBlocks.has(blockId)) return
      
      const block = blocks.find(b => b.id === blockId)
      if (!block || block.role === 'start' || block.role === 'end') return
      
      connectedBlocks.add(blockId)
      result.push(block)
      
      // Add blocks connected to this block's outputs
      block.connections.outputs.forEach(outputBlockId => {
        addConnectedBlocks(outputBlockId)
      })
    }
    
    // Follow connections from start blocks
    startBlocks.forEach(startBlock => {
      startBlock.connections.outputs.forEach(addConnectedBlocks)
    })
    
    // Add any remaining normal blocks not connected
    normalBlocks
      .filter(block => !connectedBlocks.has(block.id))
      .sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0))
      .forEach(block => result.push(block))
    
    // Add end blocks last
    result.push(...endBlocks.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0)))
    
    return result
  }
  
  // Fallback: sort by execution order if no explicit start/end
  return blocks.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0))
}

function generateCommandFromBlock(block: BlockInstance, definition: { id: string; label: string }): string {
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
        return `SPEED ${String(params.axis).toUpperCase()} ${params.speed}`
      }

    default:
      return `// Unknown block: ${definition.label}`
  }
}

export function parseScriptToBlocks(): BlockInstance[] {
  // This would be the reverse operation - parsing text script back to blocks
  // For now, returning empty array as this is complex and not immediately needed
  // Could be implemented later for full backward compatibility
  return []
}