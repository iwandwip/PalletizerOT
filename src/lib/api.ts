import { TimeoutConfig, TimeoutStats, StatusResponse } from './types'

class PalletizerAPI {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async sendCommand(command: string): Promise<string> {
    const response = await fetch('/api/system/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.text()
  }

  async playSystem(): Promise<string> {
    const response = await fetch('/api/system/play', { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async pauseSystem(): Promise<string> {
    const response = await fetch('/api/system/pause', { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async stopSystem(): Promise<string> {
    const response = await fetch('/api/system/stop', { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async zeroSystem(): Promise<string> {
    const response = await fetch('/api/system/zero', { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async getStatus(): Promise<StatusResponse> {
    const response = await fetch('/api/system/status')
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  async saveCommands(commands: string): Promise<string> {
    const response = await fetch('/api/scripts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async loadCommands(): Promise<string> {
    const response = await fetch('/api/scripts/load')
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/scripts/upload', {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async setGlobalSpeed(speed: number): Promise<string> {
    const response = await fetch('/api/speed/global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed }),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async setAxisSpeed(axisId: string, speed: number): Promise<string> {
    const response = await fetch('/api/speed/axis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ axisId, speed }),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async getTimeoutConfig(): Promise<TimeoutConfig> {
    const response = await fetch('/api/system/timeout-config')
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  async saveTimeoutConfig(config: TimeoutConfig): Promise<string> {
    const response = await fetch('/api/system/timeout-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async getTimeoutStats(): Promise<TimeoutStats> {
    const response = await fetch('/api/system/timeout-stats')
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  async clearTimeoutStats(): Promise<string> {
    const response = await fetch('/api/system/timeout-stats', { method: 'DELETE' })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async getDebugLogs(): Promise<any> {
    const response = await fetch('/api/debug/logs')
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  async clearDebugLogs(): Promise<string> {
    const response = await fetch('/api/debug/clear', { method: 'POST' })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.text()
  }

  async getESP32Status(): Promise<any> {
    const response = await fetch('/api/esp32/status')
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  downloadCommands(): void {
    window.location.href = '/api/scripts/download'
  }

  createEventSource(): EventSource {
    return new EventSource('/api/system/events')
  }

  createDebugEventSource(): EventSource {
    return new EventSource('/api/debug/stream')
  }
}

export const api = new PalletizerAPI()