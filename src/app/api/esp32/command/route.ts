import { NextRequest, NextResponse } from 'next/server'
import { esp32Client } from '@/lib/services/esp32-client'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json()
    
    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Invalid command data' }, { status: 400 })
    }

    debugManager.info('API', `Sending command to ESP32: ${command}`)
    
    const result = await esp32Client.sendCommand(command)
    
    if (!result.success) {
      debugManager.error('API', `ESP32 command failed: ${result.message}`)
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    debugManager.info('API', `ESP32 command successful: ${result.message}`)
    return NextResponse.json({ 
      message: result.message,
      data: result.data 
    })

  } catch (error: any) {
    debugManager.error('API', 'Failed to send ESP32 command', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}