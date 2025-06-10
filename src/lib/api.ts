import { TimeoutConfig, TimeoutStats, StatusResponse, ExecutionStatus } from './types'

class PalletizerAPI {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async sendCommand(command: string): Promise<string> {
    const response = await fetch('/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `cmd=${encodeURIComponent(command)}`,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.text()
  }

  async getStatus(): Promise<StatusResponse> {
    const response = await fetch('/status')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  async uploadCommands(commands: string): Promise<any> {
    const response = await fetch('/upload_commands', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: commands,
    })
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  async getExecutionStatus(): Promise<ExecutionStatus> {
    const response = await fetch('/execution_status')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  async clearCommands(): Promise<any> {
    const response = await fetch('/clear_commands', {
      method: 'POST',
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  async getUploadStatus(): Promise<any> {
    const response = await fetch('/upload_status')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch('/ping', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  async saveCommands(commands: string): Promise<string> {
    const response = await fetch('/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `text=${encodeURIComponent(commands)}`,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.text()
  }

  async loadCommands(): Promise<string> {
    const response = await fetch('/get_commands')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.text()
  }

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.text()
  }

  async getTimeoutConfig(): Promise<TimeoutConfig> {
    const response = await fetch('/timeout_config')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  async saveTimeoutConfig(config: TimeoutConfig): Promise<string> {
    const formData = new URLSearchParams()
    formData.append('maxWaitTime', config.maxWaitTime.toString())
    formData.append('strategy', config.strategy.toString())
    formData.append('maxTimeoutWarning', config.maxTimeoutWarning.toString())
    formData.append('autoRetryCount', config.autoRetryCount.toString())
    formData.append('saveToFile', config.saveToFile.toString())

    const response = await fetch('/timeout_config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.text()
  }

  async getTimeoutStats(): Promise<TimeoutStats> {
    const response = await fetch('/timeout_stats')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  async clearTimeoutStats(): Promise<string> {
    const response = await fetch('/clear_timeout_stats', {
      method: 'POST',
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.text()
  }

  async getDebugBuffer(startIndex: number = 0): Promise<any> {
    const response = await fetch(`/debug/buffer?start=${startIndex}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  async clearDebugBuffer(): Promise<string> {
    const response = await fetch('/debug/clear', {
      method: 'POST',
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.text()
  }

  async toggleDebugCapture(): Promise<any> {
    const response = await fetch('/debug/toggle', {
      method: 'POST',
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

  downloadCommands(): void {
    window.location.href = '/download_commands'
  }

  createEventSource(): EventSource {
    return new EventSource('/events')
  }

  createDebugEventSource(): EventSource {
    return new EventSource('/debug')
  }
}

export const api = new PalletizerAPI()