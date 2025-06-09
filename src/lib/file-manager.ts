import fs from 'fs-extra'
import path from 'path'
import { config } from '../config'

export interface FileInfo {
  name: string
  size: number
  modified: Date
  type: 'script' | 'config' | 'log'
}

class FileManager {
  constructor() {
    this.ensureDirectories()
  }

  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(config.storage.scripts)
    await fs.ensureDir(config.storage.logs)
    await fs.ensureDir(config.storage.config)
  }

  async saveScript(content: string, filename: string = 'current_script.txt'): Promise<void> {
    const filepath = path.join(config.storage.scripts, filename)
    await fs.writeFile(filepath, content, 'utf8')
  }

  async loadScript(filename: string = 'current_script.txt'): Promise<string> {
    const filepath = path.join(config.storage.scripts, filename)
    
    if (await fs.pathExists(filepath)) {
      return await fs.readFile(filepath, 'utf8')
    }
    
    return ''
  }

  async saveConfig(key: string, data: any): Promise<void> {
    const filepath = path.join(config.storage.config, `${key}.json`)
    await fs.writeJson(filepath, data, { spaces: 2 })
  }

  async loadConfig<T>(key: string, defaultValue: T): Promise<T> {
    const filepath = path.join(config.storage.config, `${key}.json`)
    
    if (await fs.pathExists(filepath)) {
      return await fs.readJson(filepath)
    }
    
    return defaultValue
  }

  async appendLog(entry: any): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const logFile = path.join(config.storage.logs, `${today}.log`)
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    }
    
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n')
  }

  async getLogEntries(date?: string, limit: number = 1000): Promise<any[]> {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const logFile = path.join(config.storage.logs, `${targetDate}.log`)
    
    if (!(await fs.pathExists(logFile))) {
      return []
    }
    
    const content = await fs.readFile(logFile, 'utf8')
    const lines = content.trim().split('\n').filter(line => line.length > 0)
    
    const entries = lines
      .slice(-limit)
      .map(line => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(entry => entry !== null)
    
    return entries
  }

  async clearLogs(): Promise<void> {
    const files = await fs.readdir(config.storage.logs)
    
    for (const file of files) {
      if (file.endsWith('.log')) {
        await fs.remove(path.join(config.storage.logs, file))
      }
    }
  }

  async listScripts(): Promise<FileInfo[]> {
    const files = await fs.readdir(config.storage.scripts)
    const fileInfos: FileInfo[] = []
    
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const filepath = path.join(config.storage.scripts, file)
        const stats = await fs.stat(filepath)
        
        fileInfos.push({
          name: file,
          size: stats.size,
          modified: stats.mtime,
          type: 'script'
        })
      }
    }
    
    return fileInfos.sort((a, b) => b.modified.getTime() - a.modified.getTime())
  }

  async deleteScript(filename: string): Promise<void> {
    const filepath = path.join(config.storage.scripts, filename)
    await fs.remove(filepath)
  }
}

export const fileManager = new FileManager()