// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AttachmentEntity, sequelize } from "@stacks/db";
import {
    chmodSync,
    constants,
    closeSync,
    lstatSync,
    openSync,
    realpathSync,
    readFileSync,
    renameSync,
    unlinkSync,
    writeFileSync,
} from "fs";
import { createHash, randomUUID } from "crypto";
import { chmod, lstat, realpath, rename, unlink } from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import type { Transaction } from "sequelize";

const CONTENT_HASH = /^[a-f0-9]{64}$/;
const STORAGE_BASENAME = /^[a-f0-9]{64}(?:_(?:small|large)\.jpg)?$/;

export async function lockContentHash(transaction: Transaction, hash: string): Promise<void> {
    if (!CONTENT_HASH.test(hash)) throw new Error("Invalid content hash");
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended(:hash, 0))", {
        replacements: { hash },
        transaction,
    });
}

export function countGlobalLiveAttachments(fileId: string, transaction: Transaction): Promise<number> {
    return AttachmentEntity.count({ where: { fileId, deleted: null }, transaction });
}

export function writeOwnedStorageFile(root: string, hash: string, contents: Buffer): boolean {
    if (!CONTENT_HASH.test(hash)) throw new Error("Invalid content hash");
    const rootInfo = lstatSync(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("Unsafe storage root");
    const canonicalRoot = realpathSync(root);
    const target = path.resolve(canonicalRoot, hash);
    if (path.dirname(target) !== canonicalRoot) throw new Error("Unsafe storage target");

    try {
        const targetInfo = lstatSync(target);
        if (!targetInfo.isFile() || targetInfo.isSymbolicLink() || realpathSync(target) !== target) {
            throw new Error("Unsafe storage target");
        }
        if (targetInfo.size === contents.length) {
            const currentHash = createHash("sha256").update(readFileSync(target)).digest("hex");
            if (currentHash === hash) {
                chmodSync(target, 0o600);
                return false;
            }
        }
    } catch (error: any) {
        if (error?.code !== "ENOENT") throw error;
    }

    const temporaryPath = path.join(canonicalRoot, `.${hash}.${randomUUID()}.tmp`);
    let fileDescriptor: number | undefined;
    try {
        fileDescriptor = openSync(
            temporaryPath,
            constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
            0o600
        );
        writeFileSync(fileDescriptor, contents);
        closeSync(fileDescriptor);
        fileDescriptor = undefined;
        renameSync(temporaryPath, target);
        chmodSync(target, 0o600);
        return true;
    } catch (error: any) {
        try {
            unlinkSync(temporaryPath);
        } catch {}
        throw error;
    } finally {
        if (fileDescriptor !== undefined) closeSync(fileDescriptor);
    }
}

/** Atomically publishes an owned upload temp file without materializing its contents in memory. */
export async function publishOwnedStorageFile(
    root: string,
    sourcePath: string,
    hash: string,
    size: number
): Promise<boolean> {
    if (!CONTENT_HASH.test(hash)) throw new Error("Invalid content hash");
    const rootInfo = await lstat(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("Unsafe storage root");
    const canonicalRoot = await realpath(root);
    const sourcePathResolved = path.resolve(sourcePath);
    const sourceName = path.basename(sourcePathResolved);
    if (!sourceName.startsWith(".upload-") || !sourceName.endsWith(".tmp")) {
        throw new Error("Unsafe upload source");
    }
    const sourceInfo = await lstat(sourcePathResolved);
    const source = await realpath(sourcePathResolved);
    if (!sourceInfo.isFile() || sourceInfo.isSymbolicLink() || path.dirname(source) !== canonicalRoot) {
        throw new Error("Unsafe upload source");
    }
    if (sourceInfo.size !== size) throw new Error("Upload size changed before publication");

    const target = path.resolve(canonicalRoot, hash);
    if (path.dirname(target) !== canonicalRoot) throw new Error("Unsafe storage target");
    try {
        const targetInfo = await lstat(target);
        if (!targetInfo.isFile() || targetInfo.isSymbolicLink() || (await realpath(target)) !== target) {
            throw new Error("Unsafe storage target");
        }
        if (targetInfo.size === size) {
            const digest = createHash("sha256");
            for await (const chunk of createReadStream(target)) digest.update(chunk);
            if (digest.digest("hex") === hash) {
                await chmod(target, 0o600);
                return false;
            }
        }
    } catch (error: any) {
        if (error?.code !== "ENOENT") throw error;
    }

    await rename(source, target);
    await chmod(target, 0o600);
    return true;
}

export async function unlinkOwnedStorageFile(root: string, basename: string): Promise<boolean> {
    if (!STORAGE_BASENAME.test(basename) || path.basename(basename) !== basename) return false;

    try {
        const rootInfo = await lstat(root);
        if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) return false;
        const canonicalRoot = await realpath(root);
        const target = path.resolve(canonicalRoot, basename);
        if (path.dirname(target) !== canonicalRoot) return false;

        const targetInfo = await lstat(target);
        if (!targetInfo.isFile() || targetInfo.isSymbolicLink()) return false;
        const canonicalTarget = await realpath(target);
        if (canonicalTarget !== target || path.dirname(canonicalTarget) !== canonicalRoot) return false;

        await unlink(target);
        return true;
    } catch (error: any) {
        if (error?.code === "ENOENT") return false;
        throw error;
    }
}
