class CommandUploader {
  constructor() {
    this.baseUrl = ''
    this.uploadTimeoutMs = 30000
  }

  async uploadCommands(commands, onProgress = null) {
    try {
      const commandText = Array.isArray(commands) ? commands.join('\n') : commands
      const startTime = Date.now()

      if (onProgress) {
        onProgress({ stage: 'uploading', progress: 0 })
      }

      const response = await fetch('/upload_commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: commandText,
        signal: AbortSignal.timeout(this.uploadTimeoutMs)
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const uploadTime = Date.now() - startTime

      if (onProgress) {
        onProgress({ stage: 'completed', progress: 100 })
      }

      return {
        success: true,
        data: result,
        uploadTime,
        size: commandText.length
      }

    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new Error('Upload timeout - check ESP32 connection')
      }
      throw new Error(`Upload failed: ${error.message}`)
    }
  }

  async uploadCompiledScript(compilationResult, onProgress = null) {
    if (!compilationResult.success) {
      throw new Error(`Cannot upload: ${compilationResult.errors.join(', ')}`)
    }

    if (compilationResult.commands.length === 0) {
      throw new Error('No commands to upload')
    }

    return await this.uploadCommands(compilationResult.commands, onProgress)
  }

  async getUploadStatus() {
    try {
      const response = await fetch('/upload_status')
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      throw new Error(`Status check failed: ${error.message}`)
    }
  }

  async clearCommands() {
    try {
      const response = await fetch('/clear_commands', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error(`Clear failed: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      throw new Error(`Clear failed: ${error.message}`)
    }
  }

  async validateConnection() {
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

  formatUploadSummary(uploadResult, compilationResult) {
    const summary = {
      success: uploadResult.success,
      totalCommands: compilationResult.totalCommands,
      functions: compilationResult.functions.length,
      uploadTime: uploadResult.uploadTime,
      size: this.formatBytes(uploadResult.size),
      timestamp: new Date().toISOString()
    }

    if (compilationResult.functions.length > 0) {
      summary.functionList = compilationResult.functions
    }

    return summary
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  estimateExecutionTime(commands) {
    let estimatedMs = 0
    
    for (const cmd of commands) {
      if (cmd.startsWith('BROADCAST')) {
        estimatedMs += 2000
      } else if (cmd === 'DETECT') {
        estimatedMs += 3000
      } else if (cmd === 'WAIT') {
        estimatedMs += 1000
      } else if (cmd.includes(';1;')) {
        estimatedMs += 1500
      } else {
        estimatedMs += 500
      }
    }
    
    return estimatedMs
  }

  formatEstimatedTime(ms) {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }
}

export default CommandUploader