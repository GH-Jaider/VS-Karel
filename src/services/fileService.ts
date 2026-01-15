/**
 * File Service
 * Handles file selection and loading operations
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class FileService {
  /**
   * Prompt user to select a Karel instruction file (.kli)
   */
  async selectProgramFile(): Promise<vscode.Uri | undefined> {
    const files = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        "Karel Instructions": ["kli"],
      },
      title: "Select Karel Program",
    });

    return files?.[0];
  }

  /**
   * Prompt user to select a Karel map file (.klm)
   */
  async selectMapFile(): Promise<vscode.Uri | undefined> {
    const files = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        "Karel Map": ["klm"],
      },
      title: "Select Karel World Map",
    });

    return files?.[0];
  }

  /**
   * Read file content as string
   */
  async readFile(uri: vscode.Uri): Promise<string> {
    const content = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(content).toString("utf8");
  }

  /**
   * Check if file exists
   */
  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Get workspace-relative path
   */
  getWorkspaceRelativePath(uri: vscode.Uri): string {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
      return path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
    }
    return path.basename(uri.fsPath);
  }

  /**
   * Open a file in the editor
   */
  async openFile(uri: vscode.Uri): Promise<vscode.TextDocument> {
    return await vscode.workspace.openTextDocument(uri);
  }

  /**
   * Show a file in the editor
   */
  async showFile(document: vscode.TextDocument): Promise<vscode.TextEditor> {
    return await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
  }
}
