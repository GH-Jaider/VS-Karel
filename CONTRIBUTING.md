# Contributing to VS-Karel

Welcome! This guide will help you get started working on the VS-Karel extension.

## Prerequisites

- **Node.js** (v18 or later)
- **pnpm** (recommended package manager)
- **Visual Studio Code** (v1.106.0 or later)

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd VS-Karel
pnpm install
```

### 2. Development Workflow

```bash
# Start webpack in watch mode (builds automatically on file changes)
pnpm run watch

# In VS Code: Press F5 to launch Extension Development Host
# This opens a new VS Code window with the extension loaded
```

### 3. Testing Your Changes

1. Open the Extension Development Host window (F5)
2. Open a `.kli` file from the `examples/` folder
3. Test commands:
   - `Ctrl+Shift+R` - Run program
   - `Ctrl+Shift+S` - Step through program
   - `Ctrl+Shift+P` → "Karel" - See all commands

### 4. Build for Production

```bash
pnpm run compile     # Production build
pnpm run vscode:prepublish  # Build VSIX package
```

---

## Project Structure

```
VS-Karel/
├── src/
│   ├── extension.ts          # Entry point - register commands here
│   ├── commands/             # Command handlers
│   │   ├── executionCommands.ts  # Run/Step/Stop
│   │   ├── fileCommands.ts       # File selection
│   │   ├── worldCommands.ts      # World management
│   │   └── uiCommands.ts         # UI controls
│   ├── interpreter/          # Core language (NO VS Code imports)
│   │   ├── execution/
│   │   │   ├── interpreter.ts    # Program execution
│   │   │   └── executionFrame.ts # Call stack frames
│   │   ├── parsing/
│   │   │   ├── constants.ts      # Valid conditions, built-ins
│   │   │   ├── lexer.ts          # Tokenization
│   │   │   └── parser.ts         # AST generation
│   │   ├── types/                # Type definitions
│   │   ├── karel.ts              # Robot state
│   │   └── world.ts              # World model
│   ├── providers/            # VS Code integration
│   │   ├── diagnostics.ts        # Error highlighting
│   │   └── webview/
│   │       └── WebviewProvider.ts  # Canvas visualization
│   ├── services/             # Business logic orchestration
│   │   ├── executionService.ts   # Execution flow
│   │   ├── fileService.ts        # File operations
│   │   ├── stateManager.ts       # Global state (singleton)
│   │   └── worldService.ts       # World loading
│   ├── ui/
│   │   └── executionDecorator.ts # Line highlighting
│   ├── utils/
│   │   └── mapConverter.ts       # ASCII → .klm converter
│   └── i18n/
│       └── messages.ts           # Translations
├── media/                    # Webview assets
│   ├── webview.html
│   ├── webview.css
│   └── webview.js
├── syntaxes/                 # Language grammars
│   ├── kli.tmLanguage.json   # Karel instructions
│   └── klm.tmLanguage.json   # Karel maps
└── examples/                 # Sample programs/worlds
```

---

## Architecture Principles

### 1. **Separation of Concerns**

**`interpreter/` is VS Code-agnostic:**

```typescript
// ✅ Good - pure TypeScript
export class Interpreter {
  execute(ast: ASTNode): void {
    /* ... */
  }
}

// ❌ Bad - VS Code dependency in interpreter
import * as vscode from "vscode";
```

**VS Code integration lives in `providers/` and `commands/`:**

```typescript
// ✅ Good - in providers/diagnostics.ts
import * as vscode from "vscode";
import { Parser } from "../interpreter";
```

### 2. **Barrel Exports**

Each module has an `index.ts` that exports **only the public API**:

```typescript
// src/interpreter/index.ts
export { Interpreter } from "./execution/interpreter";
export { Parser } from "./parsing/parser";
export { World } from "./world";
export { Karel } from "./karel";
export type { Diagnostic } from "./types/errors";

// Don't export: Lexer, Token, internal helpers
```

### 3. **State Management**

Use `StateManager` (singleton) for shared state:

```typescript
import { StateManager } from "../services";

const state = StateManager.getInstance();
state.setWorld(world);
state.getWorld()?.reset();
```

---

## Common Tasks

### Adding a New Command

1. **Create command handler** in `src/commands/`:

```typescript
// src/commands/myCommands.ts
import * as vscode from "vscode";
import { t } from "../i18n/messages";

export function registerMyCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("vs-karel.myCommand", async () => {
      vscode.window.showInformationMessage(t("My command executed"));
    })
  );
}
```

2. **Export from barrel**:

```typescript
// src/commands/index.ts
export * from "./myCommands";
```

3. **Register in extension.ts**:

```typescript
// src/extension.ts
import { registerMyCommands } from "./commands";

