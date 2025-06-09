import { NextRequest, NextResponse } from 'next/server'
import { scriptParser } from '@/lib/services/script-parser'
import { debugManager } from '@/lib/services/debug-manager'

export async function POST(request: NextRequest) {
  try {
    const { script } = await request.json()
    
    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: 'Invalid script data' }, { status: 400 })
    }

    const parseResult = scriptParser.parse(script)
    const expandedCommands = scriptParser.expandScript(script)
    
    debugManager.parser('Script parsed successfully', {
      originalLength: script.length,
      totalCommands: parseResult.totalCommands,
      expandedCommands: expandedCommands.length,
      functions: parseResult.functions.length,
      errors: parseResult.errors.length,
      warnings: parseResult.warnings.length
    })

    return NextResponse.json({
      parseResult,
      expandedCommands,
      stats: {
        originalCommands: parseResult.totalCommands,
        expandedCommands: expandedCommands.length,
        functions: parseResult.functions.length,
        errors: parseResult.errors.length,
        warnings: parseResult.warnings.length
      }
    })

  } catch (error: any) {
    debugManager.error('API', 'Failed to parse script', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}