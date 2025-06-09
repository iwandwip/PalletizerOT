import axios, { AxiosResponse, AxiosError } from 'axios'

export interface ESP32Status {
  state: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING' | 'ERROR'
  connected: boolean
  slaves: string[]
  lastUpdate: number
  freeHeap?: number
  uptime?: number
  connectionCount?: number
  requestCount?: number
  consecutiveErrors?: number
  lastResponse?: string
  lastResponseTime?: number
  lastErrorTime?: number
}

export interface ESP32Response {
  success: boolean
  message: string
  data?: any
  state?: string
  time?: number
}

export interface SyncStatus {
  syncSetPin: number
  syncWaitPin: number
  detectPin: number
  syncSetState: number
  syncWaitState: number
  detectState: number
  time: number
}

class ESP32Client {
  private baseUrl: string
  private timeout: number
  private retryAttempts: number
  private retryDelay: number
  private connectionState: boolean = false
  private lastSuccessfulRequest: number = 0
  private consecutiveFailures: number = 0
  private addressDetected: boolean = false

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || 'http://192.168.4.1'
    this.timeout = 5000
    this.retryAttempts = 3
    this.retryDelay = 1000
  }

  private detectESP32Address(): string {
    const commonAddresses = [
      'http://192.168.4.1',
      'http://192.168.1.100',
      'http://192.168.0.100',
      'http://esp32.local'
    ]
    
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedAddress = localStorage.getItem('esp32_address')
        if (savedAddress) {
          return savedAddress
        }
      } catch (error) {
        console.warn('Failed to access localStorage:', error)
      }
    }
    
    return commonAddresses[0]
  }

  private saveESP32Address(address: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('esp32_address', address)
      } catch (error) {
        console.warn('Failed to save to localStorage:', error)
      }
    }
  }

  private ensureAddressDetected(): void {
    if (!this.addressDetected) {
      this.baseUrl = this.detectESP32Address()
      this.addressDetected = true
    }
  }

  async sendCommand(command: string): Promise<ESP32Response> {
    this.ensureAddressDetected()
    
    const maxRetries = this.retryAttempts
    let lastError: any = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response: AxiosResponse = await axios.post(
          `${this.baseUrl}/execute`,
          { 
            command,
            timestamp: Date.now(),
            attempt
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
        
        this.markSuccess()
        
        return {
          success: true,
          message: response.data?.message || 'Command sent successfully',
          data: response.data,
          state: response.data?.state,
          time: response.data?.time
        }
      } catch (error: any) {
        lastError = error
        
        if (attempt < maxRetries) {
          console.warn(`ESP32 command attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`)
          await this.delay(this.retryDelay * attempt)
        }
      }
    }

    this.markFailure()
    return this.handleError(lastError, `Failed to send command: ${command}`)
  }

  async getStatus(): Promise<ESP32Status> {
    this.ensureAddressDetected()
    
    try {
      const response: AxiosResponse = await axios.get(
        `${this.baseUrl}/status`,
        { timeout: this.timeout }
      )
      
      this.markSuccess()
      
      return {
        state: response.data?.state || 'IDLE',
        connected: true,
        slaves: response.data?.slaves || [],
        lastUpdate: Date.now(),
        freeHeap: response.data?.freeHeap,
        uptime: response.data?.uptime,
        connectionCount: response.data?.connectionCount,
        requestCount: response.data?.requestCount,
        consecutiveErrors: response.data?.consecutiveErrors,
        lastResponse: response.data?.lastResponse,
        lastResponseTime: response.data?.lastResponseTime,
        lastErrorTime: response.data?.lastErrorTime
      }
    } catch (error) {
      this.markFailure()
      return {
        state: 'IDLE',
        connected: false,
        slaves: [],
        lastUpdate: Date.now()
      }
    }
  }

  async getSyncStatus(): Promise<SyncStatus | null> {
    this.ensureAddressDetected()
    
    try {
      const response: AxiosResponse = await axios.get(
        `${this.baseUrl}/sync_status`,
        { timeout: this.timeout }
      )
      
      this.markSuccess()
      return response.data
    } catch (error) {
      this.markFailure()
      return null
    }
  }

  async resetErrors(): Promise<ESP32Response> {
    this.ensureAddressDetected()
    
    try {
      const response: AxiosResponse = await axios.post(
        `${this.baseUrl}/reset_errors`,
        {},
        { timeout: this.timeout }
      )
      
      this.markSuccess()
      return {
        success: true,
        message: response.data?.message || 'Errors reset successfully',
        data: response.data
      }
    } catch (error: any) {
      this.markFailure()
      return this.handleError(error, 'Failed to reset errors')
    }
  }

  async checkConnection(): Promise<boolean> {
    this.ensureAddressDetected()
    
    try {
      const response: AxiosResponse = await axios.get(
        `${this.baseUrl}/ping`,
        { timeout: 3000 }
      )
      
      this.markSuccess()
      return response.data?.status === 'ok'
    } catch (error) {
      this.markFailure()
      return false
    }
  }

  async scanForESP32(): Promise<string[]> {
    const commonAddresses = [
      'http://192.168.4.1',
      'http://192.168.1.100',
      'http://192.168.0.100',
      'http://esp32.local',
      'http://192.168.1.101',
      'http://192.168.1.102'
    ]

    const foundAddresses: string[] = []

    const checkAddress = async (address: string): Promise<boolean> => {
      try {
        const response = await axios.get(`${address}/ping`, { timeout: 2000 })
        return response.data?.status === 'ok'
      } catch {
        return false
      }
    }

    const promises = commonAddresses.map(async (address) => {
      const isValid = await checkAddress(address)
      if (isValid) {
        foundAddresses.push(address)
      }
    })

    await Promise.all(promises)
    return foundAddresses
  }

  async autoDetectAndConnect(): Promise<boolean> {
    const addresses = await this.scanForESP32()
    
    if (addresses.length > 0) {
      this.baseUrl = addresses[0]
      this.saveESP32Address(this.baseUrl)
      this.addressDetected = true
      console.log(`ESP32 auto-detected at: ${this.baseUrl}`)
      return true
    }
    
    return false
  }

  setAddress(address: string): void {
    this.baseUrl = address
    this.saveESP32Address(address)
    this.consecutiveFailures = 0
    this.addressDetected = true
  }

  getAddress(): string {
    this.ensureAddressDetected()
    return this.baseUrl
  }

  isConnected(): boolean {
    return this.connectionState
  }

  getConnectionStats(): { 
    lastSuccess: number, 
    failures: number, 
    connected: boolean 
  } {
    return {
      lastSuccess: this.lastSuccessfulRequest,
      failures: this.consecutiveFailures,
      connected: this.connectionState
    }
  }

  private markSuccess(): void {
    this.connectionState = true
    this.lastSuccessfulRequest = Date.now()
    this.consecutiveFailures = 0
  }

  private markFailure(): void {
    this.consecutiveFailures++
    
    if (this.consecutiveFailures >= 3) {
      this.connectionState = false
    }
  }

  private handleError(error: any, defaultMessage: string): ESP32Response {
    let message = defaultMessage

    if (error?.response?.data?.message) {
      message = error.response.data.message
    } else if (error?.message) {
      if (error.code === 'ECONNREFUSED') {
        message = 'ESP32 connection refused - Check device power and network'
      } else if (error.code === 'TIMEOUT' || error.code === 'ECONNABORTED') {
        message = 'ESP32 request timeout - Device may be busy'
      } else if (error.code === 'NETWORK_ERROR') {
        message = 'Network error - Check WiFi connection'
      } else {
        message = `ESP32 error: ${error.message}`
      }
    }

    return {
      success: false,
      message,
      data: null
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async sendBulkCommands(commands: string[]): Promise<ESP32Response[]> {
    const results: ESP32Response[] = []
    
    for (const command of commands) {
      const result = await this.sendCommand(command)
      results.push(result)
      
      if (!result.success) {
        break
      }
      
      await this.delay(100)
    }
    
    return results
  }

  async sendCommandWithProgress(
    command: string, 
    onProgress?: (progress: number) => void
  ): Promise<ESP32Response> {
    onProgress?.(0)
    
    const result = await this.sendCommand(command)
    
    onProgress?.(100)
    
    return result
  }
}

export const esp32Client = new ESP32Client()