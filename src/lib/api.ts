import { StatusResponse, ExecutionStatus } from './types'

interface MoveCommand {
  X?: number;
  Y?: number;
  Z?: number;
  T?: number;
  G?: number;
  speed?: number;
  accel?: number;
}

interface ServerResponse {
  success: boolean;
  error?: string;
  data?: any;
}

class PalletizerAPI {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.eventHandlers.set('status', []);
    this.eventHandlers.set('position', []);
    this.eventHandlers.set('error', []);
    this.eventHandlers.set('esp32_connected', []);
    this.eventHandlers.set('esp32_disconnected', []);
  }

  // WebSocket connection
  connectWebSocket(): void {
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws';
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('Connected to server WebSocket');
      this.ws?.send(JSON.stringify({ type: 'subscribe' }));
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket connection closed, attempting to reconnect...');
      setTimeout(() => this.connectWebSocket(), 5000);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleWebSocketMessage(data: any) {
    const handlers = this.eventHandlers.get(data.type);
    if (handlers) {
      handlers.forEach(handler => handler(data.data || data));
    }
  }

  // Event subscription
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Script execution
  async parseScript(script: string): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/script/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ script }),
    });
    
    return response.json();
  }

  async executeScript(script: string): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/script/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ script }),
    });
    
    return response.json();
  }

  // Control commands
  async play(): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/control/play`, {
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

  async stop(): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/control/stop`, {
      method: 'POST',
    });
    
    return response.json();
  }

  async home(): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/control/home`, {
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

  // Movement commands
  async move(axes: MoveCommand): Promise<ServerResponse> {
    const { speed, accel, ...axesOnly } = axes;
    
    const response = await fetch(`${this.baseUrl}/api/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        axes: axesOnly,
        speed,
        accel
      }),
    });
    
    return response.json();
  }

  async groupMove(axes: MoveCommand): Promise<ServerResponse> {
    const { speed, accel, ...axesOnly } = axes;
    
    const response = await fetch(`${this.baseUrl}/api/group-move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        axes: axesOnly,
        speed,
        accel
      }),
    });
    
    return response.json();
  }

  // Speed control
  async setSpeed(axes: Partial<{ X: number; Y: number; Z: number; T: number; G: number }>): Promise<ServerResponse> {
    const response = await fetch(`${this.baseUrl}/api/speed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ axes }),
    });
    
    return response.json();
  }

  // Status
  async getStatus(): Promise<{
    esp32Connected: boolean;
    queueLength: number;
    currentPosition: { X: number; Y: number; Z: number; T: number; G: number };
    systemStatus: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/status`);
    return response.json();
  }

  // Utility methods for backward compatibility with old API
  async sendCommand(command: string): Promise<string> {
    // Parse old-style commands and convert to new API calls
    const trimmed = command.trim();
    
    if (trimmed === 'PLAY') {
      await this.play();
      return 'OK';
    } else if (trimmed === 'PAUSE') {
      await this.pause();
      return 'OK';
    } else if (trimmed === 'STOP') {
      await this.stop();
      return 'OK';
    } else if (trimmed === 'HOME') {
      await this.home();
      return 'OK';
    } else if (trimmed === 'ZERO') {
      await this.zero();
      return 'OK';
    }
    
    // Try to parse as movement command
    const moveMatch = trimmed.match(/^([XYZTG])(-?\d+)(?:\s+F(\d+))?(?:\s+A(\d+))?$/);
    if (moveMatch) {
      const [, axis, pos, speed, accel] = moveMatch;
      const moveCmd: MoveCommand = {
        [axis]: parseInt(pos)
      };
      if (speed) moveCmd.speed = parseInt(speed);
      if (accel) moveCmd.accel = parseInt(accel);
      
      await this.move(moveCmd);
      return 'OK';
    }
    
    throw new Error(`Unsupported command: ${command}`);
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`, {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Event source for real-time updates (deprecated - use WebSocket)
  createEventSource(): EventSource {
    console.warn('createEventSource is deprecated, use WebSocket connection instead');
    return new EventSource(`${this.baseUrl}/events`);
  }

  // Debug methods
  async getExecutionStatus(): Promise<ExecutionStatus> {
    const status = await this.getStatus();
    return {
      state: status.systemStatus as any,
      currentCommand: null,
      commandsInBuffer: status.queueLength,
      position: status.currentPosition
    };
  }

  // File operations (these might be moved to server-side storage)
  async uploadFile(file: File): Promise<string> {
    const text = await file.text();
    const result = await this.executeScript(text);
    
    if (result.success) {
      return 'Script uploaded and parsed successfully';
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  }

  async saveCommands(commands: string): Promise<string> {
    // For now, just parse the script to validate it
    const result = await this.parseScript(commands);
    
    if (result.success) {
      // In a real implementation, you might save to local storage or server
      localStorage.setItem('palletizer_script', commands);
      return 'Commands saved locally';
    } else {
      throw new Error(result.error || 'Save failed');
    }
  }

  async loadCommands(): Promise<string> {
    return localStorage.getItem('palletizer_script') || '';
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const api = new PalletizerAPI();

// Auto-connect WebSocket
api.connectWebSocket();