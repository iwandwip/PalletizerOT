import { Command } from '../types/CommandTypes';

export interface HybridStep {
  id: number;
  action: string;
  axis?: string;
  position?: number;
  speed?: number;
  serial_cmd: string;
  expect_response: string;
  timeout: number;
  parallel?: boolean;
  command?: string;
  duration?: number;
  commands?: HybridStep[];
  expect_responses?: string[];
}

export interface HybridScript {
  steps: HybridStep[];
  stepCount: number;
  format: string;
  timestamp: number;
}

export class HybridGenerator {
  private stepId: number = 1;

  /**
   * Convert commands array to hybrid format for ESP32
   */
  public generate(commands: Command[]): HybridScript {
    this.stepId = 1;
    const steps: HybridStep[] = [];

    for (const command of commands) {
      const hybridSteps = this.commandToHybrid(command);
      steps.push(...hybridSteps);
    }

    return {
      steps,
      stepCount: steps.length,
      format: 'hybrid',
      timestamp: Date.now()
    };
  }

  /**
   * Convert single command to hybrid steps
   */
  private commandToHybrid(command: Command): HybridStep[] {
    switch (command.type) {
      case 'HOME':
        return this.generateHomeSteps(command);
        
      case 'ZERO':
        return this.generateZeroSteps(command);
        
      case 'SPEED':
        return this.generateSpeedSteps(command);
        
      case 'MOVE':
        return this.generateMoveSteps(command);
        
      case 'GROUP':
        return this.generateGroupSteps(command);
        
      case 'GROUPSYNC':
        return this.generateGroupSyncSteps(command);
        
      case 'SET':
        return this.generateSetSteps(command);
        
      case 'WAIT':
        return this.generateWaitSteps(command);
        
      case 'DETECT':
        return this.generateDetectSteps(command);
        
      case 'DELAY':
        return this.generateDelaySteps(command);
        
      default:
        return this.generateUnknownSteps(command);
    }
  }

  private generateHomeSteps(command: Command): HybridStep[] {
    if (command.data && Object.keys(command.data).length > 0) {
      const axis = Object.keys(command.data)[0];
      return [{
        id: this.stepId++,
        action: 'SYSTEM',
        axis: axis.toUpperCase(),
        serial_cmd: `${axis.toLowerCase()};home;`,
        expect_response: 'DONE',
        timeout: 10000,
        command: `HOME:${axis}`
      }];
    }
    
    // Home all axes
    const allAxes = ['X', 'Y', 'Z', 'T', 'G'];
    return allAxes.map(axis => ({
      id: this.stepId++,
      action: 'SYSTEM',
      axis,
      serial_cmd: `${axis.toLowerCase()};home;`,
      expect_response: 'DONE',
      timeout: 10000,
      command: `HOME:${axis}`
    }));
  }

  private generateZeroSteps(command: Command): HybridStep[] {
    return [{
      id: this.stepId++,
      action: 'SYSTEM',
      serial_cmd: 'zero;all;',
      expect_response: 'DONE',
      timeout: 15000,
      command: 'ZERO'
    }];
  }

  private generateSpeedSteps(command: Command): HybridStep[] {
    if (command.data?.ALL) {
      return [{
        id: this.stepId++,
        action: 'SYSTEM',
        speed: command.data.ALL as number,
        serial_cmd: `speed;all;${command.data.ALL};`,
        expect_response: 'OK',
        timeout: 2000,
        command: `SPEED:ALL:${command.data.ALL}`
      }];
    } else {
      const axis = Object.keys(command.data || {})[0];
      const value = command.data?.[axis] as number;
      return [{
        id: this.stepId++,
        action: 'SYSTEM',
        axis: axis.toUpperCase(),
        speed: value,
        serial_cmd: `speed;${axis.toLowerCase()};${value};`,
        expect_response: 'OK',
        timeout: 2000,
        command: `SPEED:${axis}:${value}`
      }];
    }
  }

  private generateMoveSteps(command: Command): HybridStep[] {
    const axis = Object.keys(command.data || {})[0];
    const positions = command.data?.[axis];
    
    if (Array.isArray(positions)) {
      // Multiple positions for same axis
      return positions.map((pos, index) => ({
        id: this.stepId++,
        action: 'MOVE',
        axis: axis.toUpperCase(),
        position: pos as number,
        speed: 1500, // Default speed
        serial_cmd: `MOVE:${axis.toUpperCase()}:${pos}:0`,
        expect_response: 'DONE',
        timeout: 8000,
        command: `MOVE:${axis}${pos}`
      }));
    } else {
      return [{
        id: this.stepId++,
        action: 'MOVE',
        axis: axis.toUpperCase(),
        position: positions as number,
        speed: 1500,
        serial_cmd: `MOVE:${axis.toUpperCase()}:${positions}:0`,
        expect_response: 'DONE',
        timeout: 8000,
        command: `MOVE:${axis}${positions}`
      }];
    }
  }

