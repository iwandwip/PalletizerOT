import { NextRequest, NextResponse } from 'next/server'
import { fileManager } from '@/lib/services/file-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename') || 'current_script.txt'
    
    const script = await fileManager.loadScript(filename)
    
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    const downloadFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`
    
    return new NextResponse(script, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`
      }
    })

  } catch (error: any) {
    console.error('Failed to download script:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}