// Type definitions for SpreadsheetEditor and modals

export interface StepCommandData {
  // For MOVE commands
  axis?: string;
  position?: number;
  speed?: number;
  
  // For GROUP_MOVE commands
  axes?: Array<{
    axis: string;
    position: number;
    speed: number;
  }>;
  
  // For SYSTEM commands
  systemCommand?: string;
  
  // For WAIT commands
  duration?: number;
  
  // Generic data
  [key: string]: any;
}

export interface SpreadsheetRow {
  id: string;
  step: number;
  action: 'MOVE' | 'GROUP_MOVE' | 'SYSTEM' | 'WAIT';
  summary: string;
  timeout: number;
  notes: string;
  data: StepCommandData;
}

export type ActionType = 'MOVE' | 'GROUP_MOVE' | 'SYSTEM' | 'WAIT';