import { useState, useEffect, useCallback, useMemo } from 'react'

interface ScriptData {
  arm1Script: string
  arm2Script: string
  arm1CompiledCommands: string[]
  arm2CompiledCommands: string[]
  arm1CommandCount: number
  arm2CommandCount: number
  arm1Mode: 'MSL' | 'RAW'
  arm2Mode: 'MSL' | 'RAW'
}

// Simple global script state management
let globalScriptData: ScriptData = {
  arm1Script: '',
  arm2Script: '',
  arm1CompiledCommands: [],
  arm2CompiledCommands: [],
  arm1CommandCount: 0,
  arm2CommandCount: 0,
  arm1Mode: 'MSL',
  arm2Mode: 'MSL'
}

const listeners = new Set<() => void>()

const notifyListeners = () => {
  listeners.forEach(listener => listener())
}

export const useScriptData = () => {
  const [updateCounter, setUpdateCounter] = useState(0)
  
  useEffect(() => {
    const listener = () => setUpdateCounter(prev => prev + 1)
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])

  // Memoize the setter functions to prevent infinite re-renders
  const setArm1Script = useCallback((script: string) => {
    if (globalScriptData.arm1Script !== script) {
      globalScriptData.arm1Script = script
      globalScriptData.arm1CommandCount = script.split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).length
      notifyListeners()
    }
  }, [])

  const setArm2Script = useCallback((script: string) => {
    if (globalScriptData.arm2Script !== script) {
      globalScriptData.arm2Script = script
      globalScriptData.arm2CommandCount = script.split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).length
      notifyListeners()
    }
  }, [])

  const setArm1CompiledCommands = useCallback((commands: string[]) => {
    globalScriptData.arm1CompiledCommands = commands
    globalScriptData.arm1CommandCount = commands.length
    notifyListeners()
  }, [])

  const setArm2CompiledCommands = useCallback((commands: string[]) => {
    globalScriptData.arm2CompiledCommands = commands
    globalScriptData.arm2CommandCount = commands.length
    notifyListeners()
  }, [])

  const setArm1Mode = useCallback((mode: 'MSL' | 'RAW') => {
    if (globalScriptData.arm1Mode !== mode) {
      globalScriptData.arm1Mode = mode
      notifyListeners()
    }
  }, [])

  const setArm2Mode = useCallback((mode: 'MSL' | 'RAW') => {
    if (globalScriptData.arm2Mode !== mode) {
      globalScriptData.arm2Mode = mode
      notifyListeners()
    }
  }, [])

  const reset = useCallback(() => {
    globalScriptData = {
      arm1Script: '',
      arm2Script: '',
      arm1CompiledCommands: [],
      arm2CompiledCommands: [],
      arm1CommandCount: 0,
      arm2CommandCount: 0,
      arm1Mode: 'MSL',
      arm2Mode: 'MSL'
    }
    notifyListeners()
  }, [])

  // Memoize the returned object to prevent unnecessary re-renders
  return useMemo(() => ({
    ...globalScriptData,
    setArm1Script,
    setArm2Script,
    setArm1CompiledCommands,
    setArm2CompiledCommands,
    setArm1Mode,
    setArm2Mode,
    reset
  }), [updateCounter, setArm1Script, setArm2Script, setArm1CompiledCommands, setArm2CompiledCommands, setArm1Mode, setArm2Mode, reset])
}