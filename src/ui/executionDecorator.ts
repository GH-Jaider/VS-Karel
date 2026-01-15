/**
 * Execution Decorator
 * Handles line highlighting during step execution
 */

import * as vscode from "vscode";
import { StateManager } from "@/services/stateManager";

/**
 * Clear execution line highlighting from all visible editors.
 * Standalone function for use across commands.
 */
export function clearExecutionHighlight(): void {
  const state = StateManager.getInstance();

  if (state.sourceDocument) {
    const editors = vscode.window.visibleTextEditors.filter(
      (e) => e.document === state.sourceDocument
    );
    editors.forEach((editor) => {
      editor.setDecorations(state.executionLineDecoration, []);
    });
  }
}

export class ExecutionDecorator {
  private decoration: vscode.TextEditorDecorationType;
  private currentDocument: vscode.TextDocument | null = null;

  constructor(decoration: vscode.TextEditorDecorationType) {
    this.decoration = decoration;
  }

  /**
   * Set the document to highlight
   */
  setDocument(document: vscode.TextDocument): void {
    this.currentDocument = document;
  }

  /**
   * Highlight a line in the current document
   */
  highlightLine(line: number): void {
    if (!this.currentDocument) {
      return;
    }

    const editors = vscode.window.visibleTextEditors.filter(
      (e) => e.document === this.currentDocument
    );

    const range = new vscode.Range(line - 1, 0, line - 1, 0);

    editors.forEach((editor) => {
      editor.setDecorations(this.decoration, [range]);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    });
  }

  /**
   * Clear all highlighting
   */
  clear(): void {
    if (!this.currentDocument) {
      return;
    }

    const editors = vscode.window.visibleTextEditors.filter(
      (e) => e.document === this.currentDocument
    );

    editors.forEach((editor) => {
      editor.setDecorations(this.decoration, []);
    });
  }

  /**
   * Clear and reset document reference
   */
  reset(): void {
    this.clear();
    this.currentDocument = null;
  }
}
