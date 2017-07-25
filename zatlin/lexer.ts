import {Token, TokenType, QuoteLiteralToken, ParseError} from "./common";

const PUNCTUATIONS = {
	"=": TokenType.EQUAL,
	"|": TokenType.VERTICAL,
	"-": TokenType.MINUS,
	"^": TokenType.CIRCUMFLEX,
	"%": TokenType.PERCENT,
	";": TokenType.SEMICOLON
};

export class Lexer {
	private pos = 0;
	private row = 0;
	private column = 0;

	private tokenStartPos = 0;
	private tokenStartRow = 0;
	private tokenStartColumn = 0;

	tokens: Token[];
	errors: ParseError[];

	constructor(private source: string) {
	}

	private startToken() {
		this.tokenStartPos = this.pos;
		this.tokenStartRow = this.row;
		this.tokenStartColumn = this.column;
	}

	private peek(): string | null {
		if (this.pos >= this.source.length) return null;
		return this.source[this.pos];
	}

	private read(): string | null {
		const char = this.peek();
		if (char != null) {
			this.pos++;
			this.column++;
			if (char == "\n") {
				this.row++;
				this.column = 0;
			}
		}
		return char;
	}

	private makeToken(type: TokenType) {
		this.tokens.push(new Token(
			type,
			this.source.slice(this.tokenStartPos, this.pos),
			this.tokenStartRow,
			this.tokenStartColumn
		));
	}

	private makeQuoteLiteralToken(value: string) {
		this.tokens.push(new QuoteLiteralToken(
			this.source.slice(this.tokenStartPos, this.pos),
			value,
			this.tokenStartRow,
			this.tokenStartColumn
		));
	}

	private makeErrorToken(message: string, apendTokenText?: boolean) {
		this.makeToken(TokenType.INVALID);
		this.errors.push(new ParseError(message, this.tokens[this.tokens.length - 1], apendTokenText));
	}

	private makeError(message: string, text: string, lineNumber: number, columnNumber: number) {
		this.errors.push(new ParseError(message, new Token(TokenType.INVALID, text, lineNumber, columnNumber)))
	}


	tokenize() {
		this.tokens = [];
		this.errors = [];
		while (true) {
			this.skipBlank();
			this.startToken();
			const char = this.peek();
			if (char == null) {
				break;
			} else if (char == '"') {
				this.procQuoteLiteral();
			} else if (PUNCTUATIONS.hasOwnProperty(char)) {
				this.read();
				this.makeToken(PUNCTUATIONS[char]);
			} else if (isNumeric(char) || char == ".") {
				this.procNumeric();
			} else if (isLetter(char)) {
				this.procIdentifier();
			} else {
				this.read();
				this.makeErrorToken("Invalid symbol");
			}
		}
		this.startToken();
		this.makeToken(TokenType.NEWLINE);
	}

	private procIdentifier() {
		while (isLetter(this.peek())) {
			this.read();
		}
		this.makeToken(TokenType.IDENTIFIER);
	}

	private procNumeric() {
		while (isNumeric(this.peek())) {
			this.read();
		}
		if (this.peek() == ".") {
			this.read();
			while (isNumeric(this.peek())) {
				this.read();
			}
		}

		if (isLetter(this.peek())) {
			while (isLetter(this.peek())) {
				this.read();
			}
			this.makeErrorToken("Invalid numeric literal");
		} else {
			this.makeToken(TokenType.NUMERIC);
		}
	}

	private procQuoteLiteral() {
		if (this.read() != '"') {
			return;
		}
		let content = "";
		let containsError = false;
		while (true) {
			const char = this.peek();
			if (char == "\n" || char == null) {
				this.makeErrorToken("The line ended before a string literal is closed", false);
				return;
			}
			if (char == "\\") {
				let escapeStartRow = this.row;
				let escapeStartColumn = this.column;
				this.read();

				const escapedChar = this.peek();
				if (escapedChar == '"' || escapedChar == "\\") {
					this.read();
					content += escapedChar;
				} else if (escapedChar == "u") {
					this.read();
					let charCode = "";
					let i: number;
					for (i = 0; i < 4; i++) {
						let charCodeDigit = this.peek();
						if (isHex(charCodeDigit)) {
							this.read();
							charCode += charCodeDigit;
						} else {
							this.makeError("Invalid escape sequence", `\\u${charCode}`, escapeStartRow, escapeStartColumn);
							containsError = true;
							break;
						}
					}
					if (i == 4) {
						content += String.fromCharCode(parseInt(charCode, 16));
					}
				} else {
					this.makeError("Invalid escape sequence", "\\", escapeStartRow, escapeStartColumn);
					containsError = true;
				}
			} else if (char == '"') {
				this.read();
				break;
			} else {
				this.read();
				content += char;
			}
		}
		if (containsError) {
			this.makeToken(TokenType.INVALID);
		} else {
			this.makeQuoteLiteralToken(content);
		}
	}

	private skipBlank() {
		let inComment = false;
		while (true) {
			const char = this.peek();
			if (char == null) {
				return;
			}
			if (char == "\n") {
				this.startToken();
				this.makeToken(TokenType.NEWLINE);
				inComment = false;
			}

			if (inComment) {
				this.read();
				continue;
			}

			if (char == "#") {
				inComment = true;
			} else if (!isWhiteSpace(char)) {
				break;
			}
			this.read();
		}
	}
}

function isWhiteSpace(char: string | null): boolean {
	if (char == null) return false;
	return char.search(/\s/) >= 0;
}

function isNumeric(char: string | null): boolean {
	if (char == null) return false;
	return char.search(/\d/) >= 0;
}

function isLetter(char: string | null): boolean {
	if (char == null) return false;
	return char.search(/[0-9A-Za-z_]/) >= 0;
}

function isHex(char: string | null): boolean {
	if (char == null) return false;
	return char.search(/[0-9A-Fa-f]/) >= 0;
}
