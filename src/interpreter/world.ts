/**
 * Karel World - Graph-based representation of Karel's environment.
 *
 * The world is represented as an implicit graph where:
 * - Each cell (x, y) is a node
 * - Walls are defined as blocked connections between adjacent cells
 * - Two cells are connected if there's no wall between them
 */

import { Karel, Position, Direction, DirectionVectors } from "@/interpreter/karel";
import { ErrorMessages } from "@/i18n/messages";

/**
 * Represents a wall between two adjacent cells.
 * Walls are bidirectional: a wall from A to B also blocks B to A.
 */
export interface Wall {
  from: Position;
  to: Position;
}

/**
 * Represents beepers at a specific position.
 */
export interface BeeperStack {
  x: number;
  y: number;
  count: number;
}

/**
 * World dimensions.
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Karel Map file format (.klm)
 */
export interface KarelMap {
  dimensions: Dimensions;
  karel: {
    x: number;
    y: number;
    facing: string;
    beepers: number;
  };
  beepers: BeeperStack[];
  walls: Wall[];
}

/**
 * Generates a unique key for a wall between two positions.
 * Normalizes the order so (A,B) and (B,A) produce the same key.
 */
function wallKey(from: Position, to: Position): string {
  // Sort positions to ensure consistent key regardless of direction
  if (from.x < to.x || (from.x === to.x && from.y < to.y)) {
    return `${from.x},${from.y}|${to.x},${to.y}`;
  }
  return `${to.x},${to.y}|${from.x},${from.y}`;
}

/**
 * Generates a unique key for a position.
 */
function positionKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

/**
 * Check if two positions are adjacent (Manhattan distance = 1).
 */
function areAdjacent(a: Position, b: Position): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

/**
 * Karel's World - manages the environment state.
 */
export class World {
  private _dimensions: Dimensions;
  private _karel: Karel;
  private _beepers: Map<string, number>; // positionKey -> count
  private _walls: Set<string>; // wallKey set

  // Store initial state for reset
  private _initialKarel: Karel;
  private _initialBeepers: Map<string, number>;
  private _isModified: boolean = false;

  constructor(map: KarelMap) {
    this._dimensions = { ...map.dimensions };

    // Initialize Karel
    this._karel = Karel.fromJSON(map.karel);
    this._initialKarel = this._karel.clone();

    // Initialize beepers
    this._beepers = new Map();
    this._initialBeepers = new Map();
    for (const beeper of map.beepers) {
      const key = positionKey({ x: beeper.x, y: beeper.y });
      this._beepers.set(key, beeper.count);
      this._initialBeepers.set(key, beeper.count);
    }

    // Initialize walls with validation
    this._walls = new Set();
    for (const wall of map.walls) {
      this.addWall(wall.from, wall.to);
    }
  }

  /**
   * World dimensions.
   */
  get dimensions(): Dimensions {
    return { ...this._dimensions };
  }

  /**
   * Width of the world.
   */
  get width(): number {
    return this._dimensions.width;
  }

  /**
   * Height of the world.
   */
  get height(): number {
    return this._dimensions.height;
  }

  /**
   * Reference to Karel robot.
   */
  get karel(): Karel {
    return this._karel;
  }

  /**
   * Add a wall between two adjacent cells.
   * Validates that cells are adjacent.
   */
  addWall(from: Position, to: Position): void {
    if (!areAdjacent(from, to)) {
      throw new Error(ErrorMessages.invalidWall(from.x, from.y, to.x, to.y));
    }
    this._walls.add(wallKey(from, to));
  }

  /**
   * Remove a wall between two cells.
   */
  removeWall(from: Position, to: Position): void {
    this._walls.delete(wallKey(from, to));
  }

  /**
   * Check if there's a wall between two adjacent cells.
   */
  hasWall(from: Position, to: Position): boolean {
    return this._walls.has(wallKey(from, to));
  }

  /**
   * Check if a position is within world bounds.
   */
  isInBounds(pos: Position): boolean {
    return (
      pos.x >= 1 &&
      pos.x <= this._dimensions.width &&
      pos.y >= 1 &&
      pos.y <= this._dimensions.height
    );
  }

  /**
   * Check if movement from one position to another is blocked.
   * Blocked if: out of bounds OR wall exists between cells.
   */
  isBlocked(from: Position, to: Position): boolean {
    // Out of bounds is blocked
    if (!this.isInBounds(to)) {
      return true;
    }

    // Check for wall between cells
    return this.hasWall(from, to);
  }

  /**
   * Check if Karel's front is blocked.
   */
  frontIsBlocked(): boolean {
    return this.isBlocked(this._karel.position, this._karel.frontPosition());
  }

  /**
   * Check if Karel's front is clear.
   */
  frontIsClear(): boolean {
    return !this.frontIsBlocked();
  }

  /**
   * Check if Karel's left is blocked.
   */
  leftIsBlocked(): boolean {
    return this.isBlocked(this._karel.position, this._karel.leftPosition());
  }

  /**
   * Check if Karel's left is clear.
   */
  leftIsClear(): boolean {
    return !this.leftIsBlocked();
  }

  /**
   * Check if Karel's right is blocked.
   */
  rightIsBlocked(): boolean {
    return this.isBlocked(this._karel.position, this._karel.rightPosition());
  }

  /**
   * Check if Karel's right is clear.
   */
  rightIsClear(): boolean {
    return !this.rightIsBlocked();
  }

  /**
   * Get beeper count at a position.
   */
  getBeepers(pos: Position): number {
    return this._beepers.get(positionKey(pos)) ?? 0;
  }

