interface UploadProgress {
  uploaded: number
  total: number
  percentage: number
}

interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void
  timeout?: number
}

class CommandUploader {
  private baseUrl: string
  private uploadTimeoutMs: number

  constructor() {
    this.baseUrl = ''
    this.uploadTimeoutMs = 30000
  }

  async uploadCommands(commands: string[] | string, options: UploadOptions = {}): Promise<string> {
    try {
      const commandText = Array.isArray(commands) ? commands.join('\n') : commands
      const startTime = Date.now()

      // Simulate upload progress
      if (options.onProgress) {
        const totalBytes = commandText.length
        let uploadedBytes = 0
        
        const progressInterval = setInterval(() => {
          uploadedBytes = Math.min(uploadedBytes + Math.random() * 1000, totalBytes)
          options.onProgress!({
            uploaded: uploadedBytes,
            total: totalBytes,
            percentage: Math.round((uploadedBytes / totalBytes) * 100)
          })
          
          if (uploadedBytes >= totalBytes) {
            clearInterval(progressInterval)
          }
        }, 100)
      }

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      const endTime = Date.now()
      const uploadTime = endTime - startTime

      return `Upload completed in ${uploadTime}ms`
    } catch {
      throw new Error('Upload failed')
    }
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url
  }

  setTimeout(ms: number): void {
    this.uploadTimeoutMs = ms
  }
}

export default CommandUploader