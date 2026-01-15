/**
 * Execution Commands
 * Handles program execution: run, step, stop
 */

import * as vscode from "vscode";
import { World, Interpreter, RuntimeError } from "@/interpreter";
import { WebviewProvider } from "@/providers";
import { StateManager } from "@/services";
import { UIMessages, t } from "@/i18n/messages";

/**
 * Run the current Karel program (from topbar - always resets and prompts for map).
 */
export async function runProgram(context: vscode.ExtensionContext): Promise<void> {
  const state = StateManager.getInstance();
  let editor = vscode.window.activeTextEditor;

  // If no active Karel instructions file, prompt user to select one
  if (!editor || editor.document.languageId !== "karel-instructions") {
    const loaded = await promptForInstructionsFile(context);
    if (!loaded) {
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
  const loaded = await promptForMapFile(context);
  if (!loaded || !state.world) {
    return;
  }

  // Open visualizer
  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(state.world!);

  // Create interpreter
  state.interpreter = new Interpreter(state.world!);

  // Set execution speed from config
  const speed = vscode.workspace.getConfiguration("vs-karel").get("executionSpeed", 500);
  state.interpreter.setSpeed(speed);

  // Load program
  const source = editor.document.getText();
  const diagnostics = state.interpreter.load(source);

  if (diagnostics.some((d) => d.severity === "error")) {
    vscode.window.showErrorMessage(t("Cannot run program: there are errors in the code"));
    return;
  }

  // Set up callbacks
  state.interpreter.onStep = (line) => {
    webview.updateView();
    webview.highlightLine(line);
  };

  state.interpreter.onComplete = () => {
    webview.setStatus("completed", UIMessages.executionCompleted());
    state.outputChannel.appendLine(UIMessages.executionCompleted());
  };

  state.interpreter.onError = (error: RuntimeError) => {
    webview.setStatus("error", error.message);
    state.outputChannel.appendLine(`Error: ${error.message}`);
    vscode.window.showErrorMessage(error.message);
  };

  // Run
  webview.setStatus("running", UIMessages.executionStarted());
  state.outputChannel.appendLine(UIMessages.executionStarted());

  try {
    await state.interpreter.run();
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
    const loaded = await promptForMapFile(context);
    if (!loaded || !state.world) {
      return;
    }
  }

  // If world is modified, show warning dialog
  if (state.world.isModified) {
    const choice = await vscode.window.showWarningMessage(
      t("The world has been modified. Continue from current state or reset?"),
      { modal: true },
      t("Continue"),
      t("Reset")
    );

    if (!choice) {
      return; // User cancelled
    }

    if (choice === t("Reset")) {
      state.world.reset();
    }
  }

  // Ensure we have a source document
  if (!state.sourceDocument) {
    const loaded = await promptForInstructionsFile(context);
    if (!loaded || !state.sourceDocument) {
      return;
    }
  }

  // Open/get visualizer
  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(state.world);

  // Create interpreter
  state.interpreter = new Interpreter(state.world);

  // Set execution speed from config
  const speed = vscode.workspace.getConfiguration("vs-karel").get("executionSpeed", 500);
  state.interpreter.setSpeed(speed);

  // Load program
  const source = state.sourceDocument.getText();
  const diagnostics = state.interpreter.load(source);

  if (diagnostics.some((d) => d.severity === "error")) {
    vscode.window.showErrorMessage(t("Cannot run program: there are errors in the code"));
    return;
  }

  // Set up callbacks
  state.interpreter.onStep = (line) => {
    webview.updateView();
    webview.highlightLine(line);
  };

  state.interpreter.onComplete = () => {
    webview.setStatus("completed", UIMessages.executionCompleted());
    state.outputChannel.appendLine(UIMessages.executionCompleted());
  };

  state.interpreter.onError = (error: RuntimeError) => {
    webview.setStatus("error", error.message);
    state.outputChannel.appendLine(`Error: ${error.message}`);
    vscode.window.showErrorMessage(error.message);
  };

  // Run
  webview.setStatus("running", UIMessages.executionStarted());
  state.outputChannel.appendLine(UIMessages.executionStarted());

  try {
    await state.interpreter.run();
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
      const loaded = await promptForInstructionsFile(context);
      if (!loaded) {
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
    const loaded = await promptForMapFile(context);
    if (!loaded) {
      return;
    }
  }

  // Open visualizer
  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(state.world!);

  // Create new interpreter for stepping
  state.interpreter = new Interpreter(state.world!);

  // Load program from stored document
  const source = state.sourceDocument.getText();
  const diagnostics = state.interpreter.load(source);

  if (diagnostics.some((d) => d.severity === "error")) {
    vscode.window.showErrorMessage(t("Cannot run program: there are errors in the code"));
    return;
  }

  // Set up callbacks
  state.interpreter.onStep = (line) => {
    webview.updateView();
    webview.highlightLine(line);

    // Highlight current execution line in editor
    if (state.sourceDocument) {
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
    clearExecutionHighlight();
  };

  state.interpreter.onError = (error: RuntimeError) => {
    webview.setStatus("error", error.message);
    state.outputChannel.appendLine(`Error: ${error.message}`);
    vscode.window.showErrorMessage(error.message);
    clearExecutionHighlight();
  };

  webview.setStatus("stepping", UIMessages.stepMode());
  state.outputChannel.appendLine(UIMessages.stepMode());

  // Execute first step
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

/**
 * Clear execution line highlighting from all visible editors.
 */
function clearExecutionHighlight(): void {
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

/**
 * Prompt user to select a Karel instructions file.
 */
async function promptForInstructionsFile(context: vscode.ExtensionContext): Promise<boolean> {
  const state = StateManager.getInstance();

  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    filters: {
      "Karel Instructions": ["kli"],
    },
    title: t("Select Karel Instructions File"),
  };

  const fileUri = await vscode.window.showOpenDialog(options);

  if (fileUri && fileUri[0]) {
    const document = await vscode.workspace.openTextDocument(fileUri[0]);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    state.sourceDocument = document;
    return true;
  }

  return false;
}

/**
 * Prompt user to select a map file.
 */
async function promptForMapFile(context: vscode.ExtensionContext): Promise<boolean> {
  const state = StateManager.getInstance();

  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    filters: {
      "Karel Maps": ["klm"],
    },
    title: UIMessages.selectMapFile(),
  };

  const fileUri = await vscode.window.showOpenDialog(options);

  if (fileUri && fileUri[0]) {
    const fs = await import("fs");
    const content = fs.readFileSync(fileUri[0].fsPath, "utf-8");
    try {
      const map = JSON.parse(content);
      state.world = World.fromJSON(map);

      const webview = WebviewProvider.createOrShow(context.extensionUri);
      webview.loadWorld(state.world);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Failed to load map: ${error.message}`);
      }
    }
  }

  return false;
}
