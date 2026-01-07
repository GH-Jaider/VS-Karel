/**
 * Karel Instruction Parser and Interpreter.
 *
 * Parses .kli files and executes Karel instructions step-by-step.
 */

import { World } from "./world";
import { ErrorMessages } from "../i18n/messages";

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

/**
 * Valid condition names.
 */
const VALID_CONDITIONS = new Set([
  "front-is-clear",
  "front-is-blocked",
  "left-is-clear",
  "left-is-blocked",
  "right-is-clear",
  "right-is-blocked",
  "next-to-a-beeper",
  "not-next-to-a-beeper",
  "facing-north",
  "not-facing-north",
  "facing-south",
  "not-facing-south",
  "facing-east",
  "not-facing-east",
  "facing-west",
  "not-facing-west",
  "beeper-in-bag",
]);

/**
 * Built-in instruction names.
 */
const BUILT_IN_INSTRUCTIONS = new Set(["move", "turnleft", "pickbeeper", "putbeeper", "turnoff"]);

/**
 * AST Node types for the parsed program.
 */
export type ASTNode =
  | ProgramNode
  | DefineInstructionNode
  | ExecutionBlockNode
  | IfNode
  | WhileNode
  | IterateNode
  | InstructionCallNode
  | BlockNode;

export interface ProgramNode {
  type: "program";
  definitions: DefineInstructionNode[];
  execution: ExecutionBlockNode;
}

export interface DefineInstructionNode {
  type: "define";
  name: string;
  body: BlockNode;
  line: number;
}

export interface ExecutionBlockNode {
  type: "execution";
  statements: ASTNode[];
}

export interface BlockNode {
  type: "block";
  statements: ASTNode[];
}

export interface IfNode {
  type: "if";
  condition: string;
  thenBranch: BlockNode;
  elseBranch?: BlockNode;
  line: number;
}

export interface WhileNode {
  type: "while";
  condition: string;
  body: BlockNode;
  line: number;
}

export interface IterateNode {
  type: "iterate";
  count: number;
  body: BlockNode;
  line: number;
}

export interface InstructionCallNode {
  type: "call";
  name: string;
  line: number;
}

/**
 * Parser error with line information.
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column?: number
  ) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Runtime error during execution.
 */
export class RuntimeError extends Error {
  constructor(
    message: string,
    public line?: number
  ) {
    super(message);
    this.name = "RuntimeError";
  }
}

/**
 * Diagnostic information for errors/warnings.
 */
export interface Diagnostic {
  message: string;
  line: number;
  column: number;
  endColumn?: number;
  severity: "error" | "warning" | "info";
}

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

/**
 * Execution frame for step-by-step execution.
 */
interface ExecutionFrame {
  type: "block" | "if" | "while" | "iterate";
  statements?: ASTNode[];
  index: number;
  // For while loops
  condition?: string;
  body?: BlockNode;
  // For iterate loops
  count?: number;
  current?: number;
}

/**
 * Interpreter for executing Karel programs.
 */
export class Interpreter {
  private world: World;
  private ast: ProgramNode | null = null;
  private customInstructions: Map<string, BlockNode> = new Map();
  private running: boolean = false;
  private currentLine: number = 0;
  private executionSpeed: number = 500;
  private maxIterations: number = 100000;
  private iterationCount: number = 0;

  // Step execution state
  private executionStack: ExecutionFrame[] = [];
  private stepInitialized: boolean = false;
  private stepCompleted: boolean = false;

  // Callbacks for UI updates
  public onStep?: (line: number) => void;
  public onComplete?: () => void;
  public onError?: (error: RuntimeError) => void;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Check if step execution is initialized.
   */
  isStepInitialized(): boolean {
    return this.stepInitialized;
  }

  /**
   * Check if step execution is completed.
   */
  isStepCompleted(): boolean {
    return this.stepCompleted;
  }

  /**
   * Load and parse a program.
   */
  load(source: string): Diagnostic[] {
    const parser = new Parser();
    const { ast, diagnostics } = parser.parse(source);
    this.ast = ast;

    // Build custom instructions map
    this.customInstructions.clear();
    if (ast) {
      for (const def of ast.definitions) {
        this.customInstructions.set(def.name.toLowerCase(), def.body);
      }
    }

    return diagnostics;
  }

  /**
   * Run the entire program.
   * Uses the same stack-based execution as step() for consistency.
   */
  async run(): Promise<void> {
    if (!this.ast) {
      throw new RuntimeError(ErrorMessages.programNotLoaded());
    }

    // Initialize step mode if not already
    if (!this.stepInitialized) {
      this.initializeStepMode();
    }

    // Run all steps with delay
    try {
      while (this.running && !this.stepCompleted) {
        const hasMore = this.executeOneStep();
        if (!hasMore) {
          this.stepCompleted = true;
          this.onComplete?.();
          break;
        }
        // Wait for animation between steps
        await this.delay();
      }
    } catch (e) {
      this.stepCompleted = true;
      if (e instanceof RuntimeError) {
        this.onError?.(e);
      } else {
        throw e;
      }
    } finally {
      if (!this.running) {
        // Was stopped, don't mark as completed
      }
    }
  }

  /**
   * Execute a single step.
   * Returns true if there are more steps to execute, false if done.
   */
  step(): boolean {
    if (!this.ast) {
      throw new RuntimeError(ErrorMessages.programNotLoaded());
    }

    // Initialize step execution if not already
    if (!this.stepInitialized) {
      this.executionStack = [
        {
          type: "block",
          statements: this.ast.execution.statements,
          index: 0,
        },
      ];
      this.stepInitialized = true;
      this.stepCompleted = false;
      this.running = true;
      this.iterationCount = 0;
    }

    // If completed, nothing more to do
    if (this.stepCompleted) {
      return false;
    }

    // Resume if was stopped
    if (!this.running) {
      this.running = true;
    }

    try {
      const hasMore = this.executeOneStep();
      if (!hasMore) {
        this.stepCompleted = true;
        this.onComplete?.();
        return false;
      }
      return true;
    } catch (e) {
      this.stepCompleted = true;
      if (e instanceof RuntimeError) {
        this.onError?.(e);
      } else {
        throw e;
      }
      return false;
    }
  }

