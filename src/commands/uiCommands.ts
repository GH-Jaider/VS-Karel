/**
 * UI Commands
 * Handles UI-related operations: open visualizer, toggle error highlighting
 */

import * as vscode from "vscode";
import { World } from "@/interpreter";
import { DiagnosticsProvider, WebviewProvider } from "@/providers";
import { StateManager } from "@/services";
import { UIMessages } from "@/i18n/messages";
import { loadMapFile } from "@/commands/worldCommands";

/**
 * Toggle error highlighting on/off.
 */
export async function toggleErrorHighlighting(
  diagnosticsProvider: DiagnosticsProvider
): Promise<void> {
  const state = StateManager.getInstance();

  const enabled = await diagnosticsProvider.toggle();
  const message = enabled
    ? UIMessages.errorHighlightingEnabled()
    : UIMessages.errorHighlightingDisabled();
  vscode.window.showInformationMessage(message);
  state.outputChannel.appendLine(message);
}

/**
 * Open the world visualizer.
 */
export async function openVisualizer(context: vscode.ExtensionContext): Promise<void> {
  const state = StateManager.getInstance();
  const editor = vscode.window.activeTextEditor;

  // If viewing a map file, load it
  if (editor && editor.document.languageId === "karel-map") {
    loadMapFile(editor.document, context);
    return;
  }

  // Otherwise, prompt for a map file or create empty world
  if (!state.world) {
    const loaded = await promptForMapFile(context);
    if (!loaded) {
      // Create default empty world
      state.world = World.createEmpty(10, 10);
    }
  }

  const webview = WebviewProvider.createOrShow(context.extensionUri);
  webview.loadWorld(state.world!);
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
