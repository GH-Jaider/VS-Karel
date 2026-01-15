/**
 * VS Karel Extension - Main Entry Point
 *
 * Karel the Robot IDE for VS Code
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { World, KarelMap, Interpreter, Parser } from "./interpreter";
import { DiagnosticsProvider, WebviewProvider } from "./providers";
import { UIMessages, t } from "./i18n/messages";
import { parseAsciiMap } from "./utils";

// Global state
let diagnosticsProvider: DiagnosticsProvider;
let currentWorld: World | null = null;
let currentInterpreter: Interpreter | null = null;
let currentSourceDocument: vscode.TextDocument | null = null;
let outputChannel: vscode.OutputChannel;
let executionLineDecoration: vscode.TextEditorDecorationType;

/**
 * Extension activation.
 */
export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel("Karel");

  // Initialize diagnostics provider
  diagnosticsProvider = new DiagnosticsProvider();
  context.subscriptions.push(diagnosticsProvider);

  // Create execution line decoration (theme-aware, debugger-style)
  executionLineDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor("editor.stackFrameHighlightBackground"),
    isWholeLine: true,
    overviewRulerColor: new vscode.ThemeColor("editorOverviewRuler.rangeHighlightForeground"),
    overviewRulerLane: vscode.OverviewRulerLane.Full,
    gutterIconPath: vscode.Uri.parse(
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23007ACC' d='M6 3l6 5-6 5z'/%3E%3C/svg%3E"
    ),
    gutterIconSize: "contain",
    borderWidth: "0 0 0 3px",
    borderStyle: "solid",
    borderColor: new vscode.ThemeColor("editorGutter.modifiedBackground"),
  });
  context.subscriptions.push(executionLineDecoration);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("vs-karel.run", () => runProgram(context)),
    vscode.commands.registerCommand("vs-karel.runFromWebview", () => runFromWebview(context)),
    vscode.commands.registerCommand("vs-karel.changeProgram", () => changeProgram(context)),
    vscode.commands.registerCommand("vs-karel.step", () => stepProgram(context)),
    vscode.commands.registerCommand("vs-karel.stop", () => stopProgram()),
    vscode.commands.registerCommand("vs-karel.reset", () => resetWorld(context)),
    vscode.commands.registerCommand("vs-karel.toggleErrorHighlighting", () =>
      toggleErrorHighlighting()
    ),
    vscode.commands.registerCommand("vs-karel.openVisualizer", () => openVisualizer(context)),
    vscode.commands.registerCommand("vs-karel.convertMap", () => convertAsciiMap())
  );

  // Auto-open visualizer when opening .klm files
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.languageId === "karel-map") {
        const autoOpen = vscode.workspace
          .getConfiguration("vs-karel")
          .get("autoOpenVisualizer", true);
        if (autoOpen) {
          loadMapFile(doc, context);
        }
      }
    })
  );

  // Reload map when saving .klm files
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId === "karel-map") {
        reloadMapFile(doc, context);
      }
    })
  );

  // Clear execution highlighting when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      // If switched away from the Karel instructions document, clear highlighting
      if (!editor || editor.document !== currentSourceDocument) {
        clearExecutionHighlight();
      }
    })
  );

  outputChannel.appendLine("VS Karel extension activated");
}

/**
 * Extension deactivation.
 */
export function deactivate(): void {
  clearExecutionHighlight();
  outputChannel.appendLine("VS Karel extension deactivated");
}

/**
 * Clear execution line highlighting from all visible editors.
 */
function clearExecutionHighlight(): void {
  if (currentSourceDocument) {
    const editors = vscode.window.visibleTextEditors.filter(
      (e) => e.document === currentSourceDocument
    );
    editors.forEach((editor) => {
      editor.setDecorations(executionLineDecoration, []);
    });
  }
}

/**
 * Run the current Karel program (from topbar - always resets and prompts for map).
 */
