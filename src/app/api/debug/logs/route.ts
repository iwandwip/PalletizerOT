import { NextRequest, NextResponse } from 'next/server'
import { debugManager } from '@/lib/services/debug-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const limit = parseInt(searchParams.get('limit') || '1000')
    const source = searchParams.get('source')
    const level = searchParams.get('level')
    
    let logs = debugManager.getBuffer()
    
    if (date) {
      const historicalLogs = await debugManager.getHistoricalLogs(date, limit)
      logs = [...historicalLogs, ...logs]
    }
    
    if (source) {
      logs = logs.filter(log => log.source.toLowerCase().includes(source.toLowerCase()))
    }
    
    if (level && level !== 'ALL') {
      logs = logs.filter(log => log.level.toUpperCase() === level.toUpperCase())
    }
    
    logs = logs.slice(-limit)
    
    return NextResponse.json({
      logs,
      total: logs.length,
      filters: { date, limit, source, level }
    })

  } catch (error: any) {
    debugManager.error('API', 'Failed to get debug logs', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}