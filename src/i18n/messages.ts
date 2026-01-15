/**
 * Centralized message definitions for VS Karel extension.
 * All user-facing strings are defined here for maintainability.
 */

/**
 * Simple string interpolation helper.
 * Replaces {0}, {1}, etc. with provided arguments.
 */
function format(message: string, ...args: (string | number)[]): string {
  return message.replace(/\{(\d+)\}/g, (_, index) => String(args[parseInt(index)]));
}

/**
 * Error messages used throughout the extension.
 */
export const ErrorMessages = {
  // Movement errors
  moveBlocked: () => "Cannot move: front is blocked",

  // Beeper errors
  noBeepersToPickUp: (x: number, y: number) =>
    format("Cannot pick beeper: no beepers at position ({0}, {1})", x, y),
  noBeepersInBag: () => "Cannot put beeper: no beepers in bag",

  // World errors
  karelOutOfBounds: (x: number, y: number) =>
    format("Karel is out of bounds at position ({0}, {1})", x, y),
  invalidWall: (x1: number, y1: number, x2: number, y2: number) =>
    format("Invalid wall: cells ({0}, {1}) and ({2}, {3}) are not adjacent", x1, y1, x2, y2),
  multipleKarels: () => "Invalid map: multiple Karel positions defined",
  noKarel: () => "Invalid map: no Karel position defined",

  // Parser errors
  missingProgramStart: () => "Missing BEGINNING-OF-PROGRAM at the start of the program",
  missingProgramEnd: () => "Missing END-OF-PROGRAM at the end of the program",
  missingExecutionStart: () => "Missing BEGINNING-OF-EXECUTION before instructions",
  missingExecutionEnd: () => "Missing END-OF-EXECUTION after instructions",
  missingTurnoff: () => "Missing turnoff instruction before END-OF-EXECUTION",
  unmatchedBegin: (line: number) => format("Unmatched BEGIN at line {0}", line),
  unmatchedEnd: (line: number) => format("Unmatched END at line {0}", line),
  invalidIndentation: (line: number) =>
    format("Invalid indentation at line {0}: use tabs for indentation", line),
  missingSemicolon: (line: number) => format("Missing semicolon at line {0}", line),
  unexpectedSemicolon: (line: number) =>
    format("Unexpected semicolon at line {0}: no semicolon before END", line),
  unknownInstruction: (name: string, line: number) =>
    format("Unknown instruction '{0}' at line {1}", name, line),
  unknownCondition: (name: string, line: number) =>
    format("Unknown condition '{0}' at line {1}", name, line),
  invalidIterateCount: (line: number) =>
    format("Invalid ITERATE count at line {0}: must be a positive integer", line),

  // Execution errors
  programNotLoaded: () => "No program loaded",
  executionStopped: () => "Execution was stopped",
  maxIterationsReached: (max: number) =>
    format("Maximum iterations ({0}) reached: possible infinite loop", max),
};

/**
 * UI messages for the extension.
 */
export const UIMessages = {
  errorHighlightingEnabled: () => "Karel error highlighting enabled",
  errorHighlightingDisabled: () => "Karel error highlighting disabled",
  executionStarted: () => "Karel execution started",
  executionCompleted: () => "Karel execution completed",
  executionStopped: () => "Execution stopped",
  stepMode: () => "Step mode - press Step to advance",
  noActiveFile: () => "No active Karel file",
  selectMapFile: () => "Select a Karel map file (.klm)",
  selectInstructionsFile: () => "Select Karel Instructions File",
  conversionComplete: (filename: string) => format("Map converted successfully: {0}", filename),
  mapReloaded: (filename: string) => format("Map reloaded: {0}", filename),
  mapReloadError: (filename: string, error: string) =>
    format("Error reloading map {0}: {1}", filename, error),
  programChanged: (filename: string) => format("Program changed to: {0}", filename),
  cannotRunWithErrors: () => "Cannot run program: there are errors in the code",
  worldModifiedPrompt: () => "The world has been modified. Continue from current state or reset?",
  continueOption: () => "Continue",
  resetOption: () => "Reset",
  invalidMapFile: () => "Invalid map file: missing dimensions or karel",
};
