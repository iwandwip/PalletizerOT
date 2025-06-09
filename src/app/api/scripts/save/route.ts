import { NextRequest, NextResponse } from 'next/server'
import { fileManager } from '@/lib/services/file-manager'
import { scriptParser } from '@/lib/services/script-parser'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST(request: NextRequest) {
  try {
    const { commands, filename } = await request.json()
    
    if (!commands || typeof commands !== 'string') {
      return NextResponse.json({ error: 'Invalid commands data' }, { status: 400 })
    }

    const parseResult = scriptParser.parse(commands)
    
    if (parseResult.errors.length > 0) {
      debugManager.warning('API', 'Script has parsing errors', { errors: parseResult.errors })
    }

    await fileManager.saveScript(commands, filename)
    
    debugManager.info('API', `Script saved: ${commands.length} bytes`, {
      filename: filename || 'current_script.txt',
      commands: parseResult.totalCommands,
      functions: parseResult.functions.length,
      errors: parseResult.errors.length
    })

    return NextResponse.json({ 
      message: 'Script saved successfully',
      parseResult: {
        totalCommands: parseResult.totalCommands,
        functions: parseResult.functions.length,
        errors: parseResult.errors,
        warnings: parseResult.warnings
      }
    })

  } catch (error: any) {
    debugManager.error('API', 'Failed to save script', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}