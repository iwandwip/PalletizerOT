import { BlockDefinition } from './types'
import { 
  Move, 
  Home, 
  RotateCcw, 
  Repeat, 
  Code2, 
  Timer, 
  Zap,
  Combine,
  Target,
  Hand
} from 'lucide-react'

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // Movement Blocks
  {
    id: 'move-x',
    type: 'movement',
    category: 'Basic Movement',
    label: 'Move X',
    icon: <Move className="w-4 h-4" />,
    color: 'bg-blue-500',
    inputs: 1,
    outputs: 1,
    description: 'Move X axis to specified position',
    parameters: [
      {
        name: 'position',
        label: 'Position',
        type: 'number',
        default: 0,
        required: true
      },
      {
        name: 'speed',
        label: 'Speed (optional)',
        type: 'number',
        default: 1500,
        min: 100,
        max: 5000
      }
    ]
  },
  {
    id: 'move-y',
    type: 'movement',
    category: 'Basic Movement',
    label: 'Move Y',
    icon: <Move className="w-4 h-4 rotate-90" />,
    color: 'bg-blue-500',
    inputs: 1,
    outputs: 1,
    description: 'Move Y axis to specified position',
    parameters: [
      {
        name: 'position',
        label: 'Position',
        type: 'number',
        default: 0,
        required: true
      },
      {
        name: 'speed',
        label: 'Speed (optional)',
        type: 'number',
        default: 1500,
        min: 100,
        max: 5000
      }
    ]
  },
  {
    id: 'move-z',
    type: 'movement',
    category: 'Basic Movement',
    label: 'Move Z',
    icon: <Move className="w-4 h-4 rotate-45" />,
    color: 'bg-blue-500',
    inputs: 1,
    outputs: 1,
    description: 'Move Z axis to specified position',
    parameters: [
      {
        name: 'position',
        label: 'Position',
        type: 'number',
        default: 0,
        required: true
      },
      {
        name: 'speed',
        label: 'Speed (optional)',
        type: 'number',
        default: 1500,
        min: 100,
        max: 5000
      }
    ]
  },
  {
    id: 'group-move',
    type: 'movement',
    category: 'Advanced Movement',
    label: 'Group Move',
    icon: <Combine className="w-4 h-4" />,
    color: 'bg-purple-500',
    inputs: 1,
    outputs: 1,
    description: 'Move multiple axes simultaneously',
    parameters: [
      {
        name: 'x',
        label: 'X Position',
        type: 'number',
        default: 0
      },
      {
        name: 'y',
        label: 'Y Position',
        type: 'number',
        default: 0
      },
      {
        name: 'z',
        label: 'Z Position',
        type: 'number',
        default: 0
      },
      {
        name: 'speed',
        label: 'Speed',
        type: 'number',
        default: 1500,
        min: 100,
        max: 5000
      }
    ]
  },
  {
    id: 'home',
    type: 'movement',
    category: 'Basic Movement',
    label: 'Home All',
    icon: <Home className="w-4 h-4" />,
    color: 'bg-green-500',
    inputs: 1,
    outputs: 1,
    description: 'Move all axes to home position',
    parameters: []
  },
  {
    id: 'zero',
    type: 'movement',
    category: 'Basic Movement',
    label: 'Zero All',
    icon: <Target className="w-4 h-4" />,
    color: 'bg-green-500',
    inputs: 1,
    outputs: 1,
    description: 'Set current position as zero for all axes',
    parameters: []
  },
  {
    id: 'gripper',
    type: 'movement',
    category: 'End Effector',
    label: 'Gripper',
    icon: <Hand className="w-4 h-4" />,
    color: 'bg-orange-500',
    inputs: 1,
    outputs: 1,
    description: 'Control gripper open/close',
    parameters: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        default: 'close',
        options: ['open', 'close'],
        required: true
      }
    ]
  },
  // Control Flow Blocks
  {
    id: 'wait',
    type: 'control',
    category: 'Flow Control',
    label: 'Wait/Sync',
    icon: <Timer className="w-4 h-4" />,
    color: 'bg-yellow-500',
    inputs: 1,
    outputs: 1,
    description: 'Wait for all movements to complete',
    parameters: []
  },
  {
    id: 'loop',
    type: 'control',
    category: 'Flow Control',
    label: 'Loop',
    icon: <Repeat className="w-4 h-4" />,
    color: 'bg-red-500',
    inputs: 1,
    outputs: 2, // One for loop body, one for after loop
    description: 'Repeat a sequence of commands',
    parameters: [
      {
        name: 'count',
        label: 'Repeat Count',
        type: 'number',
        default: 1,
        min: 1,
        max: 100,
        required: true
      }
    ]
  },
  {
    id: 'function',
    type: 'function',
    category: 'Functions',
    label: 'Function',
    icon: <Code2 className="w-4 h-4" />,
    color: 'bg-indigo-500',
    inputs: 1,
    outputs: 1,
    description: 'Define a reusable function',
    parameters: [
      {
        name: 'name',
        label: 'Function Name',
        type: 'text',
        default: 'myFunction',
        required: true
      }
    ]
  },
  {
    id: 'call-function',
    type: 'function',
    category: 'Functions',
    label: 'Call Function',
    icon: <Code2 className="w-4 h-4" />,
    color: 'bg-indigo-400',
    inputs: 1,
    outputs: 1,
    description: 'Call a defined function',
    parameters: [
      {
        name: 'name',
        label: 'Function Name',
        type: 'text',
        default: 'myFunction',
        required: true
      }
    ]
  },
  {
    id: 'set-speed',
    type: 'movement',
    category: 'Speed Control',
    label: 'Set Speed',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-pink-500',
    inputs: 1,
    outputs: 1,
    description: 'Set speed for specific axes',
    parameters: [
      {
        name: 'axis',
        label: 'Axis',
        type: 'select',
        default: 'all',
        options: ['x', 'y', 'z', 't', 'g', 'all'],
        required: true
      },
      {
        name: 'speed',
        label: 'Speed',
        type: 'number',
        default: 1500,
        min: 100,
        max: 5000,
        required: true
      }
    ]
  }
]

export const BLOCK_CATEGORIES = [
  'Basic Movement',
  'Advanced Movement', 
  'End Effector',
  'Flow Control',
  'Functions',
  'Speed Control'
]

export function getBlockDefinition(id: string): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find(def => def.id === id)
}

export function getBlocksByCategory(category: string): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter(def => def.category === category)
}