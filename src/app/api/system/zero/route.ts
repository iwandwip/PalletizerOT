import { NextResponse } from 'next/server'
import { esp32Client } from '@/lib/services/esp32-client'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST() {
  try {
    debugManager.info('API', 'Executing ZERO (Homing) command')
    
    const result = await esp32Client.sendCommand('ZERO')
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    debugManager.info('API', 'ZERO command sent successfully')
    return NextResponse.json({ message: 'Homing started' })

  } catch (error: any) {
    debugManager.error('API', 'Failed to execute ZERO command', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}