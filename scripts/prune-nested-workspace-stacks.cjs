/**
 * Yarn 1 workspaces sometimes materialize `file:../…` deps under
 * `packages/<pkg>/node_modules/@stacks/*` as stale directory copies (no dist).
 * Node resolves those before the root workspace symlinks, causing MODULE_NOT_FOUND.
 * Remove those trees so resolution uses root `node_modules/@stacks/*` → `packages/*`.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const targets = [
    path.join(root, "packages/server/node_modules/@stacks"),
    path.join(root, "packages/email-service/node_modules/@stacks"),
    path.join(root, "packages/mobile/node_modules/@stacks"),
];

for (const dir of targets) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch {
        /* ignore */
    }
}
