const fs = require("fs");
const path = require("path");

let dataSet = [];

for (const file of fs.readdirSync(path.join(__dirname, "data"))) {
	if (!file.endsWith(".json")) {
		continue;
	}

	const data = JSON.parse(fs.readFileSync(path.join(__dirname, "data", file), "utf8"));
	let convertedData = {name: data.name};
	convertedData.list = data.data.map(word => word.equivalents);
	dataSet.push(convertedData);
}

if (!fs.existsSync(path.join(__dirname, "out"))) {
	fs.mkdirSync(path.join(__dirname, "out"))
}
fs.writeFileSync(path.join(__dirname, "out", "data.js"), "export default "+JSON.stringify(dataSet));
