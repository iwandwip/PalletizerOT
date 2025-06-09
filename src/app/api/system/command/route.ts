import { NextRequest, NextResponse } from 'next/server'
import { esp32Client } from '@/lib/services/esp32-client'
import { sequenceRunner } from '@/lib/services/sequence-runner'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json()
    
    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Invalid command data' }, { status: 400 })
    }

    const upperCommand = command.toUpperCase().trim()
    
    switch (upperCommand) {
      case 'PLAY':
        return handlePlay()
      case 'PAUSE':
        return handlePause()
      case 'STOP':
        return handleStop()
      case 'ZERO':
        return handleZero()
      case 'IDLE':
        return handleIdle()
      default:
        return handleGenericCommand(command)
    }

  } catch (error: any) {
    debugManager.error('API', 'Failed to process command', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handlePlay() {
  const currentState = sequenceRunner.getState()
  
  if (currentState.isExecuting) {
    return NextResponse.json({ error: 'Already executing' }, { status: 400 })
  }

  if (currentState.state === 'PAUSED') {
    sequenceRunner.resume()
    debugManager.info('API', 'System resumed via command')
    return NextResponse.json({ message: 'System resumed' })
  }

  const result = await esp32Client.sendCommand('PLAY')
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  debugManager.info('API', 'PLAY command sent to ESP32')
  return NextResponse.json({ message: 'PLAY command sent' })
}

async function handlePause() {
  sequenceRunner.pause()
  
  const result = await esp32Client.sendCommand('PAUSE')
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  debugManager.info('API', 'PAUSE command sent')
  return NextResponse.json({ message: 'PAUSE command sent' })
}

async function handleStop() {
  sequenceRunner.stop()
  
  const result = await esp32Client.sendCommand('STOP')
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  debugManager.info('API', 'STOP command sent')
  return NextResponse.json({ message: 'STOP command sent' })
}

async function handleZero() {
  const result = await esp32Client.sendCommand('ZERO')
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  debugManager.info('API', 'ZERO command sent')
  return NextResponse.json({ message: 'ZERO command sent' })
}

async function handleIdle() {
  sequenceRunner.reset()
  
  const result = await esp32Client.sendCommand('IDLE')
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  debugManager.info('API', 'IDLE command sent')
  return NextResponse.json({ message: 'IDLE command sent' })
}

async function handleGenericCommand(command: string) {
  debugManager.info('API', `Sending generic command: ${command}`)
  
  const result = await esp32Client.sendCommand(command)
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  debugManager.info('API', `Generic command sent: ${command}`)
  return NextResponse.json({ message: `Command sent: ${command}` })
}