import {ParseError} from "./common";
import {Parser} from "./parser";
import {Root} from "./generator";

export default class Zatlin {
	private root: Root | null;
	errors: ParseError[];
	warnings: ParseError[];

	load(source: string) {
		let parser = new Parser(source);
		this.root = parser.parse();
		this.errors = parser.errors;
		this.warnings = parser.warnings;
	}

	isAvailable(): boolean {
		return this.root != null;
	}

	generate(): string {
		if (this.root != null) {
			return this.root.generate();
		} else {
			return "";
		}
	}
}
