# VS Karel

A VS Code extension for Karel the Robot programming language. Write, visualize, and execute Karel programs with an intuitive graph-based world editor.

![VS Code](https://img.shields.io/badge/VS%20Code-^1.107.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- 🤖 **Full Karel interpreter** written in TypeScript
- 🎨 **Syntax highlighting** for `.kli` (instructions) and `.klm` (maps)
- 🗺️ **Graph-based world representation** - walls are connections between cells, not blocked rows/columns
- 👁️ **Interactive visualizer** - see Karel move in real-time with a canvas-based webview
- 🐛 **Configurable error highlighting** - disable for educational purposes where students identify errors themselves
- 🌍 **i18n ready** - prepared for internationalization
- ⌨️ **Keyboard shortcuts** for quick execution

## File Formats

### Karel Instructions (`.kli`)

```karel
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
        IF front-is-clear THEN
        BEGIN
            move
        END
        turnoff
    END-OF-EXECUTION
END-OF-PROGRAM
```

### Karel Maps (`.klm`)

Graph-based JSON format with walls defined as blocked connections between adjacent cells:

```json
{
  "dimensions": { "width": 10, "height": 8 },
  "karel": { "x": 1, "y": 1, "facing": 0, "beepers": 5 },
  "beepers": [
    { "x": 3, "y": 3, "count": 2 }
  ],
  "walls": [
    { "from": { "x": 4, "y": 3 }, "to": { "x": 4, "y": 4 } }
  ]
}
```

**Direction enum:** `0 = North, 1 = West, 2 = South, 3 = East`

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `Karel: Run` | `Ctrl+Shift+R` | Run the current program |
| `Karel: Step` | `Ctrl+Shift+S` | Step through program |
| `Karel: Stop` | - | Stop execution |
| `Karel: Reset` | - | Reset world to initial state |
| `Karel: Toggle Error Highlighting` | `Ctrl+Shift+K E` | Enable/disable error highlighting |
| `Karel: Open World Visualizer` | - | Open the world visualization panel |
| `Karel: Convert ASCII Map to KLM` | - | Convert old ASCII maps to graph format |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `vs-karel.enableErrorHighlighting` | `true` | Enable/disable error highlighting |
| `vs-karel.executionSpeed` | `500` | Execution speed in ms (50-2000) |
| `vs-karel.autoOpenVisualizer` | `true` | Auto-open visualizer when running |

## Supported Instructions

### Basic Instructions
- `move` - Move forward one cell
- `turnleft` - Turn 90° counter-clockwise
- `pickbeeper` - Pick up a beeper
- `putbeeper` - Put down a beeper
- `turnoff` - End program

### Control Flow
- `IF <condition> THEN BEGIN ... END`
- `IF <condition> THEN BEGIN ... END ELSE BEGIN ... END`
- `WHILE <condition> DO BEGIN ... END`
- `ITERATE <n> TIMES BEGIN ... END`

### Conditions
`front-is-clear`, `front-is-blocked`, `left-is-clear`, `left-is-blocked`, `right-is-clear`, `right-is-blocked`, `next-to-a-beeper`, `not-next-to-a-beeper`, `facing-north`, `not-facing-north`, `facing-south`, `not-facing-south`, `facing-east`, `not-facing-east`, `facing-west`, `not-facing-west`, `beeper-in-bag`

### Custom Instructions
```karel
DEFINE-NEW-INSTRUCTION turnright AS
BEGIN
    turnleft;
    turnleft;
    turnleft
END
```

## Development

```bash
cd vs-karel
pnpm install
pnpm run watch    # Development mode
pnpm run compile  # Production build
pnpm run lint     # Run linter
```

Press `F5` in VS Code to launch the Extension Development Host.

## License

MIT License - see [LICENSE](./LICENSE)