  /**
   * Check if there's a beeper at Karel's current position.
   */
  nextToABeeper(): boolean {
    return this.getBeepers(this._karel.position) > 0;
  }

  /**
   * Check if Karel has beepers in bag.
   */
  beeperInBag(): boolean {
    return this._karel.hasBeepersInBag();
  }

  /**
   * Add beepers at a position.
   */
  addBeepers(pos: Position, count: number = 1): void {
    const key = positionKey(pos);
    const current = this._beepers.get(key) ?? 0;
    this._beepers.set(key, current + count);
  }

  /**
   * Remove a beeper from a position.
   * Returns false if no beepers at position.
   */
  removeBeeper(pos: Position): boolean {
    const key = positionKey(pos);
    const current = this._beepers.get(key) ?? 0;
    if (current <= 0) {
      return false;
    }
    if (current === 1) {
      this._beepers.delete(key);
    } else {
      this._beepers.set(key, current - 1);
    }
    return true;
  }

  // ========== Karel Actions ==========

  /**
   * Move Karel forward.
   * Throws if front is blocked.
   */
  move(): void {
    if (this.frontIsBlocked()) {
      throw new Error(ErrorMessages.moveBlocked());
    }
    this._karel.move();
    this._isModified = true;
  }

  /**
   * Turn Karel left (counter-clockwise).
   */
  turnLeft(): void {
    this._karel.turnLeft();
    this._isModified = true;
  }

  /**
   * Pick up a beeper at Karel's current position.
   * Throws if no beeper at position.
   */
  pickBeeper(): void {
    const pos = this._karel.position;
    if (!this.removeBeeper(pos)) {
      throw new Error(ErrorMessages.noBeepersToPickUp(pos.x, pos.y));
    }
    this._karel.pickBeeper();
    this._isModified = true;
  }

  /**
   * Put down a beeper at Karel's current position.
   * Throws if no beepers in Karel's bag.
   */
  putBeeper(): void {
    if (!this._karel.putBeeper()) {
      throw new Error(ErrorMessages.noBeepersInBag());
    }
    this.addBeepers(this._karel.position);
    this._isModified = true;
  }

  // ========== Condition Checking ==========

  /**
   * Evaluate a condition by name.
   */
  evaluateCondition(condition: string): boolean {
    switch (condition.toLowerCase()) {
      case "front-is-clear":
        return this.frontIsClear();
      case "front-is-blocked":
        return this.frontIsBlocked();
      case "left-is-clear":
        return this.leftIsClear();
      case "left-is-blocked":
        return this.leftIsBlocked();
      case "right-is-clear":
        return this.rightIsClear();
      case "right-is-blocked":
        return this.rightIsBlocked();
      case "next-to-a-beeper":
        return this.nextToABeeper();
      case "not-next-to-a-beeper":
        return !this.nextToABeeper();
      case "facing-north":
        return this._karel.isFacing(Direction.North);
      case "not-facing-north":
        return !this._karel.isFacing(Direction.North);
      case "facing-south":
        return this._karel.isFacing(Direction.South);
      case "not-facing-south":
        return !this._karel.isFacing(Direction.South);
      case "facing-east":
        return this._karel.isFacing(Direction.East);
      case "not-facing-east":
        return !this._karel.isFacing(Direction.East);
      case "facing-west":
        return this._karel.isFacing(Direction.West);
      case "not-facing-west":
        return !this._karel.isFacing(Direction.West);
      case "beeper-in-bag":
        return this.beeperInBag();
      default:
        throw new Error(`Unknown condition: ${condition}`);
    }
  }

  // ========== State Management ==========

  /**
   * Reset world to initial state.
   */
  reset(): void {
    // Reset Karel
    this._karel = this._initialKarel.clone();

    // Reset beepers
    this._beepers = new Map(this._initialBeepers);

    // Clear modified flag
    this._isModified = false;
  }

  /**
   * Check if world has been modified from initial state.
   */
  get isModified(): boolean {
    return this._isModified;
  }

  /**
   * Get all beeper positions and counts.
   */
  getAllBeepers(): BeeperStack[] {
    const result: BeeperStack[] = [];
    for (const [key, count] of this._beepers) {
      const [x, y] = key.split(",").map(Number);
      result.push({ x, y, count });
    }
    return result;
  }

  /**
   * Get all walls.
   */
  getAllWalls(): Wall[] {
    const result: Wall[] = [];
    for (const key of this._walls) {
      const [fromStr, toStr] = key.split("|");
      const [fromX, fromY] = fromStr.split(",").map(Number);
      const [toX, toY] = toStr.split(",").map(Number);
      result.push({
        from: { x: fromX, y: fromY },
        to: { x: toX, y: toY },
      });
    }
    return result;
  }

  /**
   * Serialize world state to KarelMap format.
   */
  toJSON(): KarelMap {
    return {
      dimensions: this._dimensions,
      karel: this._karel.toJSON(),
      beepers: this.getAllBeepers(),
      walls: this.getAllWalls(),
    };
  }

  /**
   * Create a World from a KarelMap.
   */
  static fromJSON(map: KarelMap): World {
    return new World(map);
  }

  /**
   * Create an empty world with given dimensions.
   */
  static createEmpty(
    width: number,
    height: number,
    karelX: number = 1,
    karelY: number = 1,
    karelFacing: Direction = Direction.North
  ): World {
    return new World({
      dimensions: { width, height },
      karel: { x: karelX, y: karelY, facing: karelFacing, beepers: 0 },
      beepers: [],
      walls: [],
    });
  }
}
