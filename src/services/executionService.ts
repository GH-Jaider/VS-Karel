/**
 * Execution Service
 * Manages interpreter lifecycle and execution state
 */

import * as vscode from "vscode";
import { Interpreter, World, RuntimeError } from "@/interpreter";

export class ExecutionService {
  private interpreter: Interpreter | null = null;
  private isRunning: boolean = false;

  // Callbacks
  public onStep?: (line: number) => void;
  public onComplete?: () => void;
  public onError?: (error: RuntimeError) => void;

  /**
   * Create and initialize interpreter
   */
  createInterpreter(world: World): Interpreter {
    this.interpreter = new Interpreter(world);
    this.setupCallbacks();
    return this.interpreter;
  }

  /**
   * Get current interpreter instance
   */
  getInterpreter(): Interpreter | null {
    return this.interpreter;
  }

  /**
   * Load program source into interpreter
   */
  loadProgram(source: string): { success: boolean; errors: string[] } {
    if (!this.interpreter) {
      return { success: false, errors: ["Interpreter not initialized"] };
    }

    const diagnostics = this.interpreter.load(source);
    const errors = diagnostics.filter((d) => d.severity === "error").map((d) => d.message);

    return { success: errors.length === 0, errors };
  }

  /**
   * Start continuous execution
   */
  async run(): Promise<void> {
    if (!this.interpreter) {
      throw new Error("Interpreter not initialized");
    }

    this.isRunning = true;
    try {
      await this.interpreter.run();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute a single step
   */
  step(): boolean {
    if (!this.interpreter) {
      throw new Error("Interpreter not initialized");
    }

    return this.interpreter.step();
  }

  /**
   * Stop execution
   */
  stop(): void {
    if (this.interpreter) {
      this.interpreter.stop();
    }
    this.isRunning = false;
  }

  /**
   * Reset interpreter and world
   */
  reset(): void {
    if (this.interpreter) {
      this.interpreter.reset();
    }
    this.isRunning = false;
  }

  /**
   * Set execution speed
   */
  setSpeed(ms: number): void {
    if (this.interpreter) {
      this.interpreter.setSpeed(ms);
    }
  }

  /**
   * Check if execution is in progress
   */
  isExecuting(): boolean {
    return this.isRunning;
  }

  /**
   * Check if step mode is initialized
   */
  isStepInitialized(): boolean {
    return this.interpreter?.isStepInitialized() ?? false;
  }

  /**
   * Check if execution is completed
   */
  isCompleted(): boolean {
    return this.interpreter?.isStepCompleted() ?? false;
  }

  /**
   * Setup interpreter callbacks
   */
  private setupCallbacks(): void {
    if (!this.interpreter) {
      return;
    }

    this.interpreter.onStep = (line: number) => {
      this.onStep?.(line);
    };

    this.interpreter.onComplete = () => {
      this.isRunning = false;
      this.onComplete?.();
    };

    this.interpreter.onError = (error: RuntimeError) => {
      this.isRunning = false;
      this.onError?.(error);
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop();
    this.interpreter = null;
  }
}
