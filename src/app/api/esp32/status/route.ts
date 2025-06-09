import { NextResponse } from 'next/server'
import { esp32Client } from '@/lib/services/esp32-client'
import { debugManager } from '@/lib/services/debug-manager'

export async function GET() {
  try {
    const status = await esp32Client.getStatus()
    const connectionCheck = await esp32Client.checkConnection()
    
    const response = {
      ...status,
      connected: connectionCheck,
      timestamp: Date.now()
    }

    if (!connectionCheck) {
      debugManager.warning('API', 'ESP32 connection check failed')
    }

    return NextResponse.json(response)

  } catch (error: any) {
    debugManager.error('API', 'Failed to get ESP32 status', { error: error.message })
    
    return NextResponse.json({
      state: 'IDLE',
      connected: false,
      slaves: [],
      lastUpdate: Date.now(),
      error: error.message
    }, { status: 500 })
  }
}