  /**
   * Initialize step mode without executing.
   */
  initializeStepMode(): void {
    if (!this.ast) {
      throw new RuntimeError(ErrorMessages.programNotLoaded());
    }
    this.executionStack = [
      {
        type: "block",
        statements: this.ast.execution.statements,
        index: 0,
      },
    ];
    this.stepInitialized = true;
    this.stepCompleted = false;
    this.running = true;
    this.iterationCount = 0;
  }

  /**
   * Execute one atomic step (one instruction).
   */
  private executeOneStep(): boolean {
    while (this.executionStack.length > 0) {
      const frame = this.executionStack[this.executionStack.length - 1];

      this.iterationCount++;
      if (this.iterationCount > this.maxIterations) {
        throw new RuntimeError(ErrorMessages.maxIterationsReached(this.maxIterations));
      }

      if (frame.type === "block" && frame.statements) {
        if (frame.index >= frame.statements.length) {
          // Done with this block
          this.executionStack.pop();
          continue;
        }

        const statement = frame.statements[frame.index];
        frame.index++;

        // Handle the statement
        if (statement.type === "call") {
          // Execute the call and return (one step done)
          this.executeCallSync(statement as InstructionCallNode);
          if (!this.running) {
            // turnoff was called
            return false;
          }
          return true;
        } else if (statement.type === "if") {
          const ifNode = statement as IfNode;
          const condition = this.world.evaluateCondition(ifNode.condition);
          if (condition) {
            this.executionStack.push({
              type: "block",
              statements: ifNode.thenBranch.statements,
              index: 0,
            });
          } else if (ifNode.elseBranch) {
            this.executionStack.push({
              type: "block",
              statements: ifNode.elseBranch.statements,
              index: 0,
            });
          }
          continue;
        } else if (statement.type === "while") {
          const whileNode = statement as WhileNode;
          // Push while frame (we'll check condition in the while frame handler)
          this.executionStack.push({
            type: "while",
            condition: whileNode.condition,
            body: whileNode.body,
            index: 0,
          });
          continue;
        } else if (statement.type === "iterate") {
          const iterateNode = statement as IterateNode;
          if (iterateNode.count > 0) {
            this.executionStack.push({
              type: "iterate",
              count: iterateNode.count,
              current: 0,
              body: iterateNode.body,
              index: 0,
            });
          }
          continue;
        } else if (statement.type === "block") {
          this.executionStack.push({
            type: "block",
            statements: (statement as BlockNode).statements,
            index: 0,
          });
          continue;
        }
      } else if (frame.type === "while") {
        // Check while condition
        if (!this.world.evaluateCondition(frame.condition!)) {
          this.executionStack.pop();
          continue;
        }
        // Push body as a new block frame, then re-check while
        const bodyFrame: ExecutionFrame = {
          type: "block",
          statements: frame.body!.statements,
          index: 0,
        };
        // Replace while frame with a fresh one for next iteration
        this.executionStack.pop();
        this.executionStack.push({
          type: "while",
          condition: frame.condition,
          body: frame.body,
          index: 0,
        });
        this.executionStack.push(bodyFrame);
        continue;
      } else if (frame.type === "iterate") {
        if (frame.current! >= frame.count!) {
          this.executionStack.pop();
          continue;
        }
        // Push body, increment counter
        frame.current!++;
        this.executionStack.push({
          type: "block",
          statements: frame.body!.statements,
          index: 0,
        });
        continue;
      }
    }

    // Stack empty - execution complete
    return false;
  }

  /**
   * Execute a call synchronously (for step mode).
   */
  private executeCallSync(node: InstructionCallNode): void {
    const name = node.name.toLowerCase();
    this.currentLine = node.line;
    this.onStep?.(node.line);

    try {
      switch (name) {
        case "move":
          this.world.move();
          break;
        case "turnleft":
          this.world.turnLeft();
          break;
        case "pickbeeper":
          this.world.pickBeeper();
          break;
        case "putbeeper":
          this.world.putBeeper();
          break;
        case "turnoff":
          this.running = false;
          break;
        default:
          // Custom instruction - push its body onto the stack
          const body = this.customInstructions.get(name);
          if (body) {
            // We need to execute the custom instruction's body
            // But we already incremented index, so we push the body
            // However, for custom instructions we want to step through them
            this.executionStack.push({
              type: "block",
              statements: body.statements,
              index: 0,
            });
            // Don't count this as a "step" - continue to first actual instruction
            return;
          } else {
            throw new RuntimeError(
              ErrorMessages.unknownInstruction(node.name, node.line),
              node.line
            );
          }
      }
    } catch (e) {
      if (e instanceof Error && !(e instanceof RuntimeError)) {
        throw new RuntimeError(e.message, node.line);
      }
      throw e;
    }
  }

  /**
   * Stop execution.
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Reset the world to initial state.
   */
  reset(): void {
    this.world.reset();
    this.running = false;
    this.currentLine = 0;
    this.iterationCount = 0;
    // Reset step execution state
    this.executionStack = [];
    this.stepInitialized = false;
    this.stepCompleted = false;
  }

  /**
   * Set execution speed in milliseconds.
   */
  setSpeed(ms: number): void {
    this.executionSpeed = Math.max(50, Math.min(2000, ms));
  }

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.executionSpeed));
  }
}
