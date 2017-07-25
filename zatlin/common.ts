export class Token {
	constructor(public type: TokenType,
				public text: string,
				public lineNumber: number,
				public columnNumber: number) {
		if (type == TokenType.QUOTE_LITERAL && !(this instanceof QuoteLiteralToken)) {
			throw new TypeError();
		}
	}

	isQuoteLiteral(): this is QuoteLiteralToken {
		return this.type == TokenType.QUOTE_LITERAL;
	}
}

export class QuoteLiteralToken extends Token {
	constructor(text: string,
				public value: string,
				lineNumber: number,
				columnNumber: number) {
		super(TokenType.QUOTE_LITERAL, text, lineNumber, columnNumber);
	}
}

export enum TokenType {
	IDENTIFIER,
	QUOTE_LITERAL,
	NUMERIC,
	EQUAL,
	VERTICAL,
	MINUS,
	CIRCUMFLEX,
	PERCENT,
	SEMICOLON,
	NEWLINE,
	INVALID
}

export class ParseError {
	constructor(public message: string, public token: Token, appendTokenText: boolean = true) {
		if (appendTokenText) {
			this.message += " " + this.token.text;
		}
	}
}
