/**
 * Token types and definitions for the Karel lexer.
 */

/**
 * Token types for the parser.
 */
export enum TokenType {
  // Program structure
  BeginningOfProgram = "BEGINNING-OF-PROGRAM",
  EndOfProgram = "END-OF-PROGRAM",
  BeginningOfExecution = "BEGINNING-OF-EXECUTION",
  EndOfExecution = "END-OF-EXECUTION",
  Begin = "BEGIN",
  End = "END",

  // Control flow
  If = "IF",
  Then = "THEN",
  Else = "ELSE",
  While = "WHILE",
  Do = "DO",
  Iterate = "ITERATE",
  Times = "TIMES",

  // Instructions
  Move = "move",
  TurnLeft = "turnleft",
  PickBeeper = "pickbeeper",
  PutBeeper = "putbeeper",
  TurnOff = "turnoff",

  // Definitions
  DefineNewInstruction = "DEFINE-NEW-INSTRUCTION",
  As = "AS",

  // Other
  Condition = "CONDITION",
  Number = "NUMBER",
  Identifier = "IDENTIFIER",
  Semicolon = "SEMICOLON",
  NewLine = "NEWLINE",
  EOF = "EOF",
}

/**
 * Represents a parsed token.
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  indent: number; // Number of leading tabs
}
