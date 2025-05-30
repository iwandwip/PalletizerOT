import { TimeoutConfig, TimeoutStats, StatusResponse } from './types'

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

  downloadCommands(): void {
    window.location.href = '/download_commands'
  }

  createEventSource(): EventSource {
    return new EventSource('/events')
  }
}

export const api = new PalletizerAPI()