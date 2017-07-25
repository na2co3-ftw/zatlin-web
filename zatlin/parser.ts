import {Token, TokenType, QuoteLiteralToken, ParseError} from "./common";
import {Lexer}  from "./lexer";
import {Generator, Root, Choice, Pattern} from "./generator";
import Validator from "./validator";

export class Parser {
	private lexer: Lexer;

	errors: ParseError[];
	warnings: ParseError[];

	private definitions: { [key: string]: Generator };
	private definitionIdentifiers: { [key: string]: Token };
	private mainGenerator: Generator | null;

	constructor(source: string) {
		this.lexer = new Lexer(source);
	}

	private makeError(message: string, token: Token, apendTokenText?: boolean) {
		this.errors.push(new ParseError(message, token, apendTokenText));
	}

	parse(): Root | null {
		this.definitions = {};
		this.definitionIdentifiers = {};
		this.mainGenerator = null;
		this.errors = [];
		this.warnings = [];

		let tokens: Token[] = [];
		let hasInvalidToken = false;
		this.lexer.tokenize();
		this.errors.push(...this.lexer.errors);
		for (const token of this.lexer.tokens) {
			tokens.push(token);
			if (token.type == TokenType.SEMICOLON || token.type == TokenType.NEWLINE) {
				if (tokens.length > 1 || token.type == TokenType.SEMICOLON) {
					if (!hasInvalidToken) {
						this.parseSentence(tokens);
					}
				}
				tokens = [];
				hasInvalidToken = false;
			} else if (token.type == TokenType.INVALID) {
				hasInvalidToken = true;
			}
		}

		if (this.mainGenerator == null) {
			this.makeError("No main pattern", this.lexer.tokens[this.lexer.tokens.length - 1], false);
		}
		const validator = new Validator(this.definitions, this.definitionIdentifiers, this.mainGenerator);
		validator.validate();
		this.errors.push(...validator.errors);
		this.warnings.push(...validator.warnings);

		if (this.errors.length == 0) {
			return new Root(this.definitions, this.mainGenerator!);
		} else {
			return null;
		}
	}

	private parseSentence(tokens: Token[]) {
		let sp = new SentenceParser(tokens);
		let sentence = sp.parse();
		if (sentence != null) {
			if (sentence.type == "main") {
				if (this.mainGenerator == null) {
					this.mainGenerator = sentence.generator;
				} else {
					this.makeError("Duplicate definition of the main pattern", tokens[0], false);
				}
			} else {
				if (!this.definitions.hasOwnProperty(sentence.identifier.text)) {
					this.definitions[sentence.identifier.text] = sentence.generator;
					this.definitionIdentifiers[sentence.identifier.text] = sentence.identifier;
				} else {
					this.makeError("Duplicate definition", sentence.identifier);
				}
			}
		}
		this.errors.push(...sp.errors);
	}
}

type Sentence =
	{ type: "main", generator: Generator }
	| { type: "definition", identifier: Token, generator: Generator };

class SentenceParser {
	private ptr: number;
	errors: ParseError[];

	constructor(private tokens: Token[]) {
	}

	private makeError(message: string, token: Token) {
		this.errors.push(new ParseError(message, token, false));
	}

	parse(): Sentence | null {
		this.errors = [];

		let main = false;
		let name: Token | null = null;
		if (this.tokens[0].type == TokenType.PERCENT) {
			this.ptr = 1;
			main = true;
		} else if (this.tokens[0].type == TokenType.IDENTIFIER) {
			name = this.tokens[0];
			if (this.tokens[1].type != TokenType.EQUAL) {
				this.makeError("Invalid definition sentence", this.tokens[1]);
				return null;
			}
			this.ptr = 2;
		} else {
			this.makeError("Invalid definition sentence", this.tokens[0]);
			return null;
		}

		let selection = this.parseSelection();

		let disjunction: Pattern[] = [];
		if (this.tokens[this.ptr].type == TokenType.MINUS) {
			this.ptr++;
			disjunction = this.parseDisjunction();
		}

		const type = this.tokens[this.ptr].type;
		if (type != TokenType.SEMICOLON && type != TokenType.NEWLINE) {
			this.makeError("Invalid definition sentence", this.tokens[this.ptr]);
		}

		if (this.errors.length == 0) {
			if (main) {
				return {
					type: "main",
					generator: new Generator(selection, disjunction)
				};
			} else {
				return {
					type: "definition",
					identifier: name!,
					generator: new Generator(selection, disjunction)
				};
			}
		}
		return null;
	}

	private parseSelection(): Choice[] {
		let selection: Choice[] = [];

		let choice: Choice = {sequence: [], weight: 1};
		let afterWeight = false;
		while (true) {
			let token = this.tokens[this.ptr];
			if (token.type == TokenType.QUOTE_LITERAL || token.type == TokenType.IDENTIFIER) {
				choice.sequence.push(token);
				if (afterWeight) {
					this.makeError("Weight is not at the rightmost", this.tokens[this.ptr - 1]);
					afterWeight = false;
				}
			} else if (token.type == TokenType.NUMERIC) {
				choice.weight = parseFloat(token.text);
				afterWeight = true;
			} else {
				if (choice.sequence.length != 0) {
					selection.push(choice);
				} else {
					this.makeError("Invalid selection expression", token);
				}
				if (token.type == TokenType.VERTICAL) {
					choice = {sequence: [], weight: 1};
					afterWeight = false;
				} else {
					break;
				}
			}
			this.ptr++;
		}
		return selection;
	}

	private parseDisjunction(): Pattern[] {
		let disjunction: Pattern[] = [];

		let patternToken: QuoteLiteralToken | null = null;
		let leading = false;
		let trailing = false;
		while (true) {
			let token = this.tokens[this.ptr];
			if (token.isQuoteLiteral()) {
				if (patternToken == null) {
					patternToken = token;
				} else {
					this.makeError("Two or more quote literals in the single expression", token);
				}
			} else if (token.type == TokenType.CIRCUMFLEX) {
				if (patternToken != null) {
					if (!trailing) {
						trailing = true;
					} else {
						this.makeError("Duplicate circumflex", token);
					}
				} else {
					if (!leading) {
						leading = true;
					} else {
						this.makeError("Duplicate circumflex", token);
					}
				}
			} else {
				if (patternToken != null) {
					disjunction.push(new Pattern(patternToken, leading, trailing));
				} else {
					if (this.tokens[this.ptr - 1].type == TokenType.CIRCUMFLEX) {
						this.makeError("Invalid disjunction expression", this.tokens[this.ptr - 1]);
					} else {
						this.makeError("Invalid disjunction expression", token);
					}
				}
				if (token.type == TokenType.VERTICAL) {
					patternToken = null;
					leading = false;
					trailing = false;
				} else {
					break;
				}
			}
			this.ptr++;
		}
		return disjunction;
	}
}
