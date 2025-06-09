import { NextRequest } from 'next/server'
import { debugManager } from '@/lib/services/debug-manager'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = debugManager.subscribe((entry) => {
        try {
          const data = `event: debug\ndata: ${JSON.stringify(entry)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch (error) {
          console.error('Error in debug stream:', error)
        }
      })

      const cleanup = () => {
        unsubscribe()
        try {
          controller.close()
        } catch (error) {
          console.error('Error closing debug stream:', error)
        }
      }

      request.signal.addEventListener('abort', cleanup)

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch (error) {
          cleanup()
          clearInterval(heartbeat)
        }
      }, 30000)

      return () => {
        cleanup()
        clearInterval(heartbeat)
      }
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