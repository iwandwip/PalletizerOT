import { SpreadsheetRow } from './types';

/**
 * Generate Modern Script Language (MSL) from spreadsheet rows
 */
export function generateScriptFromSpreadsheet(rows: SpreadsheetRow[]): string {
  const lines: string[] = [];
  
  // Add header comment
  lines.push('// Generated from SpreadsheetEditor');
  lines.push(`// Generated at: ${new Date().toISOString()}`);
  lines.push('');
  
  // Process each row
  for (const row of rows) {
    // Add comment if notes exist
    if (row.notes) {
      lines.push(`// Step ${row.step}: ${row.notes}`);
    }
    
    switch (row.action) {
      case 'MOVE':
        if (row.data.axis && row.data.position !== undefined) {
          const speedPart = row.data.speed ? ` F${row.data.speed}` : '';
          lines.push(`${row.data.axis}${row.data.position}${speedPart}`);
        }
        break;
        
      case 'GROUP_MOVE':
        if (row.data.axes && row.data.axes.length > 0) {
          const movements = row.data.axes.map(axis => {
            const speedPart = axis.speed ? ` F${axis.speed}` : '';
            return `${axis.axis}${axis.position}${speedPart}`;
          }).join(' ');
          lines.push(`GROUP ${movements}`);
        }
        break;
        
      case 'SYSTEM':
        if (row.data.systemCommand) {
          // Map system commands to MSL commands
          switch (row.data.systemCommand) {
            case 'GRIPPER_OPEN':
              lines.push('G1');
              break;
            case 'GRIPPER_CLOSE':
              lines.push('G0');
              break;
            case 'HOME_ALL':
              lines.push('HOME');
              break;
            case 'ZERO_ALL':
              lines.push('ZERO');
              break;
            default:
              lines.push(`// Unknown system command: ${row.data.systemCommand}`);
          }
        }
        break;
        
      case 'WAIT':
        if (row.data.duration) {
          lines.push(`DELAY ${row.data.duration}`);
        }
        break;
        
      default:
        lines.push(`// Unknown action: ${row.action}`);
    }
    
    // Add sync if timeout is specified (for movement commands)
    if ((row.action === 'MOVE' || row.action === 'GROUP_MOVE') && row.timeout > 0) {
      lines.push('SYNC');
    }
    
    lines.push(''); // Add blank line between commands
  }
  
  return lines.join('\n').trim();
}