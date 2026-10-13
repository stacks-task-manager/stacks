// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const manifest = require("./needle-assets.json");
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "needle-runtime");
async function prepare() {
    await fs.mkdir(dir, { recursive: true });
    for (const [name, entry] of Object.entries(manifest.files)) {
        const dest = path.join(dir, name);
        let data = await fs.readFile(dest).catch(() => null);
        if (!data || createHash("sha256").update(data).digest("hex") !== entry.sha256) {
            const response = await fetch(
                `https://huggingface.co/Cactus-Compute/needle3/resolve/${manifest.revision}/${entry.remote}`
            );
            if (!response.ok) throw new Error(`Needle download failed: ${response.status}`);
            data = Buffer.from(await response.arrayBuffer());
            if (createHash("sha256").update(data).digest("hex") !== entry.sha256)
                throw new Error(`Needle checksum mismatch: ${name}`);
            await fs.writeFile(dest + ".tmp", data);
            await fs.rename(dest + ".tmp", dest);
        }
    }
    await fs.copyFile(path.join(__dirname, "needle-worker.cjs"), path.join(dir, "worker.cjs"));
    await fs.copyFile(path.join(__dirname, "needle-assets.json"), path.join(dir, "manifest.json"));
    // Redistributed upstream binaries and weights are Apache-2.0; retain their license.
    const license = path.join(dir, "LICENSE");
    if (!(await fs.stat(license).catch(() => null))) {
        const response = await fetch(
            `https://huggingface.co/Cactus-Compute/needle3/resolve/${manifest.revision}/LICENSE`
        );
        if (!response.ok) throw new Error("Needle license download failed");
        await fs.writeFile(license, await response.text());
    }
    if (process.argv.includes("--dist")) {
        await fs.cp(dir, path.join(root, "dist/needle-runtime"), { recursive: true });
    }
}
prepare().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
