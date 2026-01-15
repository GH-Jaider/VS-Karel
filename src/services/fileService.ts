/**
 * File Service
 * Handles file selection and loading operations
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { World, KarelMap } from "@/interpreter";
import { UIMessages } from "@/i18n/messages";

export class FileService {
  private static instance: FileService;

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * Prompt user to select a Karel instruction file (.kli)
   */
  async selectProgramFile(): Promise<vscode.Uri | undefined> {
    const files = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        "Karel Instructions": ["kli"],
      },
      title: UIMessages.selectInstructionsFile(),
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
        "Karel Maps": ["klm"],
      },
      title: UIMessages.selectMapFile(),
    });

    return files?.[0];
  }

  /**
   * Prompt for and load an instructions file, opening it in the editor.
   * Returns the opened document or undefined if cancelled/failed.
   */
  async promptAndOpenInstructionsFile(): Promise<vscode.TextDocument | undefined> {
    const uri = await this.selectProgramFile();
    if (!uri) {
      return undefined;
    }

    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    return document;
  }

  /**
   * Prompt for and load a map file.
   * Returns the World or undefined if cancelled/failed.
   */
  async promptAndLoadMapFile(): Promise<World | undefined> {
    const uri = await this.selectMapFile();
    if (!uri) {
      return undefined;
    }

    try {
      const content = await this.readFile(uri);
      const map: KarelMap = JSON.parse(content);
      return World.fromJSON(map);
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Failed to load map: ${error.message}`);
      }
      return undefined;
    }
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