export function activate(context: vscode.ExtensionContext) {
  // ...existing code...
  registerMyCommands(context);
}
```

4. **Add to package.json**:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "vs-karel.myCommand",
        "title": "%commands.myCommand%",
        "category": "Karel"
      }
    ]
  }
}
```

5. **Add localized string** to `package.nls.json`:

```json
{
  "commands.myCommand": "My Command"
}
```

### Adding Interpreter Features

1. **Modify parser/interpreter** in `src/interpreter/`:

```typescript
// src/interpreter/parsing/parser.ts
private parseNewStatement(): ASTNode {
  // Add new language construct
}
```

2. **Update interpreter execution**:

```typescript
// src/interpreter/execution/interpreter.ts
private executeNewStatement(node: NewStatementNode): void {
  // Implement behavior
}
```

3. **NO VS Code imports** - keep it pure TypeScript

### Adding UI Features

1. **Modify webview** HTML/CSS/JS in `media/`:

```javascript
// media/webview.js
function newVisualizationFeature() {
  // Update canvas rendering
}
```

2. **Update WebviewProvider** communication:

```typescript
// src/providers/webview/WebviewProvider.ts
public updateVisualization(data: any): void {
  this.panel.webview.postMessage({
    command: 'newFeature',
    data: data
  });
}
```

---

## Internationalization (i18n)

**Always use the `t()` function for user-facing strings:**

```typescript
import { t, UIMessages, ErrorMessages } from "../i18n/messages";

// Simple strings
vscode.window.showErrorMessage(t("Cannot run program"));

// Parameterized messages (use factory functions)
vscode.window.showInformationMessage(UIMessages.mapLoaded(filename));

// Error messages
throw new RuntimeError(ErrorMessages.moveBlocked(), line);
```

**Add new messages to `src/i18n/messages.ts`**:

```typescript
export const UIMessages = {
  // ...existing code...
  myNewMessage: (param: string) => t(`My message: ${param}`),
};
```

---

## Code Style

### Imports Order

```typescript
// 1. Node/VS Code modules
import * as vscode from "vscode";
import * as path from "path";

// 2. Internal modules
import { Interpreter } from "./interpreter";
import { StateManager } from "./services";

// 3. Utilities
import { t } from "./i18n/messages";
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `camelCase`

### Error Handling

```typescript
// ✅ Good - custom error with i18n
throw new RuntimeError(ErrorMessages.invalidPosition(x, y), line);

// ❌ Bad - hardcoded string
throw new Error(`Invalid position: ${x}, ${y}`);
```

---

## Coordinate System

- **1-based coordinates**: (1,1) is bottom-left
- **Y-axis increases upward** (flipped for canvas rendering)
- **Direction enum**: `Direction.North`, `Direction.West`, `Direction.South`, `Direction.East`

```typescript
// Example: Karel at (3, 2) facing North with 0 beepers
const karel = new Karel(3, 2, Direction.North, 0);
```

---

## World Model

**Walls are connections between cells, not cell properties:**

```typescript
// Wall between (4,3) and (4,4)
world.addWall({ x: 4, y: 3 }, { x: 4, y: 4 });

// Walls are bidirectional - order doesn't matter
```

---

## Debugging

### Extension Debugging

1. Set breakpoints in `src/` files
2. Press F5 to start debugging
3. Breakpoints hit in Extension Development Host

### Webview Debugging

1. In Extension Development Host: `Ctrl+Shift+P` → "Developer: Open Webview Developer Tools"
2. Debug `media/webview.js` in DevTools console

### Output Channel

```typescript
import { StateManager } from "./services";

const output = StateManager.getInstance().getOutputChannel();
output.appendLine("Debug message");
```

---

## Linting & Formatting

```bash
pnpm run lint        # Check for issues
pnpm run lint:fix    # Auto-fix issues
pnpm run format      # Format with Prettier
```

**Pre-commit**: Run linting before pushing changes.

---

## Building VSIX Package

```bash
pnpm run vscode:prepublish  # Creates .vsix file
```

Only these files are included:

- `dist/` (compiled code)
- `syntaxes/` (language grammars)
- `media/` (webview assets)
- `l10n/` (translations)
- `package.json`, `README.md`, `LICENSE`

Source files (`src/`, `tsconfig.json`, etc.) are excluded.

---

## Common Pitfalls

1. **Don't import VS Code in `interpreter/`**
   - Keep language processing pure TypeScript
2. **Don't hardcode strings**
   - Always use `t()` for user-facing text
3. **Don't forget barrel exports**
   - Update `index.ts` when adding new modules
4. **Don't expose internal APIs**
   - Only export what's used by other modules

5. **Don't modify state directly**
   - Use `StateManager` for shared state

---

## Questions?

- Review `README.md` for user documentation
- Look at existing code in `src/` for patterns

Happy coding! 🤖
