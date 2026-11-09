const fs = require("node:fs");
const path = require("node:path");

const bundlePath = path.join(__dirname, "../dist/index.esm.js");
const bundle = fs.readFileSync(bundlePath, "utf8");
fs.writeFileSync(bundlePath, bundle.replace(/\r\n/g, "\n"));
