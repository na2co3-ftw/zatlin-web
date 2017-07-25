import CodeMirror from "./codemirror/lib/codemirror";
import "./codemirror/lib/codemirror.css";

import "./codemirror/theme/neat.css";

import "./codemirror/addon/edit/closebrackets";
import "./codemirror/addon/selection/active-line";
import "./codemirror/addon/lint/lint";
import "./codemirror/addon/lint/lint.css";

import "./codemirror/mode/zatlin/zatlin";
import Zatlin from "./zatlin/zatlin";
import dataset from "./data/out/data.js";

const DEFAULT_ZTL = `V = "a" 3 | "e" 3 | "i" 2 | "o" 2 | "u" 2
C = "s" | "z" | "t" | "d" | "k" | "g" | "f" | "v" | "n" | "h"
# 母音と子音
yV = V | "y" V - "yi"
# 半母音のパターン
# ただし「yi」は除外
% V | C yV | yV C | C yV C | C yV C C | C C yV C | C C yV C C - "fy" | "vy" | "h"^
# CCVCC までの 1 音節の単語を生成
# ただし「fy」と「vy」を含んでいたり「h」で終わったりするものは生成しない
`;

document.addEventListener("DOMContentLoaded", function () {
	const zatlin = new Zatlin();
	let words = [];

	const dataSelect = document.getElementById("data");
	dataset.forEach((data, index) => {
		const option = document.createElement("option");
		option.innerText = data.name;
		option.setAttribute("value", index);
		dataSelect.appendChild(option);
	});

	let editor = CodeMirror(document.getElementById("editor"), {
		value: DEFAULT_ZTL,
		mode: "zatlin",
		theme: "neat",
		styleActiveLine: true,
		autoCloseBrackets: true,
		gutters: ["CodeMirror-lint-markers"],
		lint: function (source) {
			zatlin.load(source);
			const errors = zatlin.errors.map(zatlinParseErrorToLintMarker("error"));
			const warnings = zatlin.warnings.map(zatlinParseErrorToLintMarker("warning"));
			return errors.concat(warnings);
		}
	});

	function zatlinParseErrorToLintMarker(severity) {
		return error => ({
			message: error.message,
			severity: severity,
			from: CodeMirror.Pos(error.token.lineNumber, error.token.columnNumber),
			to: CodeMirror.Pos(error.token.lineNumber, error.token.columnNumber + error.token.text.length)
		});
	}

	document.getElementById("generate").addEventListener("click", () => {
		if (!zatlin.isAvailable()) {
			return;
		}

		const notDupplicate = document.getElementById("not-dupplicate").checked;
		words = [];
		for (const word of dataset[dataSelect.value].list) {
			let generated;
			if (notDupplicate) {
				let i;
				for (i = 0; i < 100; i++) {
					generated = zatlin.generate();
					if (!words.some(word => word.form == generated)) {
						break;
					}
				}
				if (i == 100) {
					break;
				}
			} else {
				generated = zatlin.generate();
			}
			words.push({form: generated, translations: word});
		}

		document.getElementById("out").innerText = words.map(word =>
			word.translations.length != 0 ? `${word.form}: ${word.translations.join(", ")}` : word.form
		).join("\n");
	});

	document.getElementById("import").addEventListener("change", e => {
		for (const file of e.target.files) {
			const reader = new FileReader();
			reader.addEventListener("load", e => {
				let contents = e.target.result;
				//contents = contents.replace(/\r\n?/g, "\n");
				editor.setValue(contents);
			});
			reader.readAsText(file);
		}
	});

	document.getElementById("json-export").addEventListener("click", () => {
		let otm = {
			words: words.map((word, index) => ({
				entry: {id: index, form: word.form},
				translations: [{title: "", forms: word.translations}],
				tags: [], contents: [], variations: [], relations: []
			}))
		};
		let blob = new Blob([JSON.stringify(otm, null, "  ")], {type: "application/json"});
		if (window.navigator.msSaveBlob) {
			window.navigator.msSaveBlob(blob, "dictionary.json");
		} else {
			let a = document.createElement("a");
			a.download = "dictionary.json";
			a.href = window.URL.createObjectURL(blob);
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}
	});
});
