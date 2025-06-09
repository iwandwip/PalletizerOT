import { NextRequest, NextResponse } from 'next/server'
import { fileManager } from '@/lib/services/file-manager'

const defaultConfig = {
  maxWaitTime: 30000,
  strategy: 0,
  maxTimeoutWarning: 5,
  autoRetryCount: 0,
  saveToFile: true
}

export async function GET() {
  try {
    const config = await fileManager.loadConfig('timeout', defaultConfig)
    return NextResponse.json(config)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()
    
    const validatedConfig = {
      maxWaitTime: Math.max(1000, Math.min(300000, config.maxWaitTime || 30000)),
      strategy: Math.max(0, Math.min(3, config.strategy || 0)),
      maxTimeoutWarning: Math.max(1, Math.min(20, config.maxTimeoutWarning || 5)),
      autoRetryCount: Math.max(0, Math.min(5, config.autoRetryCount || 0)),
      saveToFile: Boolean(config.saveToFile)
    }
    
    await fileManager.saveConfig('timeout', validatedConfig)
    
    return NextResponse.json({ 
      message: 'Timeout configuration saved',
      config: validatedConfig
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}