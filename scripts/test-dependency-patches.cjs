// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const braces = require("braces");
const forge = require("node-forge");

const ganttPackage = require("../third-party/rc-gantt/package.json");
const ganttBundle = fs.readFileSync(
    path.join(__dirname, "../third-party/rc-gantt/dist/index.esm.js"),
    "utf8"
);
assert.equal(ganttPackage.version, "0.3.3");
assert.doesNotMatch(ganttBundle, /\r/);
for (const dependency of ["lodash/debounce", "lodash/find", "lodash/throttle"]) {
    assert.ok(
        ganttBundle.includes(`from '${dependency}'`),
        `${dependency} must resolve from the patched runtime dependency`
    );
}
assert.doesNotMatch(ganttBundle, /HASH_UNDEFINED|Built-in method references/);

assert.deepEqual(braces("{a,b}", { expand: true }), ["a", "b"]);
assert.equal(braces.compile("{a,b}"), "(a|b)");
assert.deepEqual(braces.expand("{a,b}"), ["a", "b"]);

for (const [open, close] of [
    ["{", "}"],
    ["(", ")"],
]) {
    for (const method of ["compile", "expand"]) {
        const pattern = open.repeat(4000) + "x" + close.repeat(4000);
        const result = spawnSync(
            process.execPath,
            [
                "-e",
                `const braces = require("braces");
try {
    braces[process.argv[1]](process.argv[2]);
    process.exitCode = 2;
} catch (error) {
    if (error.name !== "SyntaxError" || !/max depth/.test(error.message)) process.exitCode = 3;
}`,
                method,
                pattern,
            ],
            { timeout: 5000 }
        );
        assert.equal(result.error, undefined, `${method} exceeded the 5 second deadline`);
        assert.equal(result.status, 0, `${method} did not reject the nested string safely`);
    }
}

for (const method of ["compile", "expand"]) {
    const result = spawnSync(
        process.execPath,
        [
            "-e",
            `const braces = require("braces");
const ast = { type: "root", nodes: [] };
let node = ast;
for (let index = 0; index < 5000; index++) {
    const child = { type: "brace", nodes: [], parent: node, invalid: false, dollar: false };
    node.nodes.push(child);
    node = child;
}
node.nodes.push({ type: "text", value: "leaf", parent: node });
try {
    braces[process.argv[1]](ast);
    process.exitCode = 2;
} catch (error) {
    if (error.name !== "SyntaxError" || !/max depth/.test(error.message)) process.exitCode = 3;
}`,
            method,
        ],
        { timeout: 5000 }
    );
    assert.equal(result.error, undefined, `${method} exceeded the 5 second AST deadline`);
    assert.equal(result.status, 0, `${method} did not reject a deeply nested AST safely`);
}

const modulus = new forge.jsbn.BigInteger(
    "E932AC92252F585B3A80A4DD76A897C8B7652952FE788F6EC8DD640587A1EE56" +
        "47670A8AD4C2BE0F9FA6E49C605ADF77B5174230AF7BD50E5D6D6D6D28CCF0A8" +
        "86A514CC72E51D209CC772A52EF419F6A953F3135929588EBE9B351FCA61CED7" +
        "8F346FE00DBB6306E5C2A4C6DFC3779AF85AB417371CF34D8387B9B30AE46D7A" +
        "5FF5A655B8D8455F1B94AE736989D60A6F2FD5CADBFFBD504C5A756A2E6BB5CE" +
        "CC13BCA7503F6DF8B52ACE5C410997E98809DB4DC30D943DE4E812A47553DCE5" +
        "4844A78E36401D13F77DC650619FED88D8B3926E3D8E319C80C744779AC5D6AB" +
        "E252896950917476ECE5E8FC27D5F053D6018D91B502C4787558A002B9283DA7",
    16
);
const publicKey = forge.pki.rsa.setPublicKey(modulus, new forge.jsbn.BigInteger("3"));
const forgedSignature =
    "a4ae63dd5e7712b78f4870d0f51e294df5503d4f16c5d27ae33370981fb57f0de49f" +
    "50f3d6a04666774cd984cd13972db9bf8e12bd294ef0ddc916c7c86cbae63efd7b6b" +
    "97885e69760c208a40f1aecc76a90d7af5145177efce1bb55807a8d05c20b1596753" +
    "ba710642fc9acdde6c160232654662c77cc4466c8257a38edb49f894e8845d0fd987" +
    "b857ced88f4b62505a080bd87ef700d35d392a6e8f6fde34250c50b86fae606cb551" +
    "215e8f4813239b77651d5565ad453698c071d48c31e8e526fb4a37610f64b3e1fb8e" +
    "5be5898e408ad08197a0947794a530b54f84485377ce4a7488ed485ce4e5e105dd89" +
    "698a472f390c3b1b76bc16b73276c4d1c81d";
const digest = forge.md.sha256.create();
digest.update("hello world!");

assert.throws(
    () =>
        publicKey.verify(digest.digest().getBytes(), forge.util.hexToBytes(forgedSignature), undefined, {
            _skipPaddingChecks: true,
        }),
    /ASN\.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value/
);

const mobileDirectory = path.join(__dirname, "../packages/mobile");
const codeSigningEntry = require.resolve("@expo/code-signing-certificates", {
    paths: [mobileDirectory],
});
const codeSigning = createRequire(codeSigningEntry)("@expo/code-signing-certificates");
const codeSigningKeyPair = codeSigning.generateKeyPair();
const codeSigningCertificate = codeSigning.generateSelfSignedCodeSigningCertificate({
    keyPair: codeSigningKeyPair,
    validityNotBefore: new Date(Date.now() - 1000),
    validityNotAfter: new Date(Date.now() + 60_000),
    commonName: "local-security-regression",
});
assert.doesNotThrow(() =>
    codeSigning.validateSelfSignedCertificate(codeSigningCertificate, codeSigningKeyPair)
);

const appDirectory = path.join(__dirname, "../packages/app");
const svgoConsumers = [
    {
        entry: "@svgr/plugin-svgo",
        plugin: "removeScriptElement",
    },
    {
        entry: "postcss-svgo",
        plugin: "removeScripts",
    },
];
const executableSvgInputs = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><svg:a href="java\tscript:alert(1)">x</svg:a></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml" onload="alert(1)">x</div></foreignObject></svg>`,
];

for (const consumer of svgoConsumers) {
    const consumerEntry = require.resolve(consumer.entry, { paths: [appDirectory] });
    const { optimize } = createRequire(consumerEntry)("svgo");

    for (const svg of executableSvgInputs) {
        const output = optimize(svg, { plugins: [consumer.plugin] }).data;
        assert.doesNotMatch(output, /javascript:/i, `${consumer.entry} retained an executable SVG link`);
        assert.doesNotMatch(output, /onload=/i, `${consumer.entry} retained an executable event handler`);
    }
}

console.log("Dependency security backport regressions passed");
