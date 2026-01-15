/**
 * Execution Commands
 * Handles program execution: run, step, stop
 */

import * as vscode from "vscode";
import { World, Interpreter, RuntimeError } from "@/interpreter";
import { WebviewProvider } from "@/providers";
import { StateManager, FileService } from "@/services";
import { clearExecutionHighlight } from "@/ui";
import { UIMessages } from "@/i18n/messages";

// Re-export for backwards compatibility (used in worldCommands)
export { clearExecutionHighlight };

/**
 * Set up interpreter callbacks for execution.
 * @param webview - The webview provider to update
 * @param includeEditorHighlight - Whether to highlight current line in editor (for step mode)
 */
function setupInterpreterCallbacks(
  webview: WebviewProvider,
  includeEditorHighlight: boolean = false
): void {
  const state = StateManager.getInstance();
  if (!state.interpreter) {
    return;
  }

  state.interpreter.onStep = (line) => {
    webview.updateView();
    webview.highlightLine(line);

    if (includeEditorHighlight && state.sourceDocument) {
      const editors = vscode.window.visibleTextEditors.filter(
        (e) => e.document === state.sourceDocument
      );
      editors.forEach((editor) => {
        const range = new vscode.Range(line - 1, 0, line - 1, Number.MAX_VALUE);
        editor.setDecorations(state.executionLineDecoration, [range]);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
      });
    }
  };

  state.interpreter.onComplete = () => {
    webview.setStatus("completed", UIMessages.executionCompleted());
    state.outputChannel.appendLine(UIMessages.executionCompleted());
    if (includeEditorHighlight) {
      clearExecutionHighlight();
    }
  };

  state.interpreter.onError = (error: RuntimeError) => {
    webview.setStatus("error", error.message);
    state.outputChannel.appendLine(`Error: ${error.message}`);
    vscode.window.showErrorMessage(error.message);
    if (includeEditorHighlight) {
      clearExecutionHighlight();
    }
  };
}

/**
 * Prompt for instructions file and store in state.
 * Returns true if successful.
 */
async function ensureInstructionsFile(): Promise<boolean> {
  const state = StateManager.getInstance();
  const fileService = FileService.getInstance();

  const document = await fileService.promptAndOpenInstructionsFile();
  if (document) {
    state.sourceDocument = document;
    return true;
  }
  return false;
}

/**
 * Prompt for map file and store in state.
 * Returns true if successful.
 */
async function ensureMapFile(context: vscode.ExtensionContext): Promise<boolean> {
  const state = StateManager.getInstance();
  const fileService = FileService.getInstance();

  const world = await fileService.promptAndLoadMapFile();
  if (world) {
    state.world = world;
    const webview = WebviewProvider.createOrShow(context.extensionUri);
    webview.loadWorld(world);
    return true;
  }
  return false;
}

/**
 * Initialize interpreter with current world and source.
 * Returns false if there are errors in the code.
 */
function initializeInterpreter(source: string): boolean {
  const state = StateManager.getInstance();
  if (!state.world) {
    return false;
  }

  state.interpreter = new Interpreter(state.world);

  const speed = vscode.workspace.getConfiguration("vs-karel").get("executionSpeed", 500);
  state.interpreter.setSpeed(speed);

  const diagnostics = state.interpreter.load(source);
  if (diagnostics.some((d) => d.severity === "error")) {
    vscode.window.showErrorMessage(UIMessages.cannotRunWithErrors());
    return false;
  }

  return true;
}

/**
 * Run the current Karel program (from topbar - always resets and prompts for map).
 */
export async function runProgram(context: vscode.ExtensionContext): Promise<void> {
  const state = StateManager.getInstance();
  let editor = vscode.window.activeTextEditor;

  // If no active Karel instructions file, prompt user to select one
  if (!editor || editor.document.languageId !== "karel-instructions") {
    if (!(await ensureInstructionsFile())) {
      return;
    }
    editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
  }

  // Store reference to the source document
  state.sourceDocument = editor.document;

  // Always prompt for map file (fresh start)
  if (!(await ensureMapFile(context)) || !state.world) {
    return;
  }

  // Open visualizer
  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(state.world);

  // Initialize interpreter
  const source = editor.document.getText();
  if (!initializeInterpreter(source)) {
    return;
  }

  // Set up callbacks and run
  setupInterpreterCallbacks(webview, false);

  webview.setStatus("running", UIMessages.executionStarted());
  state.outputChannel.appendLine(UIMessages.executionStarted());

  try {
    await state.interpreter!.run();
  } catch (error) {
    if (error instanceof Error) {
      webview.setStatus("error", error.message);
      state.outputChannel.appendLine(`Error: ${error.message}`);
    }
  }
}

