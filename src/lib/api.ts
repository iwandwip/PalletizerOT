const BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}`
  : 'http://192.168.4.1'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

interface SystemStatus {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING' | 'ERROR'
  uptime: number
  timestamp: number
}

interface TimeoutConfig {
  maxWaitTime: number
  strategy: number
  maxTimeoutWarning: number
  autoRetryCount: number
  saveToFile: boolean
}

interface TimeoutStats {
  totalTimeouts: number
  successfulWaits: number
  successRate: number
  averageWaitTime: number
  lastTimeoutTime: number
}

interface DebugMessage {
  timestamp: number
  level: string
  source: string
  message: string
}

interface DebugBuffer {
  messages: DebugMessage[]
  total: number
  start: number
  count: number
}

class PalletizerAPI {
  private async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      ...options
    }

    try {
      const response = await fetch(url, defaultOptions)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return await response.json()
      }
      
      return await response.text() as T
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  async sendCommand(command: string): Promise<string> {
    const body = new URLSearchParams({ cmd: command }).toString()
    return this.request<string>('/command', {
      method: 'POST',
      body
    })
  }

  async getStatus(): Promise<SystemStatus> {
    const response = await this.request<{ status: string }>('/status')
    return {
      status: response.status as SystemStatus['status'],
      uptime: Date.now(),
      timestamp: Date.now()
    }
  }

  async saveCommands(text: string): Promise<string> {
    const body = new URLSearchParams({ text }).toString()
    return this.request<string>('/write', {
      method: 'POST',
      body
    })
  }

  async loadCommands(): Promise<string> {
    return this.request<string>('/get_commands')
  }

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    
    return this.request<string>('/upload', {
      method: 'POST',
      headers: {},
      body: formData
    })
  }

  async downloadCommands(): Promise<void> {
    const url = `${BASE_URL}/download_commands`
    const link = document.createElement('a')
    link.href = url
    link.download = `palletizer_commands_${new Date().toISOString().split('T')[0]}.txt`
    link.click()
  }

  async getTimeoutConfig(): Promise<TimeoutConfig> {
    return this.request<TimeoutConfig>('/timeout_config')
  }

  async saveTimeoutConfig(config: TimeoutConfig): Promise<string> {
    const body = new URLSearchParams({
      maxWaitTime: config.maxWaitTime.toString(),
      strategy: config.strategy.toString(),
      maxTimeoutWarning: config.maxTimeoutWarning.toString(),
      autoRetryCount: config.autoRetryCount.toString(),
      saveToFile: config.saveToFile.toString()
    }).toString()

    return this.request<string>('/timeout_config', {
      method: 'POST',
      body
    })
  }

  async getTimeoutStats(): Promise<TimeoutStats> {
    return this.request<TimeoutStats>('/timeout_stats')
  }

  async clearTimeoutStats(): Promise<string> {
    return this.request<string>('/clear_timeout_stats', {
      method: 'POST'
    })
  }

  async getDebugBuffer(start: number = 0): Promise<DebugBuffer> {
    return this.request<DebugBuffer>(`/debug/buffer?start=${start}`)
  }

  async clearDebugBuffer(): Promise<string> {
    return this.request<string>('/debug/clear', {
      method: 'POST'
    })
  }

  async toggleDebugCapture(): Promise<{ enabled: boolean }> {
    return this.request<{ enabled: boolean }>('/debug/toggle', {
      method: 'POST'
    })
  }

  createEventSource(): EventSource {
    return new EventSource(`${BASE_URL}/events`)
  }

  createDebugEventSource(): EventSource {
    return new EventSource(`${BASE_URL}/debug`)
  }

  async getWifiInfo(): Promise<{
    mode: string
    ssid: string
    ip: string
    connected?: boolean
  }> {
    return this.request('/wifi_info')
  }
}

export const api = new PalletizerAPI()
export type { SystemStatus, TimeoutConfig, TimeoutStats, DebugMessage, DebugBuffer }