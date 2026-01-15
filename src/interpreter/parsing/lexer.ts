/**
 * Lexer (Tokenizer) for Karel instructions.
 */

import { Token, TokenType } from "@/interpreter/types/tokens";
import { VALID_CONDITIONS } from "@/interpreter/parsing/constants";

/**
 * Tokenizer for Karel instructions.
 */
export class Lexer {
  private source: string;
  private lines: string[];
  private currentLine: number = 0;
  private currentColumn: number = 0;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
    this.lines = source.split("\n");
  }

  tokenize(): Token[] {
    for (this.currentLine = 0; this.currentLine < this.lines.length; this.currentLine++) {
      this.tokenizeLine(this.lines[this.currentLine]);
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: "",
      line: this.currentLine,
      column: 0,
      indent: 0,
    });

    return this.tokens;
  }

  private tokenizeLine(line: string): void {
    // Count leading tabs for indentation
    let indent = 0;
    let i = 0;
    while (i < line.length && line[i] === "\t") {
      indent++;
      i++;
    }

    // Skip empty lines
    const content = line.slice(i).trim();
    if (content === "" || content.startsWith("//")) {
      return;
    }

    this.currentColumn = i;

    // Tokenize the line content
    const words = content.split(/\s+/);

    for (let wordIdx = 0; wordIdx < words.length; wordIdx++) {
      let word = words[wordIdx];

      // Handle semicolon at end of word
      const hasSemicolon = word.endsWith(";");
      if (hasSemicolon) {
        word = word.slice(0, -1);
      }

      if (word) {
        this.addToken(word, indent);
      }

      if (hasSemicolon) {
        this.tokens.push({
          type: TokenType.Semicolon,
          value: ";",
          line: this.currentLine + 1,
          column: this.currentColumn,
          indent,
        });
      }
    }
  }

  private addToken(word: string, indent: number): void {
    const upperWord = word.toUpperCase();
    let type: TokenType;

    // Check keywords and built-ins
    switch (upperWord) {
      case "BEGINNING-OF-PROGRAM":
        type = TokenType.BeginningOfProgram;
        break;
      case "END-OF-PROGRAM":
        type = TokenType.EndOfProgram;
        break;
      case "BEGINNING-OF-EXECUTION":
        type = TokenType.BeginningOfExecution;
        break;
      case "END-OF-EXECUTION":
        type = TokenType.EndOfExecution;
        break;
      case "BEGIN":
        type = TokenType.Begin;
        break;
      case "END":
        type = TokenType.End;
        break;
      case "IF":
        type = TokenType.If;
        break;
      case "THEN":
        type = TokenType.Then;
        break;
      case "ELSE":
        type = TokenType.Else;
        break;
      case "WHILE":
        type = TokenType.While;
        break;
      case "DO":
        type = TokenType.Do;
        break;
      case "ITERATE":
        type = TokenType.Iterate;
        break;
      case "TIMES":
        type = TokenType.Times;
        break;
      case "DEFINE-NEW-INSTRUCTION":
        type = TokenType.DefineNewInstruction;
        break;
      case "AS":
        type = TokenType.As;
        break;
      case "MOVE":
        type = TokenType.Move;
        break;
      case "TURNLEFT":
        type = TokenType.TurnLeft;
        break;
      case "PICKBEEPER":
        type = TokenType.PickBeeper;
        break;
      case "PUTBEEPER":
        type = TokenType.PutBeeper;
        break;
      case "TURNOFF":
        type = TokenType.TurnOff;
        break;
      default:
        // Check if it's a number
        if (/^\d+$/.test(word)) {
          type = TokenType.Number;
        }
        // Check if it's a known condition
        else if (VALID_CONDITIONS.has(word.toLowerCase())) {
          type = TokenType.Condition;
        }
        // Otherwise it's an identifier (custom instruction name)
        else {
          type = TokenType.Identifier;
        }
    }

    this.tokens.push({
      type,
      value: word,
      line: this.currentLine + 1, // 1-based line numbers
      column: this.currentColumn,
      indent,
    });
  }
}
