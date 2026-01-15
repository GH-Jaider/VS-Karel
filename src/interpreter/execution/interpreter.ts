/**
 * Interpreter for executing Karel programs.
 */

import { World } from "@/interpreter/world";
import { ProgramNode, BlockNode, InstructionCallNode } from "@/interpreter/types/ast";
import { RuntimeError, Diagnostic } from "@/interpreter/types/errors";
import { ErrorMessages } from "@/i18n/messages";
import { Parser } from "@/interpreter/parsing/parser";
import { ExecutionFrame } from "@/interpreter/execution/executionFrame";

/**
 * Interpreter for executing Karel programs.
 */
export class Interpreter {
  private world: World;
  private ast: ProgramNode | null = null;
  private customInstructions: Map<string, BlockNode> = new Map();
  private running: boolean = false;
  private currentLine: number = 0;
  private executionSpeed: number = 500;
  private maxIterations: number = 100000;
  private iterationCount: number = 0;

  // Step execution state
  private executionStack: ExecutionFrame[] = [];
  private stepInitialized: boolean = false;
  private stepCompleted: boolean = false;

  // Callbacks for UI updates
  public onStep?: (line: number) => void;
  public onComplete?: () => void;
  public onError?: (error: RuntimeError) => void;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Check if step execution is initialized.
   */
  isStepInitialized(): boolean {
    return this.stepInitialized;
  }

  /**
   * Check if step execution is completed.
   */
  isStepCompleted(): boolean {
    return this.stepCompleted;
  }

  /**
   * Load and parse a program.
   */
  load(source: string): Diagnostic[] {
    const parser = new Parser();
    const { ast, diagnostics } = parser.parse(source);
    this.ast = ast;

    // Build custom instructions map
    this.customInstructions.clear();
    if (ast) {
      for (const def of ast.definitions) {
        this.customInstructions.set(def.name.toLowerCase(), def.body);
      }
    }

    return diagnostics;
  }

  /**
   * Run the entire program.
   * Uses the same stack-based execution as step() for consistency.
   */
  async run(): Promise<void> {
    if (!this.ast) {
      throw new RuntimeError(ErrorMessages.programNotLoaded());
    }

    // Initialize step mode if not already
    if (!this.stepInitialized) {
      this.initializeStepMode();
    }

    // Run all steps with delay
    try {
      while (this.running && !this.stepCompleted) {
        const hasMore = this.executeOneStep();
        if (!hasMore) {
          this.stepCompleted = true;
          this.onComplete?.();
          break;
        }
        // Wait for animation between steps
        await this.delay();
      }
    } catch (e) {
      this.stepCompleted = true;
      if (e instanceof RuntimeError) {
        this.onError?.(e);
      } else {
        throw e;
      }
    } finally {
      if (!this.running) {
        // Was stopped, don't mark as completed
      }
    }
  }

  /**
   * Execute a single step.
   * Returns true if there are more steps to execute, false if done.
   */
  step(): boolean {
    if (!this.ast) {
      throw new RuntimeError(ErrorMessages.programNotLoaded());
    }

    // Initialize step execution if not already
    if (!this.stepInitialized) {
      this.executionStack = [
        {
          type: "block",
          statements: this.ast.execution.statements,
          index: 0,
        },
      ];
      this.stepInitialized = true;
      this.stepCompleted = false;
      this.running = true;
      this.iterationCount = 0;
    }

    // If completed, nothing more to do
    if (this.stepCompleted) {
      return false;
    }

    // Resume if was stopped
    if (!this.running) {
      this.running = true;
    }

    try {
      const hasMore = this.executeOneStep();
      if (!hasMore) {
        this.stepCompleted = true;
        this.onComplete?.();
        return false;
      }
      return true;
    } catch (e) {
      this.stepCompleted = true;
      if (e instanceof RuntimeError) {
        this.onError?.(e);
      } else {
        throw e;
      }
      return false;
    }
  }

  /**
   * Initialize step mode without executing.
   */
  initializeStepMode(): void {
    if (!this.ast) {
      throw new RuntimeError(ErrorMessages.programNotLoaded());
    }
    this.executionStack = [
      {
        type: "block",
        statements: this.ast.execution.statements,
        index: 0,
      },
    ];
    this.stepInitialized = true;
    this.stepCompleted = false;
    this.running = true;
    this.iterationCount = 0;
  }

