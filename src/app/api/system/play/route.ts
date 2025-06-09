import { NextResponse } from 'next/server'
import { sequenceRunner } from '@/lib/services/sequence-runner'
import { fileManager } from '@/lib/services/file-manager'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST() {
  try {
    const currentState = sequenceRunner.getState()
    
    if (currentState.isExecuting) {
      return NextResponse.json({ error: 'Already executing' }, { status: 400 })
    }

    if (currentState.state === 'PAUSED') {
      sequenceRunner.resume()
      debugManager.info('API', 'System resumed')
      return NextResponse.json({ message: 'System resumed' })
    }

    const script = await fileManager.loadScript()
    if (!script.trim()) {
      return NextResponse.json({ error: 'No script loaded' }, { status: 400 })
    }

    await sequenceRunner.loadScript(script)
    await sequenceRunner.play()

    debugManager.info('API', 'System started')
    return NextResponse.json({ message: 'System started' })

  } catch (error: any) {
    debugManager.error('API', 'Failed to start system', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}