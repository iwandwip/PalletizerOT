import axios, { AxiosResponse } from 'axios'
import { config, ESP32_ENDPOINTS } from '../config'

export interface ESP32Status {
  state: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING'
  connected: boolean
  slaves: string[]
  lastUpdate: number
}

export interface ESP32Response {
  success: boolean
  message: string
  data?: any
}

class ESP32Client {
  private client = axios.create({
    timeout: config.esp32.timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  async sendCommand(command: string): Promise<ESP32Response> {
    try {
      const response: AxiosResponse = await this.client.post(ESP32_ENDPOINTS.execute, {
        command,
        timestamp: Date.now()
      })
      
      return {
        success: true,
        message: response.data?.message || 'Command sent successfully',
        data: response.data
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to send command',
        data: null
      }
    }
  }

  async getStatus(): Promise<ESP32Status> {
    try {
      const response: AxiosResponse = await this.client.get(ESP32_ENDPOINTS.status)
      
      return {
        state: response.data?.state || 'IDLE',
        connected: true,
        slaves: response.data?.slaves || [],
        lastUpdate: Date.now()
      }
    } catch (error) {
      return {
        state: 'IDLE',
        connected: false,
        slaves: [],
        lastUpdate: Date.now()
      }
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.client.get(ESP32_ENDPOINTS.heartbeat, { timeout: 3000 })
      return true
    } catch (error) {
      return false
    }
  }

  async sendSequentialCommands(commands: string[]): Promise<ESP32Response[]> {
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const esp32Client = new ESP32Client()