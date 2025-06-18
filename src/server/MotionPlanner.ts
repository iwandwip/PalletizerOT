interface Command {
  type: 'MOVE' | 'GROUP' | 'SYNC' | 'SET_SPEED' | 'SET_ACCEL' | 'HOME' | 'ZERO';
  data?: any;
  line?: number;
}

interface Position {
  X: number;
  Y: number;
  Z: number;
  T: number;
  G: number;
}

interface MotionProfile {
  distance: number;
  maxSpeed: number;
  acceleration: number;
  duration: number;
}

export class MotionPlanner {
  private currentPosition: Position = { X: 0, Y: 0, Z: 0, T: 0, G: 0 };
  private currentSpeed: Partial<Position> = {};
  private currentAccel: Partial<Position> = {};
  
  // Default motion parameters
  private defaultSpeed = 1000;
  private defaultAccel = 500;

  public async plan(commands: Command[]): Promise<Command[]> {
    const optimizedCommands: Command[] = [];
    
    // Reset position tracking
    this.currentPosition = { X: 0, Y: 0, Z: 0, T: 0, G: 0 };
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      switch (command.type) {
        case 'MOVE':
          const optimizedMove = this.optimizeMove(command);
          optimizedCommands.push(optimizedMove);
          this.updatePosition(command.data);
          break;
          
        case 'GROUP':
          const optimizedGroup = this.optimizeGroupMove(command);
          optimizedCommands.push(optimizedGroup);
          this.updatePosition(command.data);
          break;
          
        case 'SET_SPEED':
          this.updateSpeeds(command.data);
          optimizedCommands.push(command);
          break;
          
        case 'SET_ACCEL':
          this.updateAccelerations(command.data);
          optimizedCommands.push(command);
          break;
          
        case 'SYNC':
          // Look ahead for optimization opportunities
          const syncOptimized = this.optimizeSync(commands, i);
          optimizedCommands.push(...syncOptimized);
          break;
          
        default:
          optimizedCommands.push(command);
      }
    }
    
