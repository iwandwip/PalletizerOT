// Main exports
export { MSLCompiler } from './MSLCompiler';

// Types
export type { 
  Command, 
  Function, 
  CompilationResult, 
  CompilerOptions 
} from './types/CommandTypes';

// Core components
export {
  FunctionManager,
  LoopManager,
  ParserRegistry
} from './core';

// Parsers
export {
  BaseParser,
  MovementParser,
  GroupParser,
  SystemParser,
  ControlFlowParser
} from './parsers';

// Generators
export { TextGenerator } from './generators';

// Convenience function for quick compilation
export function compileMSL(script: string, options?: Partial<CompilerOptions>): CompilationResult {
  const compiler = new MSLCompiler(options);
  return compiler.compile(script);
}