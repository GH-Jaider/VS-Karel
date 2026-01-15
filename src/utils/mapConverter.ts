/**
 * ASCII Map to KarelMap Converter
 *
 * Converts ASCII art maps to the JSON-based .klm format.
 */

import type { KarelMap } from "@/interpreter";

/**
 * Parse an ASCII map into KarelMap format.
 *
 * Supported characters:
 * - ^ v < > : Karel facing north, south, west, east
 * - * : Beeper
 * - # : Wall cell (creates walls to adjacent non-wall cells)
 * - . or space : Empty cell
 */
export function parseAsciiMap(lines: string[]): KarelMap {
  const height = lines.length;
  const width = Math.max(...lines.map((l) => l.length));

  const map: KarelMap = {
    dimensions: { width, height },
    karel: { x: 1, y: 1, facing: 0, beepers: 0 },
    beepers: [],
    walls: [],
  };

  let karelFound = false;

  for (let row = 0; row < height; row++) {
    const line = lines[row];
    const y = height - row; // Convert to bottom-up coordinates

    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      const x = col + 1; // 1-based coordinates

      switch (char) {
        case "^": // Karel facing north
          map.karel = { x, y, facing: 0, beepers: 0 };
          karelFound = true;
          break;
        case "<": // Karel facing west
          map.karel = { x, y, facing: 1, beepers: 0 };
          karelFound = true;
          break;
        case "v": // Karel facing south
          map.karel = { x, y, facing: 2, beepers: 0 };
          karelFound = true;
          break;
        case ">": // Karel facing east
          map.karel = { x, y, facing: 3, beepers: 0 };
          karelFound = true;
          break;
        case "*": {
          // Beeper
          const existing = map.beepers.find((b) => b.x === x && b.y === y);
          if (existing) {
            existing.count++;
          } else {
            map.beepers.push({ x, y, count: 1 });
          }
          break;
        }
        case "#": // Wall - add walls around this cell
          // Add walls to adjacent non-wall cells
          if (x > 1 && line[col - 1] !== "#") {
            map.walls.push({ from: { x: x - 1, y }, to: { x, y } });
          }
          if (x < width && (line[col + 1] ?? ".") !== "#") {
            map.walls.push({ from: { x, y }, to: { x: x + 1, y } });
          }
          if (y > 1 && row + 1 < height && (lines[row + 1][col] ?? ".") !== "#") {
            map.walls.push({ from: { x, y }, to: { x, y: y - 1 } });
          }
          if (y < height && row > 0 && (lines[row - 1][col] ?? ".") !== "#") {
            map.walls.push({ from: { x, y: y + 1 }, to: { x, y } });
          }
          break;
      }
    }
  }

  if (!karelFound) {
    throw new Error("No Karel position found in map (use ^, v, <, or >)");
  }

  // Remove duplicate walls
  const wallSet = new Set<string>();
  map.walls = map.walls.filter((wall) => {
    const key = `${Math.min(wall.from.x, wall.to.x)},${Math.min(wall.from.y, wall.to.y)}-${Math.max(wall.from.x, wall.to.x)},${Math.max(wall.from.y, wall.to.y)}`;
    if (wallSet.has(key)) {
      return false;
    }
    wallSet.add(key);
    return true;
  });

  return map;
}
