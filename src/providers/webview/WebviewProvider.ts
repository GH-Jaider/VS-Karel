/**
 * Webview Provider for Karel World Visualization.
 *
 * Renders the Karel world in an interactive canvas panel.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { World, KarelMap } from "@/interpreter";

export class WebviewProvider {
  public static currentPanel: WebviewProvider | undefined;

  private readonly panel: vscode.WebviewPanel;
  private world: World | null = null;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri
  ) {
    this.panel = panel;

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      null,
      this.disposables
    );

    // Set initial HTML
    this.panel.webview.html = this.getHtmlContent();
  }

  /**
   * Create or show the webview panel.
   */
  public static createOrShow(extensionUri: vscode.Uri): WebviewProvider {
    const column = vscode.ViewColumn.Beside;

    // If panel exists, show it
    if (WebviewProvider.currentPanel) {
      WebviewProvider.currentPanel.panel.reveal(column);
      return WebviewProvider.currentPanel;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel("karelWorld", "Karel World", column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
    });

    WebviewProvider.currentPanel = new WebviewProvider(panel, extensionUri);
    return WebviewProvider.currentPanel;
  }

  /**
   * Load a world into the visualizer.
   */
  public loadWorld(world: World): void {
    this.world = world;
    this.updateView();
  }

  /**
   * Load a world from a KarelMap object.
   */
  public loadMap(map: KarelMap): void {
    this.world = World.fromJSON(map);
    this.updateView();
  }

  /**
   * Update the visualization.
   */
  public updateView(): void {
    if (!this.world) {
      return;
    }

    this.panel.webview.postMessage({
      type: "updateWorld",
      data: this.world.toJSON(),
      isModified: this.world.isModified,
    });
  }

  /**
   * Highlight current execution line.
   */
  public highlightLine(line: number): void {
    this.panel.webview.postMessage({
      type: "highlightLine",
      line,
    });
  }

  /**
   * Show execution status.
   */
  public setStatus(
    status: "running" | "stopped" | "completed" | "error" | "stepping",
    message?: string
  ): void {
    this.panel.webview.postMessage({
      type: "status",
      status,
      message,
    });
  }

  /**
   * Handle messages from the webview.
   */
  private handleMessage(message: { command: string; data?: unknown }): void {
    switch (message.command) {
      case "run":
        vscode.commands.executeCommand("vs-karel.runFromWebview");
        break;
      case "changeProgram":
        vscode.commands.executeCommand("vs-karel.changeProgram");
        break;
      case "step":
        vscode.commands.executeCommand("vs-karel.step");
        break;
      case "stop":
        vscode.commands.executeCommand("vs-karel.stop");
        break;
      case "reset":
        vscode.commands.executeCommand("vs-karel.reset");
        break;
      case "speedChange":
        const speed = message.data as number;
        vscode.workspace
          .getConfiguration("vs-karel")
          .update("executionSpeed", speed, vscode.ConfigurationTarget.Global);
        break;
    }
  }

  /**
   * Generate HTML content for the webview.
   * Loads from external HTML file and injects resource URIs.
   */
  private getHtmlContent(): string {
    const htmlPath = path.join(this.extensionUri.fsPath, "media", "webview.html");
    const htmlContent = fs.readFileSync(htmlPath, "utf8");

    // Get URIs for resources
    const styleUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "webview.css")
    );
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "webview.js")
    );

    // Get CSP source
    const cspSource = this.panel.webview.cspSource;

    // Replace placeholders
    return htmlContent
      .replace(/\{\{styleUri\}\}/g, styleUri.toString())
      .replace(/\{\{scriptUri\}\}/g, scriptUri.toString())
      .replace(/\{\{cspSource\}\}/g, cspSource);
  }

  /**
   * Dispose of resources.
   */
  public dispose(): void {
    WebviewProvider.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
