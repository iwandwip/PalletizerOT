export interface Command {
  type: 'MOVE' | 'GROUP' | 'GROUPSYNC' | 'HOME' | 'ZERO' | 'SPEED' | 'SET' | 'WAIT' | 'DETECT' | 'DELAY' | 'FUNC' | 'CALL' | 'LOOP';
  data?: Record<string, unknown>;
  line?: number;
}

export interface Function {
  name: string;
  commands: Command[];
  startLine: number;
  endLine: number;
}

export interface CompilationResult {
  success: boolean;
  commands: Command[];
  textCommands: string;
  commandCount: number;
  error?: string;
}

export interface CompilerOptions {
  format: 'text' | 'json';
  validateSyntax: boolean;
  expandFunctions: boolean;
  expandLoops: boolean;
}