async function runProgram(context: vscode.ExtensionContext): Promise<void> {
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
  currentSourceDocument = editor.document;

  // Always prompt for map file (fresh start)
  const loaded = await promptForMapFile(context);
  if (!loaded || !currentWorld) {
    return;
  }

  // Open visualizer
  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(currentWorld!);

  // Create interpreter
  currentInterpreter = new Interpreter(currentWorld!);

  // Set execution speed from config
  const speed = vscode.workspace.getConfiguration("vs-karel").get("executionSpeed", 500);
  currentInterpreter.setSpeed(speed);

  // Load program
  const source = editor.document.getText();
  const diagnostics = currentInterpreter.load(source);

  if (diagnostics.some((d) => d.severity === "error")) {
    vscode.window.showErrorMessage(t("Cannot run program: there are errors in the code"));
    return;
  }

  // Set up callbacks
  currentInterpreter.onStep = (line) => {
    webview.updateView();
    webview.highlightLine(line);
  };

  currentInterpreter.onComplete = () => {
    webview.setStatus("completed", UIMessages.executionCompleted());
    outputChannel.appendLine(UIMessages.executionCompleted());
  };

  currentInterpreter.onError = (error) => {
    webview.setStatus("error", error.message);
    outputChannel.appendLine(`Error: ${error.message}`);
    vscode.window.showErrorMessage(error.message);
  };

  // Run
  webview.setStatus("running", UIMessages.executionStarted());
  outputChannel.appendLine(UIMessages.executionStarted());

  try {
    await currentInterpreter.run();
  } catch (error) {
    if (error instanceof Error) {
      webview.setStatus("error", error.message);
      outputChannel.appendLine(`Error: ${error.message}`);
    }
  }
}

/**
 * Run program from webview (continuous mode - maintains state if modified).
 */
async function runFromWebview(context: vscode.ExtensionContext): Promise<void> {
  // Ensure we have a world loaded
  if (!currentWorld) {
    const loaded = await promptForMapFile(context);
    if (!loaded || !currentWorld) {
      return;
    }
  }

  // If world is modified, show warning dialog
  if (currentWorld.isModified) {
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
      currentWorld.reset();
    }
  }

  // Ensure we have a source document
  if (!currentSourceDocument) {
    const loaded = await promptForInstructionsFile(context);
    if (!loaded || !currentSourceDocument) {
      return;
    }
  }

  // Open/get visualizer
  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(currentWorld);

  // Create interpreter
  currentInterpreter = new Interpreter(currentWorld);

  // Set execution speed from config
  const speed = vscode.workspace.getConfiguration("vs-karel").get("executionSpeed", 500);
  currentInterpreter.setSpeed(speed);

  // Load program
  const source = currentSourceDocument.getText();
  const diagnostics = currentInterpreter.load(source);

  if (diagnostics.some((d) => d.severity === "error")) {
    vscode.window.showErrorMessage(t("Cannot run program: there are errors in the code"));
    return;
  }

  // Set up callbacks
  currentInterpreter.onStep = (line) => {
    webview.updateView();
    webview.highlightLine(line);
  };

  currentInterpreter.onComplete = () => {
    webview.setStatus("completed", UIMessages.executionCompleted());
    outputChannel.appendLine(UIMessages.executionCompleted());
  };

  currentInterpreter.onError = (error) => {
    webview.setStatus("error", error.message);
    outputChannel.appendLine(`Error: ${error.message}`);
    vscode.window.showErrorMessage(error.message);
  };

  // Run
  webview.setStatus("running", UIMessages.executionStarted());
  outputChannel.appendLine(UIMessages.executionStarted());

  try {
    await currentInterpreter.run();
  } catch (error) {
    if (error instanceof Error) {
      webview.setStatus("error", error.message);
      outputChannel.appendLine(`Error: ${error.message}`);
    }
  }
}

/**
 * Change the program file to execute from webview.
 */
async function changeProgram(context: vscode.ExtensionContext): Promise<void> {
  const loaded = await promptForInstructionsFile(context);
  if (loaded) {
    vscode.window.showInformationMessage(
      UIMessages.programChanged(currentSourceDocument?.fileName ?? "")
    );
  }
}

/**
 * Step through the program one instruction at a time.
 */
