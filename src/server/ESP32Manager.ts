import { WebSocketServer, WebSocket } from 'ws';

interface ESP32Command {
  cmd: string;
  data?: any;
}

interface Position {
  X: number;
  Y: number;
  Z: number;
  T: number;
  G: number;
}

export class ESP32Manager {
  private esp32Socket: WebSocket | null = null;
  private webClients: Set<WebSocket> = new Set();
  private currentPosition: Position = { X: 0, Y: 0, Z: 0, T: 0, G: 0 };
  private systemStatus: string = 'DISCONNECTED';
  private commandQueue: ESP32Command[] = [];
  private isExecuting: boolean = false;

  constructor(private wss: WebSocketServer) {
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      
      console.log('New WebSocket connection:', {
        userAgent: req.headers['user-agent'],
        clientParam: url.searchParams.get('client'),
        url: req.url
      });
      
      // Check if this is ESP32 connection (could add authentication here)
      if (req.headers['user-agent']?.includes('ESP32') || 
          url.searchParams.get('client') === 'esp32') {
        this.handleESP32Connection(ws);
      } else {
        this.handleWebClientConnection(ws);
      }
    });
  }

  private handleESP32Connection(ws: WebSocket) {
    console.log('ESP32 connected');
    this.esp32Socket = ws;
    this.systemStatus = 'CONNECTED';
    this.broadcastToClients({ type: 'esp32_connected' });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleESP32Message(data);
      } catch (error) {
        console.error('ESP32 message parse error:', error);
      }
    });

    ws.on('close', () => {
      console.log('ESP32 disconnected');
      this.esp32Socket = null;
      this.systemStatus = 'DISCONNECTED';
      this.broadcastToClients({ type: 'esp32_disconnected' });
    });

    ws.on('error', (error) => {
      console.error('ESP32 WebSocket error:', error);
    });

    // Send any queued commands
    this.processCommandQueue();
  }

  private handleWebClientConnection(ws: WebSocket) {
    console.log('Web client connected');
    this.webClients.add(ws);
    
    // Send current status
    ws.send(JSON.stringify({
      type: 'status',
      data: {
        esp32Connected: this.isConnected(),
        queueLength: this.commandQueue.length,
        currentPosition: this.currentPosition,
        systemStatus: this.systemStatus
      }
    }));

    ws.on('close', () => {
      this.webClients.delete(ws);
      console.log('Web client disconnected');
    });
  }

  private handleESP32Message(data: any) {
    switch (data.type) {
      case 'status':
        this.systemStatus = data.status;
        this.broadcastToClients({
          type: 'status_update',
          data: {
            status: data.status,
            queue: data.queue
          }
        });
        break;

      case 'position':
        this.currentPosition = data.position;
        this.broadcastToClients({
          type: 'position_update',
          data: { position: this.currentPosition }
        });
        break;

      case 'error':
        console.error('ESP32 Error:', data.error);
        this.broadcastToClients({
          type: 'error',
          data: { error: data.error }
        });
        break;

      case 'heartbeat':
        // ESP32 is alive, could implement timeout detection
        break;

      default:
        console.log('Unknown ESP32 message type:', data.type);
    }

    // If ESP32 is idle and we have queued commands, send next one
    if (data.status === 'IDLE' && this.commandQueue.length > 0) {
      this.processCommandQueue();
    }
  }

  private broadcastToClients(message: any) {
    const messageStr = JSON.stringify(message);
    this.webClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  private processCommandQueue() {
    if (!this.esp32Socket || this.isExecuting || this.commandQueue.length === 0) {
      return;
    }

    const command = this.commandQueue.shift();
    if (command) {
      this.sendCommandToESP32(command);
      this.isExecuting = true;
    }
  }

  private sendCommandToESP32(command: ESP32Command) {
    if (!this.esp32Socket || this.esp32Socket.readyState !== WebSocket.OPEN) {
      console.error('ESP32 not connected, queuing command');
      this.commandQueue.unshift(command); // Put it back at the front
      return false;
    }

    try {
      this.esp32Socket.send(JSON.stringify(command));
      console.log('Sent to ESP32:', command);
      return true;
    } catch (error) {
      console.error('Failed to send to ESP32:', error);
      return false;
    }
  }

  // Public methods
  public sendCommand(command: ESP32Command): boolean {
    if (command.cmd === 'STOP') {
      // Emergency stop - send immediately and clear queue
      this.commandQueue = [];
      this.isExecuting = false;
      return this.sendCommandToESP32(command);
    }

    // Queue non-urgent commands
    this.commandQueue.push(command);
    this.processCommandQueue();
    return true;
  }

  public executeCommands(commands: ESP32Command[]): void {
    // Add multiple commands to queue
    this.commandQueue.push(...commands);
    this.processCommandQueue();
  }

  public isConnected(): boolean {
    return this.esp32Socket !== null && 
           this.esp32Socket.readyState === WebSocket.OPEN;
  }

  public getCurrentPosition(): Position {
    return { ...this.currentPosition };
  }

  public getStatus(): string {
    return this.systemStatus;
  }

  public getQueueLength(): number {
    return this.commandQueue.length;
  }

  public clearQueue(): void {
    this.commandQueue = [];
    this.isExecuting = false;
  }

  public addSubscriber(ws: WebSocket): void {
    this.webClients.add(ws);
  }

  public removeSubscriber(ws: WebSocket): void {
    this.webClients.delete(ws);
  }

  // Emergency stop
  public emergencyStop(): void {
    this.sendCommand({ cmd: 'STOP' });
  }

  // Request status update from ESP32
  public requestStatus(): void {
    if (this.isConnected()) {
      this.sendCommandToESP32({ cmd: 'STATUS' });
    }
  }
}