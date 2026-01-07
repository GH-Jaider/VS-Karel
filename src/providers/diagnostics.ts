/**
 * Diagnostics Provider for Karel instruction files.
 *
 * Provides error highlighting that can be toggled on/off.
 */

import * as vscode from "vscode";
import { Parser, Diagnostic as KarelDiagnostic } from "../interpreter";

export class DiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection("karel");

    // Listen for document changes
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId === "karel-instructions") {
          this.updateDiagnostics(e.document);
        }
      })
    );

    // Listen for document open
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.languageId === "karel-instructions") {
          this.updateDiagnostics(doc);
        }
      })
    );

    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("vs-karel.enableErrorHighlighting")) {
          this.refreshAllDocuments();
        }
      })
    );

    // Process already open documents
    vscode.workspace.textDocuments.forEach((doc) => {
      if (doc.languageId === "karel-instructions") {
        this.updateDiagnostics(doc);
      }
    });
  }

  /**
   * Check if error highlighting is enabled.
   */
  private isEnabled(): boolean {
    return vscode.workspace.getConfiguration("vs-karel").get("enableErrorHighlighting", true);
  }

  /**
   * Update diagnostics for a document.
   */
  updateDiagnostics(document: vscode.TextDocument): void {
    if (!this.isEnabled()) {
      this.diagnosticCollection.set(document.uri, []);
      return;
    }

    const parser = new Parser();
    const { diagnostics } = parser.parse(document.getText());

    const vsDiagnostics = diagnostics.map((d) => this.toVSCodeDiagnostic(d, document));

    this.diagnosticCollection.set(document.uri, vsDiagnostics);
  }

  /**
   * Convert Karel diagnostic to VS Code diagnostic.
   */
  private toVSCodeDiagnostic(
    diagnostic: KarelDiagnostic,
    document: vscode.TextDocument
  ): vscode.Diagnostic {
    const line = Math.max(0, diagnostic.line - 1);
    const lineText = document.lineAt(line).text;
    const startCol = diagnostic.column;
    const endCol = diagnostic.endColumn ?? lineText.length;

    const range = new vscode.Range(
      new vscode.Position(line, startCol),
      new vscode.Position(line, endCol)
    );

    const severity =
      diagnostic.severity === "error"
        ? vscode.DiagnosticSeverity.Error
        : diagnostic.severity === "warning"
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;

    const vsDiag = new vscode.Diagnostic(range, diagnostic.message, severity);
    vsDiag.source = "Karel";

    return vsDiag;
  }

  /**
   * Refresh diagnostics for all open Karel documents.
   */
  refreshAllDocuments(): void {
    this.diagnosticCollection.clear();

    if (this.isEnabled()) {
      vscode.workspace.textDocuments.forEach((doc) => {
        if (doc.languageId === "karel-instructions") {
          this.updateDiagnostics(doc);
        }
      });
    }
  }

  /**
   * Toggle error highlighting on/off.
   */
  async toggle(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration("vs-karel");
    const current = config.get("enableErrorHighlighting", true);
    await config.update("enableErrorHighlighting", !current, vscode.ConfigurationTarget.Global);
    return !current;
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.diagnosticCollection.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