  /**
   * Execute one atomic step (one instruction).
   */
  private executeOneStep(): boolean {
    while (this.executionStack.length > 0) {
      const frame = this.executionStack[this.executionStack.length - 1];

      this.iterationCount++;
      if (this.iterationCount > this.maxIterations) {
        throw new RuntimeError(ErrorMessages.maxIterationsReached(this.maxIterations));
      }

      if (frame.type === "block" && frame.statements) {
        if (frame.index >= frame.statements.length) {
          // Done with this block
          this.executionStack.pop();
          continue;
        }

        const statement = frame.statements[frame.index];
        frame.index++;

        // Handle the statement
        if (statement.type === "call") {
          // Execute the call and return (one step done)
          this.executeCallSync(statement as InstructionCallNode);
          if (!this.running) {
            // turnoff was called
            return false;
          }
          return true;
        } else if (statement.type === "if") {
          const ifNode = statement;
          if (ifNode.type !== "if") {
            return true;
          }
          const condition = this.world.evaluateCondition(ifNode.condition);
          if (condition) {
            this.executionStack.push({
              type: "block",
              statements: ifNode.thenBranch.statements,
              index: 0,
            });
          } else if (ifNode.elseBranch) {
            this.executionStack.push({
              type: "block",
              statements: ifNode.elseBranch.statements,
              index: 0,
            });
          }
          continue;
        } else if (statement.type === "while") {
          const whileNode = statement;
          if (whileNode.type !== "while") {
            return true;
          }
          // Push while frame (we'll check condition in the while frame handler)
          this.executionStack.push({
            type: "while",
            condition: whileNode.condition,
            body: whileNode.body,
            index: 0,
          });
          continue;
        } else if (statement.type === "iterate") {
          const iterateNode = statement;
          if (iterateNode.type !== "iterate") {
            return true;
          }
          if (iterateNode.count > 0) {
            this.executionStack.push({
              type: "iterate",
              count: iterateNode.count,
              current: 0,
              body: iterateNode.body,
              index: 0,
            });
          }
          continue;
        } else if (statement.type === "block") {
          this.executionStack.push({
            type: "block",
            statements: (statement as BlockNode).statements,
            index: 0,
          });
          continue;
        }
      } else if (frame.type === "while") {
        // Check while condition
        if (!this.world.evaluateCondition(frame.condition!)) {
          this.executionStack.pop();
          continue;
        }
        // Push body as a new block frame, then re-check while
        const bodyFrame: ExecutionFrame = {
          type: "block",
          statements: frame.body!.statements,
          index: 0,
        };
        // Replace while frame with a fresh one for next iteration
        this.executionStack.pop();
        this.executionStack.push({
          type: "while",
          condition: frame.condition,
          body: frame.body,
          index: 0,
        });
        this.executionStack.push(bodyFrame);
        continue;
      } else if (frame.type === "iterate") {
        if (frame.current! >= frame.count!) {
          this.executionStack.pop();
          continue;
        }
        // Push body, increment counter
        frame.current!++;
        this.executionStack.push({
          type: "block",
          statements: frame.body!.statements,
          index: 0,
        });
        continue;
      }
    }

    // Stack empty - execution complete
    return false;
  }

  /**
   * Execute a call synchronously (for step mode).
   */
  private executeCallSync(node: InstructionCallNode): void {
    const name = node.name.toLowerCase();
    this.currentLine = node.line;
    this.onStep?.(node.line);

    try {
      switch (name) {
        case "move":
          this.world.move();
          break;
        case "turnleft":
          this.world.turnLeft();
          break;
        case "pickbeeper":
          this.world.pickBeeper();
          break;
        case "putbeeper":
          this.world.putBeeper();
          break;
        case "turnoff":
          this.running = false;
          break;
        default:
          // Custom instruction - push its body onto the stack
          const body = this.customInstructions.get(name);
          if (body) {
            // We need to execute the custom instruction's body
            // But we already incremented index, so we push the body
            // However, for custom instructions we want to step through them
            this.executionStack.push({
              type: "block",
              statements: body.statements,
              index: 0,
            });
            // Don't count this as a "step" - continue to first actual instruction
            return;
          } else {
            throw new RuntimeError(
              ErrorMessages.unknownInstruction(node.name, node.line),
              node.line
            );
          }
      }
    } catch (e) {
      if (e instanceof Error && !(e instanceof RuntimeError)) {
        throw new RuntimeError(e.message, node.line);
      }
      throw e;
    }
  }

  /**
   * Stop execution.
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Reset the world to initial state.
   */
  reset(): void {
    this.world.reset();
    this.running = false;
    this.currentLine = 0;
    this.iterationCount = 0;
    // Reset step execution state
    this.executionStack = [];
    this.stepInitialized = false;
    this.stepCompleted = false;
  }

  /**
   * Set execution speed in milliseconds.
   */
  setSpeed(ms: number): void {
    this.executionSpeed = Math.max(50, Math.min(2000, ms));
  }

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.executionSpeed));
  }
}
