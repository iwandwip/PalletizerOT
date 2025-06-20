interface ServerResponse {
  success: boolean;
  error?: string;
  data?: unknown;
  message?: string;
  commandCount?: number;
  scriptId?: string;
  compiledData?: unknown;
}

interface SystemStatus {
  esp32Connected: boolean;
  hasScript: boolean;
  isRunning: boolean;
  isPaused: boolean;
  currentCommandIndex: number;
  totalCommands: number;
  scriptId: string | null;
  lastPoll: number;
  connectedAxes: number;
  efficiency: number;
}

class PalletizerAPI {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3006') {
    this.baseUrl = baseUrl;
  }

  async saveScript(script: string, format: 'hybrid' | 'msl' = 'msl'): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/script/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ script, format }),
    });
    
    return response.json();
  }

  async start(): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/control/start`, {
      method: 'POST',
    });
    
    return response.json();
  }

  async stop(): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/control/stop`, {
      method: 'POST',
    });
    
    return response.json();
  }

  async pause(): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/control/pause`, {
      method: 'POST',
    });
    
    return response.json();
  }

  async resume(): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/control/resume`, {
      method: 'POST',
    });
    
    return response.json();
  }

  async zero(): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/control/zero`, {
      method: 'POST',
    });
    
    return response.json();
  }

  async getStatus(): Promise<SystemStatus> {
    const response = await fetch(`${this.baseUrl}/api/status`);
    return response.json();
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async saveCommands(commands: string): Promise<string> {
    const result = await this.saveScript(commands);
    
    if (result.success) {
      localStorage.setItem('palletizer_script', commands);
      return result.message || 'Script compiled and saved';
    } else {
      throw new Error(result.error || 'Save failed');
    }
  }

  async loadCommands(): Promise<string> {
    return localStorage.getItem('palletizer_script') || '';
  }

  async executeScript(script: string): Promise<ServerResponse> {
    return this.saveScript(script);
  }

  async uploadFile(file: File): Promise<string> {
    const text = await file.text();
    const result = await this.saveScript(text);
    
    if (result.success) {
      return 'Script uploaded and compiled successfully';
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  }
}

export const api = new PalletizerAPI();