/**
 * State Manager
 * Manages global state for the extension (replaces module-level variables)
 */

import * as vscode from "vscode";
import { World, Interpreter } from "@/interpreter";

export class StateManager {
  private static instance: StateManager;

  public world: World | null = null;
  public interpreter: Interpreter | null = null;
  public sourceDocument: vscode.TextDocument | null = null;
  public outputChannel: vscode.OutputChannel;
  public executionLineDecoration: vscode.TextEditorDecorationType;

  private constructor(
    outputChannel: vscode.OutputChannel,
    decoration: vscode.TextEditorDecorationType
  ) {
    this.outputChannel = outputChannel;
    this.executionLineDecoration = decoration;
  }

  public static initialize(
    outputChannel: vscode.OutputChannel,
    decoration: vscode.TextEditorDecorationType
  ): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager(outputChannel, decoration);
    }
    return StateManager.instance;
  }

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      throw new Error("StateManager not initialized");
    }
    return StateManager.instance;
  }

  public reset(): void {
    this.world = null;
    this.interpreter = null;
    this.sourceDocument = null;
  }
}
