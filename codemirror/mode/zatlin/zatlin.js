(function(mod) {
	if (typeof exports == "object" && typeof module == "object") {
		mod(require("../../lib/codemirror"));
	} else if (typeof define == "function" && define.amd) {
		define(["../../lib/codemirror"], mod);
	} else {
		mod(CodeMirror);
	}
})(function(CodeMirror) {
	"use strict";

	CodeMirror.defineMode("zatlin", function() {
		return {
			token: function(stream) {
				if (stream.eat("#")) {
					stream.skipToEnd();
					return "comment";
				}

				if (stream.eat('"')) {
					while (!stream.eol()) {
						stream.eatWhile(/[^"\\]/);
						if (stream.eat('"')) {
							break;
						} else if (stream.eat("\\")) {
							stream.next();
						}
					}
					return "string";
				}

				if (stream.eat(/[\d]/)) {
					stream.eatWhile(/\d/);
					if (stream.eat(".")) {
						stream.eatWhile(/\d/);
					}
					return "number";
				}
				if (stream.eat(".")) {
					stream.eatWhile(/\d/);
					return "number";
				}
				if (stream.eat(/[\dA-Za-z_]/)) {
					stream.eatWhile(/[\dA-Za-z_]/);
					return "variable";
				}

				if (stream.eat(/[=;]/)) {
					return "punctuation";
				}
				if (stream.eat(/[-\|^]/)) {
					return "operator";
				}
				if (stream.eat("%")) {
					return "keyword";
				}

				stream.next();
				return null;
			},

			lineComment: "#",
			closeBrackets: "\"\""
		}
	})
});