  private generateGroupSteps(command: Command): HybridStep[] {
    if (!command.data || Object.keys(command.data).length === 0) {
      return [];
    }

    const axes = Object.keys(command.data).filter(key => !key.includes('_'));
    const commands: HybridStep[] = [];
    
    // Create individual commands for coordinated execution
    for (const axis of axes) {
      const positions = command.data[axis];
      if (Array.isArray(positions)) {
        positions.forEach((pos) => {
          commands.push({
            id: this.stepId++,
            action: 'MOVE',
            axis: axis.toUpperCase(),
            position: pos as number,
            speed: 1500,
            serial_cmd: `MOVE:${axis.toUpperCase()}:${pos}:0`,
            expect_response: 'DONE',
            timeout: 8000,
            parallel: true
          });
        });
      } else {
        commands.push({
          id: this.stepId++,
          action: 'MOVE',
          axis: axis.toUpperCase(),
          position: positions as number,
          speed: 1500,
          serial_cmd: `MOVE:${axis.toUpperCase()}:${positions}:0`,
          expect_response: 'DONE',
          timeout: 8000,
          parallel: true
        });
      }
    }

    // Create group command for Arduino MEGA
    // Format: GROUP:X:100,Y:50,Z:10
    const groupCommand = 'GROUP:' + commands.map(cmd => `${cmd.axis}:${cmd.position}`).join(',');
    
    return [{
      id: this.stepId++,
      action: 'GROUP_MOVE',
      commands,
      expect_responses: ['GROUP_DONE'],
      timeout: 10000,
      serial_cmd: groupCommand,
      expect_response: 'GROUP_DONE'
    }];
  }

  private generateGroupSyncSteps(command: Command): HybridStep[] {
    // Similar to GROUP but with synchronization
    return this.generateGroupSteps(command).map(step => ({
      ...step,
      action: 'GROUP_SYNC',
      command: step.command?.replace('GROUP:', 'GROUPSYNC:')
    }));
  }

  private generateSetSteps(command: Command): HybridStep[] {
    const pin = command.data?.pin as number;
    return [{
      id: this.stepId++,
      action: 'SYSTEM',
      serial_cmd: `set;${pin};1;`,
      expect_response: 'OK',
      timeout: 1000,
      command: `SET:${pin}`
    }];
  }

  private generateWaitSteps(command: Command): HybridStep[] {
    return [{
      id: this.stepId++,
      action: 'WAIT',
      duration: 1000, // Default 1 second wait
      serial_cmd: 'wait;1000;',
      expect_response: 'OK',
      timeout: 2000,
      command: 'WAIT'
    }];
  }

  private generateDetectSteps(command: Command): HybridStep[] {
    return [{
      id: this.stepId++,
      action: 'SYSTEM',
      serial_cmd: 'detect;sensor;',
      expect_response: 'DETECTED',
      timeout: 5000,
      command: 'DETECT'
    }];
  }

  private generateDelaySteps(command: Command): HybridStep[] {
    const milliseconds = command.data?.milliseconds as number || 1000;
    return [{
      id: this.stepId++,
      action: 'WAIT',
      duration: milliseconds,
      serial_cmd: `delay;${milliseconds};`,
      expect_response: 'OK',
      timeout: milliseconds + 1000,
      command: `DELAY:${milliseconds}`
    }];
  }

  private generateUnknownSteps(command: Command): HybridStep[] {
    return [{
      id: this.stepId++,
      action: 'SYSTEM',
      serial_cmd: `unknown;${command.type};`,
      expect_response: 'ERROR',
      timeout: 1000,
      command: `UNKNOWN:${command.type}`
    }];
  }

  /**
   * Convert hybrid script to JSON string for ESP32
   */
  public toJson(hybridScript: HybridScript): string {
    return JSON.stringify(hybridScript, null, 2);
  }

  /**
   * Get step count from hybrid script
   */
  public getStepCount(hybridScript: HybridScript): number {
    return hybridScript.stepCount;
  }
}