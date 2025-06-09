import { NextResponse } from 'next/server'
import { sequenceRunner } from '@/lib/services/sequence-runner'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST() {
  try {
    sequenceRunner.stop()
    debugManager.info('API', 'System stopped')
    
    return NextResponse.json({ message: 'System stopped' })

  } catch (error: any) {
    debugManager.error('API', 'Failed to stop system', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}