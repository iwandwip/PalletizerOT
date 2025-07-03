import { useState, useEffect } from 'react'

interface ScriptData {
  arm1Script: string
  arm2Script: string
  arm1CompiledCommands: string[]
  arm2CompiledCommands: string[]
  arm1CommandCount: number
  arm2CommandCount: number
}

// Simple global script state management
let globalScriptData: ScriptData = {
  arm1Script: '',
  arm2Script: '',
  arm1CompiledCommands: [],
  arm2CompiledCommands: [],
  arm1CommandCount: 0,
  arm2CommandCount: 0
}

const listeners = new Set<() => void>()

const notifyListeners = () => {
  listeners.forEach(listener => listener())
}

export const useScriptData = () => {
  const [, forceUpdate] = useState({})
  
  useEffect(() => {
    const listener = () => forceUpdate({})
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])

  const setArm1Script = (script: string) => {
    globalScriptData.arm1Script = script
    globalScriptData.arm1CommandCount = script.split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).length
    notifyListeners()
  }

  const setArm2Script = (script: string) => {
    globalScriptData.arm2Script = script
    globalScriptData.arm2CommandCount = script.split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).length
    notifyListeners()
  }

  const setArm1CompiledCommands = (commands: string[]) => {
    globalScriptData.arm1CompiledCommands = commands
    globalScriptData.arm1CommandCount = commands.length
    notifyListeners()
  }

  const setArm2CompiledCommands = (commands: string[]) => {
    globalScriptData.arm2CompiledCommands = commands
    globalScriptData.arm2CommandCount = commands.length
    notifyListeners()
  }

  const reset = () => {
    globalScriptData = {
      arm1Script: '',
      arm2Script: '',
      arm1CompiledCommands: [],
      arm2CompiledCommands: [],
      arm1CommandCount: 0,
      arm2CommandCount: 0
    }
    notifyListeners()
  }

  return {
    ...globalScriptData,
    setArm1Script,
    setArm2Script,
    setArm1CompiledCommands,
    setArm2CompiledCommands,
    reset
  }
}