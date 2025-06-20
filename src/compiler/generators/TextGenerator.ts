import { Command } from '../types/CommandTypes';

export class TextGenerator {
  /**
   * Convert commands array to text format
   */
  public generate(commands: Command[]): string {
    return commands.map(cmd => this.commandToText(cmd)).join('\n');
  }

  /**
   * Convert single command to text format
   */
  private commandToText(command: Command): string {
    switch (command.type) {
      case 'HOME':
        if (command.data && Object.keys(command.data).length > 0) {
          const axis = Object.keys(command.data)[0];
          return `HOME:${axis}`;
        }
        return 'HOME';
        
      case 'ZERO':
        return 'ZERO';
        
      case 'SPEED':
        if (command.data?.ALL) {
          return `SPEED:ALL:${command.data.ALL}`;
        } else {
          const axis = Object.keys(command.data || {})[0];
          const value = command.data?.[axis];
          return `SPEED:${axis}:${value}`;
        }
        
      case 'MOVE':
        const axis = Object.keys(command.data || {})[0];
        const positions = command.data?.[axis];
        if (Array.isArray(positions)) {
          return `MOVE:${axis}${positions.join(',')}`;
        }
        return `MOVE:${axis}${positions}`;
        
      case 'GROUP':
        if (!command.data || Object.keys(command.data).length === 0) {
          return 'GROUP:';
        }
        const groupAxes = Object.keys(command.data)
          .filter(key => !key.includes('_'))
          .map(axis => {
            const positions = command.data?.[axis];
            if (Array.isArray(positions)) {
              return `${axis}${positions.join(',')}`;
            }
            return `${axis}${positions}`;
          })
          .join(':');
        return `GROUP:${groupAxes}`;
        
      case 'GROUPSYNC':
        if (!command.data || Object.keys(command.data).length === 0) {
          return 'GROUPSYNC:';
        }
        const syncAxes = Object.keys(command.data)
          .filter(key => !key.includes('_'))
          .map(axis => {
            const positions = command.data?.[axis];
            if (Array.isArray(positions)) {
              return `${axis}${positions.join(',')}`;
            }
            return `${axis}${positions}`;
          })
          .join(':');
        return `GROUPSYNC:${syncAxes}`;
        
      case 'SET':
        return `SET:${command.data?.pin}`;
        
      case 'WAIT':
        return 'WAIT';
        
      case 'DETECT':
        return 'DETECT';
        
      case 'DELAY':
        return `DELAY:${command.data?.milliseconds}`;
        
      default:
        return `UNKNOWN:${command.type}`;
    }
  }
}