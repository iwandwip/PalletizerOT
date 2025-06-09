import { NextResponse } from 'next/server'
import { sequenceRunner } from '@/lib/services/sequence-runner'
import { esp32Client } from '@/lib/services/esp32-client'

export async function GET() {
  try {
    const executionState = sequenceRunner.getState()
    const esp32Status = await esp32Client.getStatus()
    
    const response = {
      status: executionState.state,
      execution: {
        isExecuting: executionState.isExecuting,
        currentCommand: executionState.currentCommand,
        totalCommands: executionState.totalCommands,
        progress: executionState.totalCommands > 0 
          ? Math.round((executionState.currentCommand / executionState.totalCommands) * 100) 
          : 0,
        startTime: executionState.startTime,
        currentFunction: executionState.currentFunction,
        errors: executionState.errors
      },
      esp32: {
        connected: esp32Status.connected,
        state: esp32Status.state,
        slaves: esp32Status.slaves,
        lastUpdate: esp32Status.lastUpdate
      }
    }

    return NextResponse.json(response)

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      status: 'IDLE',
      execution: {
        isExecuting: false,
        currentCommand: 0,
        totalCommands: 0,
        progress: 0,
        startTime: 0,
        currentFunction: '',
        errors: [error.message]
      },
      esp32: {
        connected: false,
        state: 'IDLE',
        slaves: [],
        lastUpdate: Date.now()
      }
    }, { status: 500 })
  }
}