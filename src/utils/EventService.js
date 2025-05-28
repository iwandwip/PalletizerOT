export class EventService {
  constructor() {
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  connect(onMessage, onError) {
    this.disconnect();
    
    this.eventSource = new EventSource('/events');
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error('Error parsing event data:', error);
      }
    };

    this.eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
      
      if (onError) {
        onError(err);
      }

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
          this.connect(onMessage, onError);
        }, this.reconnectDelay);
      }
    };

    this.eventSource.onopen = () => {
      console.log('EventSource connected');
      this.reconnectAttempts = 0;
    };

    return this.eventSource;
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  handleStatusUpdate(data, setSystemStatus) {
    if (data.type === 'status') {
      setSystemStatus(data.value);
    }
  }

  isConnected() {
    return this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  }

  getConnectionState() {
    if (!this.eventSource) return 'CLOSED';
    
    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING:
        return 'CONNECTING';
      case EventSource.OPEN:
        return 'OPEN';
      case EventSource.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }
}