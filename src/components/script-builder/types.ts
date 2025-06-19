export interface BlockDefinition {
  id: string
  type: 'movement' | 'control' | 'function' | 'sensor'
  category: string
  label: string
  icon: React.ReactNode
  parameters: Parameter[]
  color: string
  inputs: number
  outputs: number
  description?: string
}

export interface Parameter {
  name: string
  label: string
  type: 'number' | 'select' | 'boolean' | 'text'
  default: any
  options?: string[]
  min?: number
  max?: number
  required?: boolean
}

export interface BlockInstance {
  id: string
  definitionId: string
  position: { x: number; y: number }
  parameters: Record<string, any>
  connections: {
    inputs: string[]
    outputs: string[]
  }
}

export interface Connection {
  id: string
  fromBlockId: string
  toBlockId: string
  fromPort: number
  toPort: number
}

export interface BlockEditorState {
  blocks: BlockInstance[]
  connections: Connection[]
  selectedBlockId: string | null
}