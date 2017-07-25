import {Token, ParseError} from "./common";
import {Generator} from "./generator";

export default class Validator {
	errors: ParseError[] = [];
	warnings: ParseError[] = [];
	private stats: {
		[key: string]: {
			processing: boolean,
			processed: boolean,
			referred: boolean,
			previous: string | null,
			referredIdentifier: Token | null,
			loop?: string[]
		}
	};

	constructor(private definitions: { [key: string]: Generator },
				private definitionIdentifiers: { [key: string]: Token },
				private mainGenerator: Generator | null) {
		this.stats = {};
		for (const name of Object.keys(this.definitions)) {
			this.stats[name] = {
				processing: false,
				processed: false,
				referred: false,
				previous: null,
				referredIdentifier: null
			};
		}
	}

	validate() {
		if (this.mainGenerator != null) {
			this.validateDefinition(null, this.mainGenerator);
		}
		for (const name of Object.keys(this.definitions)) {
			this.stats[name].previous = null;
			this.validateDefinition(name, this.definitions[name]);
		}
		for (const name of Object.keys(this.definitions)) {
			if (!this.stats[name].referred) {
				this.warnings.push(new ParseError("Unused identifier", this.definitionIdentifiers[name]));
			}
		}
	}

	validateDefinition(name: string | null, definition: Generator);
	validateDefinition(name: string, definition: Generator, previous: string | null, referredIdentifier: Token);

	validateDefinition(name: string | null,
					   definition: Generator,
					   previous: string | null = null,
					   referredIdentifier: Token | null = null) {
		if (name != null) {
			const stat = this.stats[name];
			if (stat.processed) {
				return;
			}
			stat.previous = previous;
			stat.referredIdentifier = referredIdentifier;
			stat.processing = true;
		}

		for (const identifier of definition.getReferringIdentifiers()) {
			const next = identifier.text;
			const nextStat = this.stats[next];
			if (!this.definitions.hasOwnProperty(next)) {
				this.errors.push(new ParseError("Undefined identifier", identifier));
				continue;
			}
			nextStat.referred = true;

			if (nextStat.processing) {
				this.errors.push(new ParseError("Circular reference involving identifier", identifier));
				let loop: string[] = [];
				if (nextStat.loop) {
					loop = nextStat.loop;
				}
				let current: string | null = name!;
				while (true) {
					if (this.stats[current].loop === loop) {
						break;
					}
					loop.push(current);
					this.stats[current].loop = loop;
					if (current == next) {
						break;
					}
					this.errors.push(new ParseError("Circular reference involving identifier",
						this.stats[current].referredIdentifier!));
					current = this.stats[current].previous!;
				}
			} else {
				this.validateDefinition(next, this.definitions[next], name, identifier);
			}
		}

		if (name != null) {
			const stat = this.stats[name];
			if (stat.loop) {
				if (previous == null || this.stats[previous].loop != stat.loop) {
					for (const nameInLoop of stat.loop) {
						this.stats[nameInLoop].processing = false;
						this.stats[nameInLoop].processed = true;
					}
				}
				return;
			}
			stat.processing = false;
			stat.processed = true;
		}
	}
}
