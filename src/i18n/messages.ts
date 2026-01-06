/**
 * Internationalization wrapper for VS Karel extension.
 * Uses VS Code's l10n API for localization support.
 */
import * as vscode from "vscode";

/**
 * Translates a message key to the current locale.
 * Falls back to the key itself if no translation is found.
 */
export function t(message: string, ...args: (string | number)[]): string {
  return vscode.l10n.t(message, ...args);
}

/**
 * Error messages used throughout the extension.
 */
export const ErrorMessages = {
  // Movement errors
  moveBlocked: () => t("Cannot move: front is blocked"),
  
  // Beeper errors
  noBeepersToPickUp: (x: number, y: number) =>
    t("Cannot pick beeper: no beepers at position ({0}, {1})", x, y),
  noBeepersInBag: () => t("Cannot put beeper: no beepers in bag"),
  
  // World errors
  karelOutOfBounds: (x: number, y: number) =>
    t("Karel is out of bounds at position ({0}, {1})", x, y),
  invalidWall: (x1: number, y1: number, x2: number, y2: number) =>
    t("Invalid wall: cells ({0}, {1}) and ({2}, {3}) are not adjacent", x1, y1, x2, y2),
  multipleKarels: () => t("Invalid map: multiple Karel positions defined"),
  noKarel: () => t("Invalid map: no Karel position defined"),
  
  // Parser errors
  missingProgramStart: () =>
    t("Missing BEGINNING-OF-PROGRAM at the start of the program"),
  missingProgramEnd: () =>
    t("Missing END-OF-PROGRAM at the end of the program"),
  missingExecutionStart: () =>
    t("Missing BEGINNING-OF-EXECUTION before instructions"),
  missingExecutionEnd: () =>
    t("Missing END-OF-EXECUTION after instructions"),
  missingTurnoff: () =>
    t("Missing turnoff instruction before END-OF-EXECUTION"),
  unmatchedBegin: (line: number) =>
    t("Unmatched BEGIN at line {0}", line),
  unmatchedEnd: (line: number) =>
    t("Unmatched END at line {0}", line),
  invalidIndentation: (line: number) =>
    t("Invalid indentation at line {0}: use tabs for indentation", line),
  missingSemicolon: (line: number) =>
    t("Missing semicolon at line {0}", line),
  unexpectedSemicolon: (line: number) =>
    t("Unexpected semicolon at line {0}: no semicolon before END", line),
  unknownInstruction: (name: string, line: number) =>
    t("Unknown instruction '{0}' at line {1}", name, line),
  unknownCondition: (name: string, line: number) =>
    t("Unknown condition '{0}' at line {1}", name, line),
  invalidIterateCount: (line: number) =>
    t("Invalid ITERATE count at line {0}: must be a positive integer", line),
  
  // Execution errors
  programNotLoaded: () => t("No program loaded"),
  executionStopped: () => t("Execution was stopped"),
  maxIterationsReached: (max: number) =>
    t("Maximum iterations ({0}) reached: possible infinite loop", max),
};

/**
 * UI messages for the extension.
 */
export const UIMessages = {
  errorHighlightingEnabled: () => t("Karel error highlighting enabled"),
  errorHighlightingDisabled: () => t("Karel error highlighting disabled"),
  executionStarted: () => t("Karel execution started"),
  executionCompleted: () => t("Karel execution completed"),
  executionStopped: () => t("Execution stopped"),
  stepMode: () => t("Step mode - press Step to advance"),
  noActiveFile: () => t("No active Karel file"),
  selectMapFile: () => t("Select a Karel map file (.klm)"),
  conversionComplete: (filename: string) =>
    t("Map converted successfully: {0}", filename),
};
