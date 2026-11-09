const fs = require("fs");
const path = require("path");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

function parseSvg(filePath, fileName) {
    const source = fs.readFileSync(filePath, "utf8");
    if (/<!DOCTYPE/i.test(source)) {
        throw new Error(`DOCTYPE is not allowed in SVG input: ${fileName}`);
    }

    let parseError;
    let document;
    try {
        document = new DOMParser({
            onError: (_level, message) => {
                parseError = message;
            },
        }).parseFromString(source, "image/svg+xml");
    } catch (error) {
        throw new Error(`Invalid SVG input: ${fileName} (${error.message})`);
    }

    if (parseError || document.documentElement?.localName !== "svg") {
        throw new Error(`Invalid SVG input: ${fileName}${parseError ? ` (${parseError})` : ""}`);
    }

    const svg = document.documentElement;
    const viewBox = svg.getAttribute("viewBox") || "0 0 24 24";
    const viewBoxParts = viewBox.trim().split(/[\s,]+/);
    const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
    if (viewBoxParts.length !== 4 || viewBoxParts.some(part => !numberPattern.test(part))) {
        throw new Error(`Invalid SVG viewBox: ${fileName}`);
    }
    const serializer = new XMLSerializer();
    const inner = Array.from(svg.childNodes)
        .map(node => serializer.serializeToString(node))
        .join("")
        .replace(/\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, "")
        .trim();

    return { viewBox, inner };
}

function buildSpriteFromDirectory(directory) {
    const files = fs
        .readdirSync(directory)
        .filter(fileName => fileName.endsWith(".svg"))
        .sort();

    const symbols = files.map(fileName => {
        if (!/^[A-Za-z0-9_-]+\.svg$/.test(fileName)) {
            throw new Error(`Unsafe SVG filename: ${fileName}`);
        }

        const id = fileName.slice(0, -4);
        const { viewBox, inner } = parseSvg(path.join(directory, fileName), fileName);
        return `<symbol id="${id}" viewBox="${viewBox}">\n${inner}\n</symbol>`;
    });

    return `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join(
        "\n"
    )}\n</svg>\n`;
}

function main() {
    const inputDirectory = path.resolve(__dirname, "../svg");
    const outputPath = path.resolve(__dirname, "../src/app/icons/sprites.svg");
    fs.writeFileSync(outputPath, buildSpriteFromDirectory(inputDirectory), "utf8");
}

if (require.main === module) {
    main();
}

module.exports = { buildSpriteFromDirectory };
