/**
 * VS Karel Extension - Main Entry Point
 *
 * Karel the Robot IDE for VS Code
 */

import * as vscode from "vscode";

import { DiagnosticsProvider } from "@/providers";
import { StateManager } from "@/services";
import * as commands from "@/commands";

/**
 * Extension activation.
 */
export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("Karel");

  // Create execution line decoration (theme-aware, debugger-style)
  const executionLineDecoration = vscode.window.createTextEditorDecorationType({
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

  // Initialize state manager
  StateManager.initialize(outputChannel, executionLineDecoration);

  // Initialize diagnostics provider
  const diagnosticsProvider = new DiagnosticsProvider();
  context.subscriptions.push(diagnosticsProvider);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("vs-karel.run", () => commands.runProgram(context)),
    vscode.commands.registerCommand("vs-karel.runFromWebview", () =>
      commands.runFromWebview(context)
    ),
    vscode.commands.registerCommand("vs-karel.changeProgram", () =>
      commands.changeProgram(context)
    ),
    vscode.commands.registerCommand("vs-karel.step", () => commands.stepProgram(context)),
    vscode.commands.registerCommand("vs-karel.stop", () => commands.stopProgram()),
    vscode.commands.registerCommand("vs-karel.reset", () => commands.resetWorld(context)),
    vscode.commands.registerCommand("vs-karel.toggleErrorHighlighting", () =>
      commands.toggleErrorHighlighting(diagnosticsProvider)
    ),
    vscode.commands.registerCommand("vs-karel.openVisualizer", () =>
      commands.openVisualizer(context)
    ),
    vscode.commands.registerCommand("vs-karel.convertMap", () => commands.convertAsciiMap())
  );

  // Auto-open visualizer when opening .klm files
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.languageId === "karel-map") {
        const autoOpen = vscode.workspace
          .getConfiguration("vs-karel")
          .get("autoOpenVisualizer", true);
        if (autoOpen) {
          commands.loadMapFile(doc, context);
        }
      }
    })
  );

  // Reload map when saving .klm files
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId === "karel-map") {
        commands.reloadMapFile(doc, context);
      }
    })
  );

  // Clear execution highlighting when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      const state = StateManager.getInstance();
      // If switched away from the Karel instructions document, clear highlighting
      if (!editor || editor.document !== state.sourceDocument) {
        if (state.sourceDocument) {
          const editors = vscode.window.visibleTextEditors.filter(
            (e) => e.document === state.sourceDocument
          );
          editors.forEach((e) => {
            e.setDecorations(state.executionLineDecoration, []);
          });
        }
      }
    })
  );

  outputChannel.appendLine("VS Karel extension activated");
}

/**
 * Extension deactivation.
 */
export function deactivate(): void {
  const state = StateManager.getInstance();
  state.outputChannel.appendLine("VS Karel extension deactivated");
}