/**
 * Run program from webview (continuous mode - maintains state if modified).
 */
export async function runFromWebview(context: vscode.ExtensionContext): Promise<void> {
  const state = StateManager.getInstance();

  // Ensure we have a world loaded
  if (!state.world) {
    if (!(await ensureMapFile(context)) || !state.world) {
      return;
    }
  }

  // If world is modified, show warning dialog
  if (state.world.isModified) {
    const choice = await vscode.window.showWarningMessage(
      UIMessages.worldModifiedPrompt(),
      { modal: true },
      UIMessages.continueOption(),
      UIMessages.resetOption()
    );

    if (!choice) {
      return; // User cancelled
    }

    if (choice === UIMessages.resetOption()) {
      state.world.reset();
    }
  }

  // Ensure we have a source document
  if (!state.sourceDocument) {
    if (!(await ensureInstructionsFile()) || !state.sourceDocument) {
      return;
    }
  }

  // Open/get visualizer
  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(state.world);

  // Initialize interpreter
  const source = state.sourceDocument.getText();
  if (!initializeInterpreter(source)) {
    return;
  }

  // Set up callbacks and run
  setupInterpreterCallbacks(webview, false);

  webview.setStatus("running", UIMessages.executionStarted());
  state.outputChannel.appendLine(UIMessages.executionStarted());

  try {
    await state.interpreter!.run();
  } catch (error) {
    if (error instanceof Error) {
      webview.setStatus("error", error.message);
      state.outputChannel.appendLine(`Error: ${error.message}`);
    }
  }
}

/**
 * Step through the program one instruction at a time.
 */
export async function stepProgram(context: vscode.ExtensionContext): Promise<void> {
  const state = StateManager.getInstance();

  // If we already have an interpreter in step mode, continue stepping
  if (
    state.interpreter &&
    state.interpreter.isStepInitialized() &&
    !state.interpreter.isStepCompleted()
  ) {
    const webview = WebviewProvider.currentPanel;
    if (!webview) {
      return;
    }

    try {
      const hasMore = state.interpreter.step();
      if (!hasMore) {
        webview.setStatus("completed", UIMessages.executionCompleted());
      }
    } catch (error) {
      if (error instanceof Error) {
        webview.setStatus("error", error.message);
        state.outputChannel.appendLine(`Error: ${error.message}`);
      }
    }
    return;
  }

  // Starting fresh - need an active editor with Karel code
  let editor = vscode.window.activeTextEditor;

  // If no active Karel instructions file, prompt user to select one
  if (!editor || editor.document.languageId !== "karel-instructions") {
    // Try to use stored source document
    if (state.sourceDocument) {
      editor = vscode.window.visibleTextEditors.find((e) => e.document === state.sourceDocument);
    }

    // If still no valid editor, prompt for file
    if (!editor || editor.document.languageId !== "karel-instructions") {
      if (!(await ensureInstructionsFile())) {
        return;
      }
      editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
    }
  }

  // Store reference to the source document
  state.sourceDocument = editor.document;

  // Ensure we have a world loaded
  if (!state.world) {
    if (!(await ensureMapFile(context))) {
      return;
    }
  }

  // Open visualizer
  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(state.world!);

  // Initialize interpreter
  const source = state.sourceDocument.getText();
  if (!initializeInterpreter(source)) {
    return;
  }

  // Set up callbacks (with editor highlighting for step mode)
  setupInterpreterCallbacks(webview, true);

  webview.setStatus("stepping", UIMessages.stepMode());
  state.outputChannel.appendLine(UIMessages.stepMode());

  // Execute first step
  try {
    const hasMore = state.interpreter!.step();
    if (!hasMore) {
      webview.setStatus("completed", UIMessages.executionCompleted());
    }
  } catch (error) {
    if (error instanceof Error) {
      webview.setStatus("error", error.message);
      state.outputChannel.appendLine(`Error: ${error.message}`);
    }
  }
}

/**
 * Stop program execution.
 */
export function stopProgram(): void {
  const state = StateManager.getInstance();

  if (state.interpreter) {
    state.interpreter.stop();
    const webview = WebviewProvider.currentPanel;
    if (webview) {
      webview.setStatus("stopped", UIMessages.executionStopped());
    }
    state.outputChannel.appendLine(UIMessages.executionStopped());
    clearExecutionHighlight();
  }
}
