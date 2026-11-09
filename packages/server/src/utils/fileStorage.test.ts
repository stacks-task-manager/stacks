// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import { lockContentHash } from "./fileStorage";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "fs/promises";
import { createHash } from "crypto";
import os from "os";
import path from "path";
import { unlinkOwnedStorageFile, writeOwnedStorageFile, publishOwnedStorageFile } from "./fileStorage";

let tempRoot: string;

afterEach(async () => {
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
});

describe("physical storage cleanup", () => {
    it("rejects non-hash lock keys before a database call", async () => {
        await expect(lockContentHash({} as any, "../outside")).rejects.toThrow("Invalid content hash");
    });

    it("removes an owned content file inside the canonical storage root", async () => {
        tempRoot = await mkdtemp(path.join(os.tmpdir(), "stacks-storage-"));
        const root = path.join(tempRoot, "uploads");
        await mkdir(root);
        const hash = "a".repeat(64);
        const file = path.join(root, hash);
        await writeFile(file, "private bytes");

        await expect(unlinkOwnedStorageFile(root, hash)).resolves.toBe(true);
        await expect(readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
    });

    it("refuses path traversal and symlinks that point outside the storage root", async () => {
        tempRoot = await mkdtemp(path.join(os.tmpdir(), "stacks-storage-"));
        const root = path.join(tempRoot, "uploads");
        await mkdir(root);
        const outsideFile = path.join(tempRoot, "outside");
        await writeFile(outsideFile, "keep");
        const hash = "b".repeat(64);
        await symlink(outsideFile, path.join(root, hash));

        await expect(unlinkOwnedStorageFile(root, "../outside")).resolves.toBe(false);
        await expect(unlinkOwnedStorageFile(root, hash)).resolves.toBe(false);
        await expect(readFile(outsideFile, "utf8")).resolves.toBe("keep");
    });

    it("does not follow an existing symlink when publishing content", async () => {
        tempRoot = await mkdtemp(path.join(os.tmpdir(), "stacks-storage-"));
        const root = path.join(tempRoot, "uploads");
        await mkdir(root);
        const outsideFile = path.join(tempRoot, "outside");
        await writeFile(outsideFile, "keep");
        const hash = "c".repeat(64);
        await symlink(outsideFile, path.join(root, hash));

        expect(() => writeOwnedStorageFile(root, hash, Buffer.from("overwrite"))).toThrow(
            "Unsafe storage target"
        );
        await expect(readFile(outsideFile, "utf8")).resolves.toBe("keep");
    });

    it("replaces an incomplete orphan before reusing its hash path", async () => {
        tempRoot = await mkdtemp(path.join(os.tmpdir(), "stacks-storage-"));
        const root = path.join(tempRoot, "uploads");
        await mkdir(root);
        const contents = Buffer.from("complete content");
        const hash = createHash("sha256").update(contents).digest("hex");
        const file = path.join(root, hash);
        await writeFile(file, "partial");

        expect(writeOwnedStorageFile(root, hash, contents)).toBe(true);
        await expect(readFile(file)).resolves.toEqual(contents);
    });

    it("publishes a request-owned temp file at its content hash without buffering it", async () => {
        tempRoot = await mkdtemp(path.join(os.tmpdir(), "stacks-storage-"));
        const root = path.join(tempRoot, "uploads");
        await mkdir(root);
        const contents = Buffer.from("streamed upload content");
        const hash = createHash("sha256").update(contents).digest("hex");
        const source = path.join(root, ".upload-fixture.tmp");
        const target = path.join(root, hash);
        await writeFile(source, contents, { mode: 0o600 });

        await expect(publishOwnedStorageFile(root, source, hash, contents.length)).resolves.toBe(true);
        await expect(readFile(target)).resolves.toEqual(contents);
        await expect(readFile(source)).rejects.toMatchObject({ code: "ENOENT" });
    });

    it("keeps a valid deduplicated object and rejects unsafe upload sources", async () => {
        tempRoot = await mkdtemp(path.join(os.tmpdir(), "stacks-storage-"));
        const root = path.join(tempRoot, "uploads");
        await mkdir(root);
        const contents = Buffer.from("shared content");
        const hash = createHash("sha256").update(contents).digest("hex");
        const source = path.join(root, ".upload-fixture.tmp");
        await writeFile(source, contents, { mode: 0o600 });
        writeOwnedStorageFile(root, hash, contents);

        await expect(publishOwnedStorageFile(root, source, hash, contents.length)).resolves.toBe(false);
        await expect(readFile(source)).resolves.toEqual(contents);
        await expect(publishOwnedStorageFile(root, path.join(tempRoot, "outside"), hash, 0)).rejects.toThrow(
            "Unsafe upload source"
        );
    });
});
