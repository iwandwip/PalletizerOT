interface QueuedCommand {
  id: string;
  command: any;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export class CommandQueue {
  private queue: QueuedCommand[] = [];
  private executing: boolean = false;
  private currentCommand: QueuedCommand | null = null;

  public enqueue(commands: any[], priority: 'low' | 'normal' | 'high' | 'emergency' = 'normal'): void {
    const timestamp = Date.now();
    
    for (const command of commands) {
      const queuedCommand: QueuedCommand = {
        id: this.generateId(),
        command,
        priority,
        timestamp,
        retryCount: 0,
        maxRetries: priority === 'emergency' ? 0 : 3
      };
      
      this.insertByPriority(queuedCommand);
    }
  }

  public enqueueOne(command: any, priority: 'low' | 'normal' | 'high' | 'emergency' = 'normal'): void {
    this.enqueue([command], priority);
  }

  public dequeue(): any | null {
    if (this.queue.length === 0) return null;
    
    const command = this.queue.shift()!;
    this.currentCommand = command;
    return command.command;
  }

  public peek(): any | null {
    if (this.queue.length === 0) return null;
    return this.queue[0].command;
  }

  public length(): number {
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
    this.currentCommand = null;
    this.executing = false;
  }

  public clearByPriority(priority: 'low' | 'normal' | 'high' | 'emergency'): void {
    this.queue = this.queue.filter(cmd => cmd.priority !== priority);
  }

  public isExecuting(): boolean {
    return this.executing;
  }

  public setExecuting(executing: boolean): void {
    this.executing = executing;
  }

  public getCurrentCommand(): QueuedCommand | null {
    return this.currentCommand;
  }

  public markCurrentComplete(): void {
    this.currentCommand = null;
    this.executing = false;
  }

  public markCurrentFailed(): void {
    if (!this.currentCommand) return;
    
    this.currentCommand.retryCount++;
    
    if (this.currentCommand.retryCount <= this.currentCommand.maxRetries) {
      // Retry the command
      this.insertByPriority(this.currentCommand);
    } else {
      console.error(`Command failed after ${this.currentCommand.maxRetries} retries:`, this.currentCommand.command);
    }
    
    this.currentCommand = null;
    this.executing = false;
  }

  public getQueueStatus(): {
    length: number;
    executing: boolean;
    currentCommand: any;
    priorityBreakdown: Record<string, number>;
  } {
    const priorityBreakdown = {
      emergency: 0,
      high: 0,
      normal: 0,
      low: 0
    };
    
    for (const cmd of this.queue) {
      priorityBreakdown[cmd.priority]++;
    }
    
    return {
      length: this.queue.length,
      executing: this.executing,
      currentCommand: this.currentCommand?.command || null,
      priorityBreakdown
    };
  }

  public insertEmergencyStop(): void {
    // Clear all non-emergency commands and add emergency stop
    this.queue = this.queue.filter(cmd => cmd.priority === 'emergency');
    
    this.enqueueOne({
      cmd: 'STOP'
    }, 'emergency');
  }

  public hasEmergencyCommands(): boolean {
    return this.queue.some(cmd => cmd.priority === 'emergency');
  }

  public getOldestCommand(): QueuedCommand | null {
    if (this.queue.length === 0) return null;
    
    return this.queue.reduce((oldest, current) => 
      current.timestamp < oldest.timestamp ? current : oldest
    );
  }

  public removeCommand(id: string): boolean {
    const index = this.queue.findIndex(cmd => cmd.id === id);
    if (index === -1) return false;
    
    this.queue.splice(index, 1);
    return true;
  }

  public getCommandById(id: string): QueuedCommand | null {
    return this.queue.find(cmd => cmd.id === id) || null;
  }

  public getQueueSummary(): string {
    const status = this.getQueueStatus();
    const breakdown = Object.entries(status.priorityBreakdown)
      .filter(([_, count]) => count > 0)
      .map(([priority, count]) => `${priority}: ${count}`)
      .join(', ');
    
    return `Queue: ${status.length} commands (${breakdown})${status.executing ? ', executing' : ''}`;
  }

  private insertByPriority(command: QueuedCommand): void {
    const priorityOrder = { emergency: 0, high: 1, normal: 2, low: 3 };
    
    let insertIndex = 0;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[command.priority] <= priorityOrder[this.queue[i].priority]) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    
    this.queue.splice(insertIndex, 0, command);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Batch processing methods
  public getBatch(maxSize: number = 10): any[] {
    const batch: any[] = [];
    
    while (batch.length < maxSize && this.queue.length > 0) {
      const command = this.dequeue();
      if (command) {
        batch.push(command);
      }
    }
    
    return batch;
  }

  public hasPendingCommands(): boolean {
    return this.queue.length > 0;
  }

  public getEstimatedProcessingTime(): number {
    // Rough estimate: 100ms per command
    return this.queue.length * 100;
  }

  // Queue optimization
  public optimize(): void {
    // Remove duplicate commands
    this.removeDuplicates();
    
    // Merge compatible commands
    this.mergeCompatibleCommands();
    
    // Sort by execution efficiency
    this.sortByEfficiency();
  }

  private removeDuplicates(): void {
    const seen = new Set<string>();
    this.queue = this.queue.filter(cmd => {
      const key = JSON.stringify(cmd.command);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private mergeCompatibleCommands(): void {
    // Look for sequential moves that can be merged into group moves
    for (let i = 0; i < this.queue.length - 1; i++) {
      const current = this.queue[i];
      const next = this.queue[i + 1];
      
      if (this.canMergeCommands(current, next)) {
        const merged = this.mergeCommands(current, next);
        this.queue.splice(i, 2, merged);
        i--; // Check the merged command with the next one
      }
    }
  }

  private canMergeCommands(cmd1: QueuedCommand, cmd2: QueuedCommand): boolean {
    // Only merge if same priority and both are move commands
    if (cmd1.priority !== cmd2.priority) return false;
    
    const c1 = cmd1.command;
    const c2 = cmd2.command;
    
    return c1.cmd === 'MOVE' && c2.cmd === 'MOVE' && 
           !c1.data.speed && !c2.data.speed && // No custom speeds
           !c1.data.accel && !c2.data.accel;   // No custom accelerations
  }

  private mergeCommands(cmd1: QueuedCommand, cmd2: QueuedCommand): QueuedCommand {
    return {
      id: this.generateId(),
      command: {
        cmd: 'GROUP',
        data: {
          ...cmd1.command.data,
          ...cmd2.command.data
        }
      },
      priority: cmd1.priority,
      timestamp: Math.min(cmd1.timestamp, cmd2.timestamp),
      retryCount: 0,
      maxRetries: Math.max(cmd1.maxRetries, cmd2.maxRetries)
    };
  }

  private sortByEfficiency(): void {
    // Sort by priority first, then by timestamp
    this.queue.sort((a, b) => {
      const priorityOrder = { emergency: 0, high: 1, normal: 2, low: 3 };
      
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.timestamp - b.timestamp;
    });
  }
}