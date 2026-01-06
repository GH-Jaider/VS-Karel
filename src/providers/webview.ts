/**
 * Webview Provider for Karel World Visualization.
 *
 * Renders the Karel world in an interactive canvas panel.
 */

import * as vscode from "vscode";
import { World, KarelMap, Direction, DirectionNames } from "../interpreter";

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
    const panel = vscode.window.createWebviewPanel(
      "karelWorld",
      "Karel World",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

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
  public setStatus(status: "running" | "stopped" | "completed" | "error" | "stepping", message?: string): void {
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
        vscode.commands.executeCommand("vs-karel.run");
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
   */
  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Karel World</title>
    <style>
        :root {
            --bg-color: var(--vscode-editor-background);
            --fg-color: var(--vscode-editor-foreground);
            --border-color: var(--vscode-panel-border);
            --button-bg: var(--vscode-button-background);
            --button-fg: var(--vscode-button-foreground);
            --button-hover: var(--vscode-button-hoverBackground);
            --cell-bg: var(--vscode-editor-background);
            --wall-color: #666;
            --beeper-color: #f0c040;
            --karel-color: #4080f0;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--vscode-font-family);
            background: var(--bg-color);
            color: var(--fg-color);
            padding: 16px;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        .toolbar {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
            align-items: center;
        }

        button {
            background: var(--button-bg);
            color: var(--button-fg);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        button:hover {
            background: var(--button-hover);
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .speed-control {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
        }

        .speed-control input {
            width: 100px;
        }

        .status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }

        .status.running {
            background: #2d5a27;
        }

        .status.stopped {
            background: #5a4527;
        }

        .status.error {
            background: #5a2727;
        }

        .canvas-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: auto;
        }

        #worldCanvas {
            border: 2px solid var(--border-color);
            background: var(--cell-bg);
        }

        .info-panel {
            margin-top: 16px;
            padding: 12px;
            background: var(--vscode-sideBar-background);
            border-radius: 4px;
            font-size: 13px;
        }

        .info-panel .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }

        .info-panel .label {
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button id="runBtn" title="Run (Ctrl+Shift+R)">
            ▶ Run
        </button>
        <button id="stepBtn" title="Step (Ctrl+Shift+S)">
            ⏭ Step
        </button>
        <button id="stopBtn" title="Stop" disabled>
            ⏹ Stop
        </button>
        <button id="resetBtn" title="Reset">
            ↺ Reset
        </button>
        <span id="status" class="status">Ready</span>
        <div class="speed-control">
            <label for="speed">Speed:</label>
            <input type="range" id="speed" min="50" max="1000" value="500" step="50">
            <span id="speedValue">500ms</span>
        </div>
    </div>

    <div class="canvas-container">
        <canvas id="worldCanvas" width="600" height="400"></canvas>
    </div>

    <div class="info-panel">
        <div class="row">
            <span class="label">Position:</span>
            <span id="position">(1, 1)</span>
        </div>
        <div class="row">
            <span class="label">Facing:</span>
            <span id="facing">North</span>
        </div>
        <div class="row">
            <span class="label">Beepers in Bag:</span>
            <span id="beepers">0</span>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const canvas = document.getElementById('worldCanvas');
        const ctx = canvas.getContext('2d');

        // World state
        let world = null;
        const CELL_SIZE = 40;
        const WALL_WIDTH = 4;

        // UI Elements
        const runBtn = document.getElementById('runBtn');
        const stepBtn = document.getElementById('stepBtn');
        const stopBtn = document.getElementById('stopBtn');
        const resetBtn = document.getElementById('resetBtn');
        const statusEl = document.getElementById('status');
        const speedSlider = document.getElementById('speed');
        const speedValue = document.getElementById('speedValue');

        // Button handlers
        runBtn.addEventListener('click', () => vscode.postMessage({ command: 'run' }));
        stepBtn.addEventListener('click', () => vscode.postMessage({ command: 'step' }));
        stopBtn.addEventListener('click', () => vscode.postMessage({ command: 'stop' }));
        resetBtn.addEventListener('click', () => vscode.postMessage({ command: 'reset' }));

        speedSlider.addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            speedValue.textContent = speed + 'ms';
            vscode.postMessage({ command: 'speedChange', data: speed });
        });

        // Handle messages from extension
        window.addEventListener('message', (event) => {
            const message = event.data;

            switch (message.type) {
                case 'updateWorld':
                    world = message.data;
                    render();
                    updateInfoPanel();
                    break;
                case 'status':
                    setStatus(message.status, message.message);
                    break;
                case 'highlightLine':
                    // Could highlight line number in info panel
                    break;
            }
        });

        function setStatus(status, message) {
            statusEl.className = 'status ' + status;
            statusEl.textContent = message || status.charAt(0).toUpperCase() + status.slice(1);

            const isRunning = status === 'running';
            runBtn.disabled = isRunning;
            stepBtn.disabled = isRunning;
            stopBtn.disabled = !isRunning;
        }

        function updateInfoPanel() {
            if (!world) return;

            document.getElementById('position').textContent =
                '(' + world.karel.x + ', ' + world.karel.y + ')';

            const directions = ['North', 'West', 'South', 'East'];
            document.getElementById('facing').textContent =
                directions[world.karel.facing];

            document.getElementById('beepers').textContent =
                world.karel.beepers.toString();
        }

        function render() {
            if (!world) return;

            const { width, height } = world.dimensions;

            // Resize canvas
            canvas.width = width * CELL_SIZE + WALL_WIDTH * 2;
            canvas.height = height * CELL_SIZE + WALL_WIDTH * 2;

            // Clear
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--cell-bg') || '#1e1e1e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw grid
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;

            for (let x = 0; x <= width; x++) {
                ctx.beginPath();
                ctx.moveTo(x * CELL_SIZE + WALL_WIDTH, WALL_WIDTH);
                ctx.lineTo(x * CELL_SIZE + WALL_WIDTH, height * CELL_SIZE + WALL_WIDTH);
                ctx.stroke();
            }

            for (let y = 0; y <= height; y++) {
                ctx.beginPath();
                ctx.moveTo(WALL_WIDTH, y * CELL_SIZE + WALL_WIDTH);
                ctx.lineTo(width * CELL_SIZE + WALL_WIDTH, y * CELL_SIZE + WALL_WIDTH);
                ctx.stroke();
            }

            // Draw beepers
            ctx.fillStyle = '#f0c040';
            for (const beeper of world.beepers) {
                const cx = (beeper.x - 0.5) * CELL_SIZE + WALL_WIDTH;
                const cy = (height - beeper.y + 0.5) * CELL_SIZE + WALL_WIDTH;

                ctx.beginPath();
                ctx.arc(cx, cy, CELL_SIZE / 4, 0, Math.PI * 2);
                ctx.fill();

                // Show count if > 1
                if (beeper.count > 1) {
                    ctx.fillStyle = '#000';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(beeper.count.toString(), cx, cy);
                    ctx.fillStyle = '#f0c040';
                }
            }

            // Draw walls
            ctx.strokeStyle = '#888';
            ctx.lineWidth = WALL_WIDTH;
            ctx.lineCap = 'round';

            for (const wall of world.walls) {
                const { from, to } = wall;

                // Determine wall orientation and position
                const x1 = (from.x - 0.5) * CELL_SIZE + WALL_WIDTH;
                const y1 = (height - from.y + 0.5) * CELL_SIZE + WALL_WIDTH;
                const x2 = (to.x - 0.5) * CELL_SIZE + WALL_WIDTH;
                const y2 = (height - to.y + 0.5) * CELL_SIZE + WALL_WIDTH;

                // Draw wall at midpoint perpendicular to direction
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;

                ctx.beginPath();
                if (from.x === to.x) {
                    // Horizontal wall (cells are vertically adjacent)
                    ctx.moveTo(mx - CELL_SIZE / 2, my);
                    ctx.lineTo(mx + CELL_SIZE / 2, my);
                } else {
                    // Vertical wall (cells are horizontally adjacent)
                    ctx.moveTo(mx, my - CELL_SIZE / 2);
                    ctx.lineTo(mx, my + CELL_SIZE / 2);
                }
                ctx.stroke();
            }

            // Draw border walls
            ctx.strokeStyle = '#666';
            ctx.lineWidth = WALL_WIDTH;
            ctx.strokeRect(WALL_WIDTH / 2, WALL_WIDTH / 2,
                width * CELL_SIZE + WALL_WIDTH,
                height * CELL_SIZE + WALL_WIDTH);

            // Draw Karel
            drawKarel(world.karel, height);
        }

        function drawKarel(karel, worldHeight) {
            const cx = (karel.x - 0.5) * CELL_SIZE + WALL_WIDTH;
            const cy = (worldHeight - karel.y + 0.5) * CELL_SIZE + WALL_WIDTH;
            const size = CELL_SIZE * 0.7;

            ctx.save();
            ctx.translate(cx, cy);

            // Rotate based on facing direction
            // Canvas rotation is clockwise for positive values
            // N=0°, W=-90° (or 270°), S=180°, E=90°
            const rotations = [0, -Math.PI / 2, Math.PI, Math.PI / 2]; // N, W, S, E
            ctx.rotate(rotations[karel.facing]);

            // Draw Karel as a triangle pointing up (north)
            ctx.fillStyle = '#4080f0';
            ctx.beginPath();
            ctx.moveTo(0, -size / 2);
            ctx.lineTo(-size / 3, size / 3);
            ctx.lineTo(size / 3, size / 3);
            ctx.closePath();
            ctx.fill();

            // Draw outline
            ctx.strokeStyle = '#2060d0';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.restore();
        }

        // Initial render with empty world
        render();
    </script>
</body>
</html>`;
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
