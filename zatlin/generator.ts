import {Token, TokenType, QuoteLiteralToken} from "./common";

export class Root {
	constructor(private definitions: { [key: string]: Generator }, private mainGenerator: Generator) {
	}

	generate(): string {
		return this.mainGenerator.generate(this);
	}

	getDefinitionOf(name: string): Generator | null {
		if (this.definitions.hasOwnProperty(name)) {
			return this.definitions[name];
		} else {
			return null;
		}
	}
}

const MAX_TRIAL_NUMBER = 100;

export class Generator {
	private totalWeight: number;

	constructor(private selection: Choice[], private disjunction: Pattern[]) {
		this.totalWeight = selection.reduce((total, choice) => total + choice.weight, 0);
	}

	generate(root: Root): string {
		for (let i = 0; i < MAX_TRIAL_NUMBER; i++) {
			const number = Math.random() * this.totalWeight;
			let currentWeight = 0;
			let output = "";
			for (const choice of this.selection) {
				currentWeight += choice.weight;
				if (number < currentWeight) {
					for (const token of choice.sequence) {
						if (token.isQuoteLiteral()) {
							output += token.value;
						} else if (token.type == TokenType.IDENTIFIER) {
							output += root.getDefinitionOf(token.text)!.generate(root);
						}
					}
					break;
				}
			}

			if (this.disjunction.length != 0) {
				if (this.disjunction.some(pattern => pattern.match(output))) {
					continue;
				}
			}
			return output;
		}
		return "";
	}

	getReferringIdentifiers(): Token[] {
		let identifiers: Token[] = [];
		for (const choice of this.selection) {
			for (const token of choice.sequence) {
				if (token.type == TokenType.IDENTIFIER) {
					identifiers.push(token);
				}
			}
		}
		return identifiers;
	}
}

export interface Choice {
	sequence: Token[];
	weight: number;
}

export class Pattern {
	constructor(private token: QuoteLiteralToken,
				private leading: Boolean,
				private trailing: Boolean) {
	}

	match(input: string): boolean {
		if (this.leading) {
			if (this.trailing) {
				return input == this.token.value;
			} else {
				return input.startsWith(this.token.value);
			}
		} else {
			if (this.trailing) {
				return input.endsWith(this.token.value);
			} else {
				return input.includes(this.token.value);
			}
		}
	};
}

