import { NextRequest, NextResponse } from 'next/server'
import { esp32Client } from '@/lib/services/esp32-client'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST(request: NextRequest) {
  try {
    const { axisId, speed } = await request.json()
    
    if (!axisId || typeof axisId !== 'string') {
      return NextResponse.json({ error: 'Invalid axis ID' }, { status: 400 })
    }
    
    if (typeof speed !== 'number' || speed < 10 || speed > 10000) {
      return NextResponse.json({ error: 'Invalid speed value (10-10000)' }, { status: 400 })
    }

    const validAxes = ['x', 'y', 'z', 't', 'g']
    if (!validAxes.includes(axisId.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid axis ID (x, y, z, t, g)' }, { status: 400 })
    }

    const command = `SPEED;${axisId.toLowerCase()};${speed}`
    const result = await esp32Client.sendCommand(command)
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    debugManager.info('API', `${axisId.toUpperCase()} axis speed set to ${speed}`)
    return NextResponse.json({ message: `${axisId.toUpperCase()} axis speed set to ${speed}` })

  } catch (error: any) {
    debugManager.error('API', 'Failed to set axis speed', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}