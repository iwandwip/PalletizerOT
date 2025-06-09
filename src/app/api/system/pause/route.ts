import { NextResponse } from 'next/server'
import { sequenceRunner } from '@/lib/services/sequence-runner'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST() {
  try {
    const currentState = sequenceRunner.getState()
    
    if (!currentState.isExecuting) {
      return NextResponse.json({ error: 'System not running' }, { status: 400 })
    }

    sequenceRunner.pause()
    debugManager.info('API', 'System paused')
    
    return NextResponse.json({ message: 'System paused' })

  } catch (error: any) {
    debugManager.error('API', 'Failed to pause system', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}