/**
 * Parser for Karel instructions.
 */

import { Token, TokenType } from "@/interpreter/types/tokens";
import {
  ASTNode,
  ProgramNode,
  DefineInstructionNode,
  BlockNode,
  IfNode,
  WhileNode,
  IterateNode,
  InstructionCallNode,
} from "@/interpreter/types/ast";
import { ParseError, Diagnostic } from "@/interpreter/types/errors";
import { ErrorMessages } from "@/i18n/messages";
import { Lexer } from "@/interpreter/parsing/lexer";
import { BUILT_IN_INSTRUCTIONS } from "@/interpreter/parsing/constants";

/**
 * Parser for Karel instructions.
 */
export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private diagnostics: Diagnostic[] = [];
  private customInstructions: Set<string> = new Set();

  parse(source: string): { ast: ProgramNode | null; diagnostics: Diagnostic[] } {
    const lexer = new Lexer(source);
    this.tokens = lexer.tokenize();
    this.current = 0;
    this.diagnostics = [];
    this.customInstructions = new Set();

    try {
      const ast = this.parseProgram();
      return { ast, diagnostics: this.diagnostics };
    } catch (e) {
      if (e instanceof ParseError) {
        this.diagnostics.push({
          message: e.message,
          line: e.line,
          column: e.column ?? 0,
          severity: "error",
        });
      }
      return { ast: null, diagnostics: this.diagnostics };
    }
  }

  private parseProgram(): ProgramNode {
    // Expect BEGINNING-OF-PROGRAM
    if (!this.check(TokenType.BeginningOfProgram)) {
      throw new ParseError(ErrorMessages.missingProgramStart(), this.peek().line);
    }
    this.advance();

    // Parse definitions
    const definitions: DefineInstructionNode[] = [];
    while (this.check(TokenType.DefineNewInstruction)) {
      definitions.push(this.parseDefineInstruction());
    }

    // Expect BEGINNING-OF-EXECUTION
    if (!this.check(TokenType.BeginningOfExecution)) {
      throw new ParseError(ErrorMessages.missingExecutionStart(), this.peek().line);
    }
    this.advance();

    // Parse execution statements
    const statements: ASTNode[] = [];
    while (!this.check(TokenType.EndOfExecution) && !this.check(TokenType.EOF)) {
      statements.push(this.parseStatement());
    }

    // Check for turnoff
    const lastStmt = statements[statements.length - 1];
    if (
      !lastStmt ||
      lastStmt.type !== "call" ||
      (lastStmt as InstructionCallNode).name.toLowerCase() !== "turnoff"
    ) {
      this.diagnostics.push({
        message: ErrorMessages.missingTurnoff(),
        line: this.peek().line - 1,
        column: 0,
        severity: "error",
      });
    }

    // Expect END-OF-EXECUTION
    if (!this.check(TokenType.EndOfExecution)) {
      throw new ParseError(ErrorMessages.missingExecutionEnd(), this.peek().line);
    }
    this.advance();

    // Expect END-OF-PROGRAM
    if (!this.check(TokenType.EndOfProgram)) {
      throw new ParseError(ErrorMessages.missingProgramEnd(), this.peek().line);
    }
    this.advance();

    return {
      type: "program",
      definitions,
      execution: {
        type: "execution",
        statements,
      },
    };
  }

  private parseDefineInstruction(): DefineInstructionNode {
    const defToken = this.advance(); // DEFINE-NEW-INSTRUCTION

    // Expect instruction name
    if (!this.check(TokenType.Identifier)) {
      throw new ParseError(
        "Expected instruction name after DEFINE-NEW-INSTRUCTION",
        this.peek().line
      );
    }
    const nameToken = this.advance();
    const name = nameToken.value;

    // Register custom instruction
    this.customInstructions.add(name.toLowerCase());

    // Expect AS
    if (!this.check(TokenType.As)) {
      throw new ParseError("Expected AS after instruction name", this.peek().line);
    }
    this.advance();

    // Parse body block
    const body = this.parseBlock();

    return {
      type: "define",
      name,
      body,
      line: defToken.line,
    };
  }

  private parseBlock(): BlockNode {
    // Expect BEGIN
    if (!this.check(TokenType.Begin)) {
      throw new ParseError("Expected BEGIN", this.peek().line);
    }
    this.advance();

    const statements: ASTNode[] = [];
    while (!this.check(TokenType.End) && !this.check(TokenType.EOF)) {
      statements.push(this.parseStatement());
    }

    // Expect END
    if (!this.check(TokenType.End)) {
      throw new ParseError(ErrorMessages.unmatchedBegin(this.peek().line), this.peek().line);
    }
    this.advance();

    return {
      type: "block",
      statements,
    };
  }

  private parseStatement(): ASTNode {
    const token = this.peek();

    switch (token.type) {
      case TokenType.If:
        return this.parseIf();
      case TokenType.While:
        return this.parseWhile();
      case TokenType.Iterate:
        return this.parseIterate();
      case TokenType.Begin:
        return this.parseBlock();
      default:
        return this.parseInstructionCall();
    }
  }

  private parseIf(): IfNode {
    const ifToken = this.advance(); // IF

    // Expect condition
    if (!this.check(TokenType.Condition)) {
      throw new ParseError(
        ErrorMessages.unknownCondition(this.peek().value, this.peek().line),
        this.peek().line
      );
    }
    const condition = this.advance().value;

    // Expect THEN
    if (!this.check(TokenType.Then)) {
      throw new ParseError("Expected THEN after condition", this.peek().line);
    }
    this.advance();

    // Parse then branch
    const thenBranch = this.parseBlock();

    // Check for ELSE
    let elseBranch: BlockNode | undefined;
    if (this.check(TokenType.Else)) {
      this.advance();
      elseBranch = this.parseBlock();
    }

    return {
      type: "if",
      condition,
      thenBranch,
      elseBranch,
      line: ifToken.line,
    };
  }

  private parseWhile(): WhileNode {
    const whileToken = this.advance(); // WHILE

    // Expect condition
    if (!this.check(TokenType.Condition)) {
      throw new ParseError(
        ErrorMessages.unknownCondition(this.peek().value, this.peek().line),
        this.peek().line
      );
    }
    const condition = this.advance().value;

    // Expect DO
    if (!this.check(TokenType.Do)) {
      throw new ParseError("Expected DO after condition", this.peek().line);
    }
    this.advance();

    // Parse body
    const body = this.parseBlock();

    return {
      type: "while",
      condition,
      body,
      line: whileToken.line,
    };
  }

  private parseIterate(): IterateNode {
    const iterateToken = this.advance(); // ITERATE

    // Expect number
    if (!this.check(TokenType.Number)) {
      throw new ParseError(ErrorMessages.invalidIterateCount(this.peek().line), this.peek().line);
    }
    const count = parseInt(this.advance().value, 10);

    // Expect TIMES
    if (!this.check(TokenType.Times)) {
      throw new ParseError("Expected TIMES after number", this.peek().line);
    }
    this.advance();

    // Parse body
    const body = this.parseBlock();

    return {
      type: "iterate",
      count,
      body,
      line: iterateToken.line,
    };
  }

  private parseInstructionCall(): InstructionCallNode {
    const token = this.advance();
    const name = token.value;
    const line = token.line;

    // Validate instruction name
    const lowerName = name.toLowerCase();
    if (!BUILT_IN_INSTRUCTIONS.has(lowerName) && !this.customInstructions.has(lowerName)) {
      this.diagnostics.push({
        message: ErrorMessages.unknownInstruction(name, line),
        line,
        column: token.column,
        severity: "error",
      });
    }

    // Expect semicolon (unless next token is END)
    if (
      !this.check(TokenType.Semicolon) &&
      !this.check(TokenType.End) &&
      !this.check(TokenType.Else) &&
      !this.check(TokenType.EndOfExecution)
    ) {
      this.diagnostics.push({
        message: ErrorMessages.missingSemicolon(line),
        line,
        column: token.column + name.length,
        severity: "error",
      });
    } else if (this.check(TokenType.Semicolon)) {
      this.advance();
    }

    return {
      type: "call",
      name,
      line,
    };
  }

  // Helper methods
  private peek(): Token {
    return this.tokens[this.current];
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }
}
