/**
 * Execution frame types for stack-based execution.
 */

import { ASTNode, BlockNode } from "@/interpreter/types/ast";

/**
 * Execution frame for step-by-step execution.
 */
export interface ExecutionFrame {
  type: "block" | "if" | "while" | "iterate";
  statements?: ASTNode[];
  index: number;
  // For while loops
  condition?: string;
  body?: BlockNode;
  // For iterate loops
  count?: number;
  current?: number;
}