async function stepProgram(context: vscode.ExtensionContext): Promise<void> {
  // If we already have an interpreter in step mode, continue stepping
  if (
    currentInterpreter &&
    currentInterpreter.isStepInitialized() &&
    !currentInterpreter.isStepCompleted()
  ) {
    const webview = WebviewProvider.currentPanel;
    if (!webview) {
      return;
    }

    try {
      const hasMore = currentInterpreter.step();
      if (!hasMore) {
        webview.setStatus("completed", UIMessages.executionCompleted());
      }
    } catch (error) {
      if (error instanceof Error) {
        webview.setStatus("error", error.message);
        outputChannel.appendLine(`Error: ${error.message}`);
      }
    }
    return;
  }

  // Starting fresh - need an active editor with Karel code
  let editor = vscode.window.activeTextEditor;

  // If no active Karel instructions file, prompt user to select one
  if (!editor || editor.document.languageId !== "karel-instructions") {
    // Try to use stored source document
    if (currentSourceDocument) {
      editor = vscode.window.visibleTextEditors.find((e) => e.document === currentSourceDocument);
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
  currentSourceDocument = editor.document;

  // Ensure we have a world loaded
  if (!currentWorld) {
    const loaded = await promptForMapFile(context);
    if (!loaded) {
      return;
    }
  }

  // Open visualizer
  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(currentWorld!);

  // Create new interpreter for stepping
  currentInterpreter = new Interpreter(currentWorld!);

  // Load program from stored document
  const source = currentSourceDocument.getText();
  const diagnostics = currentInterpreter.load(source);

  if (diagnostics.some((d) => d.severity === "error")) {
    vscode.window.showErrorMessage(t("Cannot run program: there are errors in the code"));
    return;
  }

  // Set up callbacks
  currentInterpreter.onStep = (line) => {
    webview.updateView();
    webview.highlightLine(line);

    // Highlight current execution line in editor
    if (currentSourceDocument) {
      const editors = vscode.window.visibleTextEditors.filter(
        (e) => e.document === currentSourceDocument
      );
      editors.forEach((editor) => {
        const range = new vscode.Range(line - 1, 0, line - 1, Number.MAX_VALUE);
        editor.setDecorations(executionLineDecoration, [range]);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
      });
    }
  };

  currentInterpreter.onComplete = () => {
    webview.setStatus("completed", UIMessages.executionCompleted());
    outputChannel.appendLine(UIMessages.executionCompleted());

    // Clear execution line highlighting
    clearExecutionHighlight();
  };

  currentInterpreter.onError = (error) => {
    webview.setStatus("error", error.message);
    outputChannel.appendLine(`Error: ${error.message}`);
    vscode.window.showErrorMessage(error.message);

    // Clear execution line highlighting
    clearExecutionHighlight();
  };

  webview.setStatus("stepping", UIMessages.stepMode());
  outputChannel.appendLine(UIMessages.stepMode());

  // Execute first step
  try {
    const hasMore = currentInterpreter.step();
    if (!hasMore) {
      webview.setStatus("completed", UIMessages.executionCompleted());
    }
  } catch (error) {
    if (error instanceof Error) {
      webview.setStatus("error", error.message);
      outputChannel.appendLine(`Error: ${error.message}`);
    }
  }
}

/**
 * Stop program execution.
 */
function stopProgram(): void {
  if (currentInterpreter) {
    currentInterpreter.stop();
    const webview = WebviewProvider.currentPanel;
    if (webview) {
      webview.setStatus("stopped", UIMessages.executionStopped());
    }
    outputChannel.appendLine(UIMessages.executionStopped());

    // Clear execution line highlighting
    clearExecutionHighlight();
  }
}

/**
 * Reset the world to initial state.
 */
function resetWorld(context: vscode.ExtensionContext): void {
  if (currentWorld) {
    currentWorld.reset();
    const webview = WebviewProvider.currentPanel;
    if (webview) {
      webview.loadWorld(currentWorld);
      webview.setStatus("stopped", "Ready");
    }
  }
  if (currentInterpreter) {
    currentInterpreter.reset();

    // Clear execution line highlighting
    clearExecutionHighlight();
  }
  // Keep currentSourceDocument reference so run/step can reuse it
}

/**
 * Toggle error highlighting on/off.
 */
async function toggleErrorHighlighting(): Promise<void> {
  const enabled = await diagnosticsProvider.toggle();
  const message = enabled
    ? UIMessages.errorHighlightingEnabled()
    : UIMessages.errorHighlightingDisabled();
  vscode.window.showInformationMessage(message);
  outputChannel.appendLine(message);
}

/**
 * Open the world visualizer.
 */
async function openVisualizer(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  // If viewing a map file, load it
  if (editor && editor.document.languageId === "karel-map") {
    loadMapFile(editor.document, context);
    return;
  }

  // Otherwise, prompt for a map file or create empty world
  if (!currentWorld) {
    const loaded = await promptForMapFile(context);
    if (!loaded) {
      // Create default empty world
      currentWorld = World.createEmpty(10, 10);
    }
  }

  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(currentWorld!);
}

/**
 * Load a .klm map file.
 */
function loadMapFile(document: vscode.TextDocument, context: vscode.ExtensionContext): void {
  try {
    const content = document.getText();
    const map: KarelMap = JSON.parse(content);

    // Validate map structure
    if (!map.dimensions || !map.karel) {
      throw new Error("Invalid map file: missing dimensions or karel");
    }

    currentWorld = World.fromJSON(map);

    const webview = WebviewProvider.createOrShow(context.extensionUri);
    webview.loadWorld(currentWorld);
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Failed to load map: ${error.message}`);
      outputChannel.appendLine(`Error loading map: ${error.message}`);
    }
  }
}

/**
 * Reload a .klm map file when saved (only if visualizer is open).
 */
function reloadMapFile(document: vscode.TextDocument, context: vscode.ExtensionContext): void {
  // Only reload if the visualizer is already open
  const webview = WebviewProvider.currentPanel;
  if (!webview) {
    return;
  }

  const filename = path.basename(document.uri.fsPath);

  try {
    const content = document.getText();
    const map: KarelMap = JSON.parse(content);

    // Validate map structure
    if (!map.dimensions || !map.karel) {
      throw new Error(t("Invalid map file: missing dimensions or karel"));
    }

    currentWorld = World.fromJSON(map);
    webview.loadWorld(currentWorld);
    webview.setStatus("stopped", "Ready");

    // Reset interpreter if active
    if (currentInterpreter) {
      currentInterpreter.reset();
      currentSourceDocument = null;
    }

    vscode.window.showInformationMessage(UIMessages.mapReloaded(filename));
    outputChannel.appendLine(UIMessages.mapReloaded(filename));
  } catch (error) {
    if (error instanceof Error) {
      const errorMsg = UIMessages.mapReloadError(filename, error.message);
      vscode.window.showErrorMessage(errorMsg);
      outputChannel.appendLine(errorMsg);
    }
  }
}

/**
 * Prompt user to select a map file.
 */
async function promptForMapFile(context: vscode.ExtensionContext): Promise<boolean> {
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    filters: {
      "Karel Maps": ["klm"],
    },
    title: UIMessages.selectMapFile(),
  };

  const fileUri = await vscode.window.showOpenDialog(options);

  if (fileUri && fileUri[0]) {
    const content = fs.readFileSync(fileUri[0].fsPath, "utf-8");
    try {
      const map: KarelMap = JSON.parse(content);
      currentWorld = World.fromJSON(map);

      const webview = WebviewProvider.createOrShow(context.extensionUri);
      webview.loadWorld(currentWorld);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Failed to load map: ${error.message}`);
      }
    }
  }

  return false;
}

/**
 * Prompt user to select a Karel instructions file.
 */
async function promptForInstructionsFile(context: vscode.ExtensionContext): Promise<boolean> {
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
    currentSourceDocument = document;
    return true;
  }

  return false;
}

/**
 * Convert an ASCII map file to .klm format.
 */
async function convertAsciiMap(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No file open to convert");
    return;
  }

  const content = editor.document.getText();
  const lines = content.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    vscode.window.showWarningMessage("Empty file");
    return;
  }

  try {
    const map = parseAsciiMap(lines);

    // Generate output filename
    const inputPath = editor.document.uri.fsPath;
    const outputPath = inputPath.replace(/\.[^.]+$/, ".klm");

    // Write converted file
    fs.writeFileSync(outputPath, JSON.stringify(map, null, 2));

    // Open the converted file
    const doc = await vscode.workspace.openTextDocument(outputPath);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);

    vscode.window.showInformationMessage(UIMessages.conversionComplete(path.basename(outputPath)));
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Conversion failed: ${error.message}`);
    }
  }
}
