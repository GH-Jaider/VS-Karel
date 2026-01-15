# VS-Karel

A Visual Studio Code extension for Karel the Robot, an educational programming language for teaching fundamental programming concepts.

## Features

- Syntax highlighting for instruction (`.kli`) and map (`.klm`) files
- Real-time error detection with inline diagnostics
- Interactive canvas-based world visualizer
- Step-by-step execution with line highlighting
- Configurable execution speed

## Installation

Install from VSIX:

1. Download the `.vsix` package
2. Run `Extensions: Install from VSIX...` from the Command Palette
3. Select the downloaded file

## Usage

### Keyboard Shortcuts

| Shortcut         | Action                    |
| ---------------- | ------------------------- |
| `Ctrl+Shift+R`   | Run program               |
| `Ctrl+Shift+S`   | Step through program      |
| `Ctrl+Shift+K E` | Toggle error highlighting |

### Commands

All commands are available via `Ctrl+Shift+P` under the "Karel" category:

- Run Karel Program
- Step Through Program
- Stop Execution
- Reset World
- Open World Visualizer
- Convert ASCII Map to KLM

## File Formats

### Instructions (`.kli`)

```
BEGINNING-OF-PROGRAM
    DEFINE-NEW-INSTRUCTION turnright AS
    BEGIN
        turnleft;
        turnleft;
        turnleft
    END

    BEGINNING-OF-EXECUTION
        move;
        turnleft;
        ITERATE 3 TIMES
        BEGIN
            move
        END
        turnoff
    END-OF-EXECUTION
END-OF-PROGRAM
```

**Built-in instructions:** `move`, `turnleft`, `pickbeeper`, `putbeeper`, `turnoff`

**Control structures:** `IF/THEN/ELSE`, `WHILE/DO`, `ITERATE/TIMES`, `DEFINE-NEW-INSTRUCTION`

**Conditions:** `front-is-clear`, `front-is-blocked`, `left-is-clear`, `left-is-blocked`, `right-is-clear`, `right-is-blocked`, `next-to-a-beeper`, `not-next-to-a-beeper`, `facing-north`, `facing-south`, `facing-east`, `facing-west`, `not-facing-north`, `not-facing-south`, `not-facing-east`, `not-facing-west`, `beeper-in-bag`

### World Maps (`.klm`)

```json
{
  "dimensions": { "width": 10, "height": 8 },
  "karel": { "x": 1, "y": 1, "facing": "north", "beepers": 5 },
  "beepers": [{ "x": 3, "y": 3, "count": 2 }],
  "walls": [{ "from": { "x": 4, "y": 3 }, "to": { "x": 4, "y": 4 } }]
}
```

- Coordinates are 1-based with (1,1) at the bottom-left
- Direction values: `north`, `south`, `east`, `west`
- Walls are defined as blocked connections between adjacent cells

## Configuration

| Setting                            | Default | Description                         |
| ---------------------------------- | ------- | ----------------------------------- |
| `vs-karel.enableErrorHighlighting` | `true`  | Enable inline error highlighting    |
| `vs-karel.executionSpeed`          | `500`   | Delay between steps in ms (50-2000) |
| `vs-karel.autoOpenVisualizer`      | `true`  | Auto-open visualizer on run         |

## Development

```bash
pnpm install
pnpm run watch
```

Press `F5` to launch the Extension Development Host.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
