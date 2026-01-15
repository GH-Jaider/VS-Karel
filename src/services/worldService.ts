/**
 * World Service
 * Manages world loading, parsing, and state
 */

import * as vscode from "vscode";
import { World, KarelMap } from "@/interpreter";

export class WorldService {
  /**
   * Load world from a KarelMap JSON object
   */
  loadFromMap(map: KarelMap): World {
    return World.fromJSON(map);
  }

  /**
   * Parse .klm file content and return World
   */
  parseMapFile(content: string): World {
    try {
      const map = JSON.parse(content) as KarelMap;
      return this.loadFromMap(map);
    } catch (e) {
      throw new Error("Invalid map file format: " + (e as Error).message);
    }
  }

  /**
   * Reset world to initial state
   */
  reset(world: World): void {
    world.reset();
  }

  /**
   * Validate map structure
   */
  validateMap(map: unknown): map is KarelMap {
    if (typeof map !== "object" || map === null) {
      return false;
    }

    const m = map as Partial<KarelMap>;

    return (
      typeof m.dimensions === "object" &&
      typeof m.dimensions?.width === "number" &&
      typeof m.dimensions?.height === "number" &&
      typeof m.karel === "object" &&
      typeof m.karel?.x === "number" &&
      typeof m.karel?.y === "number" &&
      typeof m.karel?.facing === "string" &&
      typeof m.karel?.beepers === "number" &&
      Array.isArray(m.beepers) &&
      Array.isArray(m.walls)
    );
  }
}
