import { NextRequest, NextResponse } from 'next/server'
import { fileManager } from '@/lib/services/file-manager'
import { debugManager } from '@/lib/services/debug-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    
    const script = await fileManager.loadScript(filename || undefined)
    
    debugManager.info('API', `Script loaded: ${script.length} bytes`, {
      filename: filename || 'current_script.txt'
    })

    return new NextResponse(script, {
      headers: {
        'Content-Type': 'text/plain'
      }
    })

  } catch (error: any) {
    debugManager.error('API', 'Failed to load script', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}