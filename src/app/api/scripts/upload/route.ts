import { NextRequest, NextResponse } from 'next/server'
import { fileManager } from '@/lib/services/file-manager'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.txt')) {
      return NextResponse.json({ error: 'Only .txt files are supported' }, { status: 400 })
    }

    const content = await file.text()
    
    if (content.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `uploaded_${timestamp}_${file.name}`
    
    await fileManager.saveScript(content, filename)
    await fileManager.saveScript(content, 'current_script.txt')
    
    debugManager.info('API', `Script uploaded: ${file.name} (${content.length} bytes)`, {
      filename,
      originalName: file.name,
      size: content.length
    })

    return NextResponse.json({ 
      message: 'Script uploaded successfully',
      filename,
      size: content.length
    })

  } catch (error: any) {
    debugManager.error('API', 'Failed to upload script', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}