    return optimizedCommands;
  }

  private optimizeMove(command: Command): Command {
    const data = { ...command.data };
    
    // Apply default speeds and accelerations if not specified
    if (!data.speed) {
      data.speed = this.defaultSpeed;
    }
    if (!data.accel) {
      data.accel = this.defaultAccel;
    }
    
    // Optimize based on move distance
    const moveDistance = this.calculateMoveDistance(data);
    
    // For very short moves, reduce acceleration to prevent overshoot
    if (moveDistance < 100) {
      data.accel = Math.min(data.accel, 200);
      data.speed = Math.min(data.speed, 500);
    }
    
    // For very long moves, optimize for time
    if (moveDistance > 5000) {
      data.speed = Math.min(data.speed * 1.5, 3000);
    }
    
    return {
      ...command,
      data
    };
  }

  private optimizeGroupMove(command: Command): Command {
    const data = { ...command.data };
    
    // Calculate synchronized motion profile
    const profile = this.calculateSynchronizedProfile(data);
    
    data.speed = profile.maxSpeed;
    data.accel = profile.acceleration;
    
    return {
      ...command,
      data
    };
  }

  private calculateSynchronizedProfile(moveData: any): MotionProfile {
    const axes = ['X', 'Y', 'Z', 'T', 'G'];
    let maxDistance = 0;
    let maxTime = 0;
    
    // Find the axis with the longest move
    for (const axis of axes) {
      if (moveData[axis] !== undefined) {
        const distance = Math.abs(moveData[axis] - this.currentPosition[axis as keyof Position]);
        maxDistance = Math.max(maxDistance, distance);
        
        // Calculate time based on current speed settings
        const speed = this.currentSpeed[axis as keyof Position] || this.defaultSpeed;
        const accel = this.currentAccel[axis as keyof Position] || this.defaultAccel;
        
        const time = this.calculateMoveTime(distance, speed, accel);
        maxTime = Math.max(maxTime, time);
      }
    }
    
    return {
      distance: maxDistance,
      maxSpeed: Math.min(maxDistance / maxTime * 1.1, 2000),
      acceleration: this.defaultAccel,
      duration: maxTime
    };
  }

  private calculateMoveTime(distance: number, maxSpeed: number, acceleration: number): number {
    // Simplified trapezoidal motion profile calculation
    const accelTime = maxSpeed / acceleration;
    const accelDistance = 0.5 * acceleration * accelTime * accelTime;
    
    if (distance <= 2 * accelDistance) {
      // Triangular profile (never reaches max speed)
      return 2 * Math.sqrt(distance / acceleration);
    } else {
      // Trapezoidal profile
      const cruiseDistance = distance - 2 * accelDistance;
      const cruiseTime = cruiseDistance / maxSpeed;
      return 2 * accelTime + cruiseTime;
    }
  }

  private calculateMoveDistance(moveData: any): number {
    let totalDistance = 0;
    const axes = ['X', 'Y', 'Z', 'T', 'G'];
    
    for (const axis of axes) {
      if (moveData[axis] !== undefined) {
        const distance = Math.abs(moveData[axis] - this.currentPosition[axis as keyof Position]);
        totalDistance += distance;
      }
    }
    
    return totalDistance;
  }

  private optimizeSync(commands: Command[], currentIndex: number): Command[] {
    // Look ahead to see if we can batch moves before sync
    const batchedCommands: Command[] = [];
    let i = currentIndex + 1;
    
    // Collect sequential moves that can be batched
    const movesToBatch: Command[] = [];
    
    while (i < commands.length) {
      const nextCommand = commands[i];
      
      if (nextCommand.type === 'MOVE' && this.canBatchMove(nextCommand)) {
        movesToBatch.push(nextCommand);
        i++;
      } else {
        break;
      }
    }
    
    if (movesToBatch.length > 1) {
      // Convert multiple moves to a single group move
      const batchedMove = this.batchMovesToGroup(movesToBatch);
      batchedCommands.push(batchedMove);
    } else {
      // No optimization possible, keep original sync
      batchedCommands.push({ type: 'SYNC' });
    }
    
    return batchedCommands;
  }

  private canBatchMove(command: Command): boolean {
    // Only batch simple axis moves without complex logic
    const data = command.data;
    
    // Don't batch if it has custom speeds or accelerations
    if (data.speed || data.accel) return false;
    
    // Don't batch very large moves
    const distance = this.calculateMoveDistance(data);
    if (distance > 1000) return false;
    
    return true;
  }

  private batchMovesToGroup(moves: Command[]): Command {
    const groupData: any = {};
    
    // Combine all axis movements
    for (const move of moves) {
      Object.assign(groupData, move.data);
    }
    
    return {
      type: 'GROUP',
      data: groupData,
      line: moves[0].line
    };
  }

  private updatePosition(moveData: any): void {
    const axes: (keyof Position)[] = ['X', 'Y', 'Z', 'T', 'G'];
    
    for (const axis of axes) {
      if (moveData[axis] !== undefined) {
        this.currentPosition[axis] = moveData[axis];
      }
    }
  }

  private updateSpeeds(speedData: any): void {
    Object.assign(this.currentSpeed, speedData);
  }

  private updateAccelerations(accelData: any): void {
    Object.assign(this.currentAccel, accelData);
  }

  // Path optimization methods
  public optimizePath(commands: Command[]): Command[] {
    // Implement path smoothing and optimization
    return this.smoothPath(commands);
  }

  private smoothPath(commands: Command[]): Command[] {
    const smoothed: Command[] = [];
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.type === 'MOVE') {
        // Look ahead for path smoothing opportunities
        const nextMove = this.findNextMove(commands, i + 1);
        
        if (nextMove) {
          const smoothedCommands = this.createSmoothTransition(command, nextMove);
          smoothed.push(...smoothedCommands);
        } else {
          smoothed.push(command);
        }
      } else {
        smoothed.push(command);
      }
    }
    
    return smoothed;
  }

  private findNextMove(commands: Command[], startIndex: number): Command | null {
    for (let i = startIndex; i < commands.length; i++) {
      const cmd = commands[i];
      if (cmd.type === 'MOVE' || cmd.type === 'GROUP') {
        return cmd;
      }
      if (cmd.type === 'SYNC') {
        break; // Don't smooth across sync points
      }
    }
    return null;
  }

  private createSmoothTransition(move1: Command, move2: Command): Command[] {
    // For now, just return the original moves
    // Could implement bezier curve interpolation or other smoothing
    return [move1];
  }

  // Performance analysis
  public analyzePerformance(commands: Command[]): {
    totalTime: number;
    totalDistance: number;
    efficiency: number;
  } {
    let totalTime = 0;
    let totalDistance = 0;
    const tempPosition = { ...this.currentPosition };
    
    for (const command of commands) {
      if (command.type === 'MOVE' || command.type === 'GROUP') {
        const distance = this.calculateMoveDistance(command.data);
        const speed = command.data.speed || this.defaultSpeed;
        const accel = command.data.accel || this.defaultAccel;
        
        const time = this.calculateMoveTime(distance, speed, accel);
        
        totalTime += time;
        totalDistance += distance;
        
        this.updatePosition(command.data);
      }
    }
    
    const efficiency = totalDistance > 0 ? (totalDistance / totalTime) / this.defaultSpeed : 0;
    
    return {
      totalTime,
      totalDistance,
      efficiency
    };
  }
}