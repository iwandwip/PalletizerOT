import { NextResponse } from 'next/server'
import { fileManager } from '@/lib/services/file-manager'

const defaultStats = {
  totalTimeouts: 0,
  successfulWaits: 0,
  lastTimeoutTime: 0,
  totalWaitTime: 0,
  currentRetryCount: 0,
  successRate: 100.0
}

export async function GET() {
  try {
    const stats = await fileManager.loadConfig('timeout-stats', defaultStats)
    
    const calculated = {
      ...stats,
      successRate: stats.totalTimeouts + stats.successfulWaits > 0 
        ? (stats.successfulWaits / (stats.totalTimeouts + stats.successfulWaits)) * 100 
        : 100
    }
    
    return NextResponse.json(calculated)
  } catch (error: any) {
    return NextResponse.json(defaultStats, { status: 200 })
  }
}

export async function DELETE() {
  try {
    await fileManager.saveConfig('timeout-stats', defaultStats)
    
    return NextResponse.json({ 
      message: 'Timeout statistics cleared',
      stats: defaultStats
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const currentStats = await fileManager.loadConfig('timeout-stats', defaultStats)
    
    const updatedStats = {
      ...currentStats,
      totalTimeouts: currentStats.totalTimeouts + 1,
      lastTimeoutTime: Date.now()
    }
    
    updatedStats.successRate = updatedStats.totalTimeouts + updatedStats.successfulWaits > 0 
      ? (updatedStats.successfulWaits / (updatedStats.totalTimeouts + updatedStats.successfulWaits)) * 100 
      : 100
    
    await fileManager.saveConfig('timeout-stats', updatedStats)
    
    return NextResponse.json(updatedStats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}