import { NextRequest } from 'next/server'
import { sequenceRunner } from '@/lib/services/sequence-runner'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let lastState = sequenceRunner.getState()

      const sendEvent = (type: string, data: any) => {
        try {
          const eventData = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(eventData))
        } catch (error) {
          console.error('Error sending event:', error)
        }
      }

      const interval = setInterval(() => {
        try {
          const currentState = sequenceRunner.getState()
          
          if (JSON.stringify(currentState) !== JSON.stringify(lastState)) {
            sendEvent('status', {
              type: 'status',
              value: currentState
            })
            lastState = currentState
          }

          sendEvent('heartbeat', {
            type: 'heartbeat',
            time: Date.now()
          })
        } catch (error) {
          console.error('Error in status polling:', error)
        }
      }, 1000)

      const cleanup = () => {
        clearInterval(interval)
        try {
          controller.close()
        } catch (error) {
          console.error('Error closing event stream:', error)
        }
      }

      request.signal.addEventListener('abort', cleanup)

      return cleanup
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}