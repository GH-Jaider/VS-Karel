/**
 * File Commands
 * Handles file operations: change program
 */

import * as vscode from "vscode";
import { StateManager } from "@/services";
import { UIMessages } from "@/i18n/messages";

/**
 * Change the program file to execute from webview.
 */
export async function changeProgram(context: vscode.ExtensionContext): Promise<void> {
  const state = StateManager.getInstance();

  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    filters: {
      "Karel Instructions": ["kli"],
    },
    title: "Select Karel Instructions File",
  };

  const fileUri = await vscode.window.showOpenDialog(options);

  if (fileUri && fileUri[0]) {
    const document = await vscode.workspace.openTextDocument(fileUri[0]);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    state.sourceDocument = document;

    vscode.window.showInformationMessage(UIMessages.programChanged(document.fileName));
  }
}
