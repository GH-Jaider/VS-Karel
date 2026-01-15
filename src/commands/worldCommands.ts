/**
 * World Commands
 * Handles world-related operations: reset, load, reload
 */

import * as vscode from "vscode";
import * as path from "path";
import { World, KarelMap } from "@/interpreter";
import { WebviewProvider } from "@/providers";
import { StateManager } from "@/services";
import { UIMessages, t } from "@/i18n/messages";

/**
 * Reset the world to initial state.
 */
export function resetWorld(context: vscode.ExtensionContext): void {
  const state = StateManager.getInstance();

  if (state.world) {
    state.world.reset();
    const webview = WebviewProvider.currentPanel;
    if (webview) {
      webview.loadWorld(state.world);
      webview.setStatus("stopped", "Ready");
    }
  }
  if (state.interpreter) {
    state.interpreter.reset();
    clearExecutionHighlight();
  }
  // Keep sourceDocument reference so run/step can reuse it
}

/**
 * Load a .klm map file.
 */
export function loadMapFile(document: vscode.TextDocument, context: vscode.ExtensionContext): void {
  const state = StateManager.getInstance();

  try {
    const content = document.getText();
    const map: KarelMap = JSON.parse(content);

    // Validate map structure
    if (!map.dimensions || !map.karel) {
      throw new Error("Invalid map file: missing dimensions or karel");
    }

    state.world = World.fromJSON(map);

    const webview = WebviewProvider.createOrShow(context.extensionUri);
    webview.loadWorld(state.world);
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Failed to load map: ${error.message}`);
      state.outputChannel.appendLine(`Error loading map: ${error.message}`);
    }
  }
}

/**
 * Reload a .klm map file when saved (only if visualizer is open).
 */
export function reloadMapFile(
  document: vscode.TextDocument,
  context: vscode.ExtensionContext
): void {
  const state = StateManager.getInstance();

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

    state.world = World.fromJSON(map);
    webview.loadWorld(state.world);
    webview.setStatus("stopped", "Ready");

    // Reset interpreter if active
    if (state.interpreter) {
      state.interpreter.reset();
      state.sourceDocument = null;
    }

    vscode.window.showInformationMessage(UIMessages.mapReloaded(filename));
    state.outputChannel.appendLine(UIMessages.mapReloaded(filename));
  } catch (error) {
    if (error instanceof Error) {
      const errorMsg = UIMessages.mapReloadError(filename, error.message);
      vscode.window.showErrorMessage(errorMsg);
      state.outputChannel.appendLine(errorMsg);
    }
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
