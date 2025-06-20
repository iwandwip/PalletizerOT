'use client'

import { useState, useCallback } from 'react'
import { SpreadsheetEditor as SpreadsheetEditorComponent } from '../script-builder/SpreadsheetEditor'
import { ScriptEngine } from '@/lib/script-engine'
import { SpreadsheetRow } from '@/lib/script-engine/types/ScriptTypes'

interface SpreadsheetEditorProps {
  onScriptGenerated?: (script: string) => void
  initialRows?: SpreadsheetRow[]
}

export function SpreadsheetEditor({ onScriptGenerated, initialRows = [] }: SpreadsheetEditorProps) {
  const [rows, setRows] = useState<SpreadsheetRow[]>(initialRows)
  const scriptEngine = ScriptEngine.getInstance()

  const handleScriptGeneration = useCallback((updatedRows?: SpreadsheetRow[]) => {
    const currentRows = updatedRows || rows
    if (currentRows.length === 0) {
      onScriptGenerated?.('')
      return
    }

    try {
      const script = scriptEngine.generateFromSpreadsheet(currentRows, {
        generatorOptions: {
          includeComments: true,
          indentation: '  '
        }
      })
      onScriptGenerated?.(script)
    } catch (error) {
      console.error('Script generation failed:', error)
      onScriptGenerated?.('// Error generating script: ' + (error as Error).message)
    }
  }, [rows, onScriptGenerated, scriptEngine])

  const handleRowsChange = useCallback((newRows: SpreadsheetRow[]) => {
    setRows(newRows)
    handleScriptGeneration(newRows)
  }, [handleScriptGeneration])

  return (
    <div className="border-0 rounded-lg min-h-[400px] bg-background/30">
      <SpreadsheetEditorComponent 
        onScriptGenerated={onScriptGenerated}
        initialCommands={initialRows}
      />
    </div>
  )
}