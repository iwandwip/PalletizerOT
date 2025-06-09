import { NextRequest, NextResponse } from 'next/server'
import { esp32Client } from '@/lib/services/esp32-client'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST(request: NextRequest) {
  try {
    const { speed } = await request.json()
    
    if (typeof speed !== 'number' || speed < 10 || speed > 10000) {
      return NextResponse.json({ error: 'Invalid speed value (10-10000)' }, { status: 400 })
    }

    const command = `SPEED;${speed}`
    const result = await esp32Client.sendCommand(command)
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    debugManager.info('API', `Global speed set to ${speed}`)
    return NextResponse.json({ message: `Global speed set to ${speed}` })

  } catch (error: any) {
    debugManager.error('API', 'Failed to set global speed', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}