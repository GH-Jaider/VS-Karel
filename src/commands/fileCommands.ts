/**
 * File Commands
 * Handles file operations: change program, convert map
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { StateManager } from "@/services";
import { UIMessages } from "@/i18n/messages";
import { parseAsciiMap } from "@/utils";

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

/**
 * Convert an ASCII map file to .klm format.
 */
export async function convertAsciiMap(): Promise<void> {
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
