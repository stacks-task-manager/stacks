// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Embedded Bundle Integrity Verification
 *
 * At production build time, esbuild-integrity-plugin replaces placeholders in this file
 * with the bundle hash, RSA signature of that hash, and PEM public key.
 *
 * Threat model: detects modification of the Node server bundle on disk. It does not
 * verify static frontend assets under app/.
 *
 * Skip rules (verification CANNOT be disabled via .env on a built bundle):
 * - Running from TypeScript source (entry ends in .ts/.tsx, e.g. `tsx watch src/index.ts`) skips
 *   verification: placeholders are only replaced by the build plugin, so a TS entry can never be
 *   a built bundle. This is what makes `yarn dev:server` work without any env config. Override
 *   with FORCE_INTEGRITY_CHECK=1 to test the verifier against a fixture.
 * - NODE_ENV=test skips the check from index.ts; tests can call verifyEmbeddedIntegrity directly.
 * - Entry file is process.argv[1] or this module path; unusual launchers may need adjustment.
 *
 * Note: NODE_ENV=development does NOT skip the check on a built bundle. Bypass via .env was
 * removed because production servers must not be downgradable by an env edit.
 */

import * as crypto from "crypto";
import * as fs from "fs";

/**
 * Recompute the SHA-256 of bundle text after substituting embedded integrity fields
 * with placeholders (same algorithm as runtime verification and the build plugin).
 */
export function computeNormalizedBundleHash(
    bundleUtf8: string,
    embeddedHash: string,
    embeddedSignature: string,
    embeddedPublicKey: string
): string {
    let clean = bundleUtf8;
    clean = clean.split(embeddedHash).join("__BUNDLE_HASH__");
    clean = clean.split(embeddedSignature).join("__BUNDLE_SIGNATURE__");
    clean = clean.split(embeddedPublicKey).join("__PUBLIC_KEY__");
    return crypto.createHash("sha256").update(Buffer.from(clean)).digest("hex");
}

/**
 * Hash + RSA signature check for an in-memory bundle string (used by tests and file verifier).
 */
export function verifyIntegrityPayload(
    bundleUtf8: string,
    embeddedHash: string,
    embeddedSignature: string,
    embeddedPublicKey: string
): boolean {
    try {
        const currentHash = computeNormalizedBundleHash(
            bundleUtf8,
            embeddedHash,
            embeddedSignature,
            embeddedPublicKey
        );
        if (currentHash !== embeddedHash) {
            return false;
        }
        const verify = crypto.createVerify("RSA-SHA256");
        verify.update(embeddedHash);
        return verify.verify(embeddedPublicKey, embeddedSignature, "hex");
    } catch {
        return false;
    }
}

/**
 * Read a bundle file and verify embedded hash + signature (same rules as production).
 */
export function verifyBundleIntegrityAtPath(
    bundlePath: string,
    embeddedHash: string,
    embeddedSignature: string,
    embeddedPublicKey: string
): boolean {
    try {
        if (!fs.existsSync(bundlePath)) {
            return false;
        }
        const bundleUtf8 = fs.readFileSync(bundlePath, "utf8");
        return verifyIntegrityPayload(bundleUtf8, embeddedHash, embeddedSignature, embeddedPublicKey);
    } catch {
        return false;
    }
}

// These values are replaced during build time by esbuild-integrity-plugin.
//
// The sentinels are intentionally DIFFERENT from the canonical placeholders used by
// `computeNormalizedBundleHash` (`__BUNDLE_HASH__`, `__BUNDLE_SIGNATURE__`, `__PUBLIC_KEY__`).
// After minification, those canonical placeholders also appear as string literals inside the
// function body (`split(...).join("__BUNDLE_HASH__")`). If the plugin targeted the canonical
// names it would replace the function-body literal instead of these constants, breaking both
// the placeholder check below AND the normalization step. Using unique sentinels here makes
// the plugin's replacement target unambiguous.
const EMBEDDED_HASH = "__INTEGRITY_EMBED_HASH__";
const EMBEDDED_SIGNATURE = "__INTEGRITY_EMBED_SIG__";
const EMBEDDED_PUBLIC_KEY = "__INTEGRITY_EMBED_PUB__";

/** SHA-256 hex digest = exactly 64 lowercase hex characters. */
function isHexHash(s: string): boolean {
    return /^[0-9a-f]{64}$/.test(s);
}

/** RSA-SHA256 signature embedded as hex; length depends on key size but always even and >= 256. */
function isHexSignature(s: string): boolean {
    return /^[0-9a-f]+$/.test(s) && s.length >= 256 && s.length % 2 === 0;
}

/** PEM-encoded RSA public key wrapper. */
function isPemPublicKey(s: string): boolean {
    return s.includes("-----BEGIN PUBLIC KEY-----") && s.includes("-----END PUBLIC KEY-----");
}

/**
 * Verify the integrity of the current bundle using embedded data
 */
export function verifyEmbeddedIntegrity(): boolean {
    const forceCheck = process.env.FORCE_INTEGRITY_CHECK === "1";

    // Skip when running from TypeScript source (e.g. `tsx watch src/index.ts`).
    // Placeholders are only replaced by the esbuild integrity plugin during
    // `yarn build:server`/`bundle`, so a `.ts` entry can never be a built bundle.
    // This is the ONLY skip path for normal startup — there is intentionally no
    // env-based override (NODE_ENV=development used to skip and was removed so
    // production servers cannot be downgraded by editing .env).
    const entryPath = process.argv[1] || "";
    const isRunningFromSource = entryPath.endsWith(".ts") || entryPath.endsWith(".tsx");
    if (isRunningFromSource && !forceCheck) {
        console.log("🔧 Running from TypeScript source - skipping embedded integrity verification");
        return true;
    }

    try {
        console.log("🔍 Verifying embedded bundle integrity...");

        // Verify the build plugin replaced the sentinels with real values.
        // Use SHAPE checks (length/format) on the actual values rather than string-equality
        // against the sentinel literals: the plugin's replace-all touches every occurrence of
        // the sentinel in the bundle, including any literal we'd put in this check, which
        // would make a string-equality test trivially true. Shape checks also catch corrupt
        // or partial substitutions that would otherwise pass an "is sentinel?" test.
        if (!isHexHash(EMBEDDED_HASH) || !isHexSignature(EMBEDDED_SIGNATURE) || !isPemPublicKey(EMBEDDED_PUBLIC_KEY)) {
            console.error("🚨 Integrity data not properly embedded in bundle");
            return false;
        }

        // Get the current bundle file
        const bundlePath = process.argv[1] || __filename;

        if (!fs.existsSync(bundlePath)) {
            console.error("🚨 Bundle file not found:", bundlePath);
            return false;
        }

        const bundleUtf8 = fs.readFileSync(bundlePath, "utf8");
        const currentHash = computeNormalizedBundleHash(
            bundleUtf8,
            EMBEDDED_HASH,
            EMBEDDED_SIGNATURE,
            EMBEDDED_PUBLIC_KEY
        );

        if (currentHash !== EMBEDDED_HASH) {
            console.error("🚨 Embedded integrity check failed");
            console.error("🚨 Bundle hash mismatch - file has been modified");
            console.error(`Expected: ${EMBEDDED_HASH}`);
            console.error(`Actual: ${currentHash}`);
            return false;
        }

        const verify = crypto.createVerify("RSA-SHA256");
        verify.update(EMBEDDED_HASH);
        const isValid = verify.verify(EMBEDDED_PUBLIC_KEY, EMBEDDED_SIGNATURE, "hex");

        if (!isValid) {
            console.error("🚨 Embedded signature verification failed");
            console.error("🚨 Bundle signature is invalid - may be tampered with");
            return false;
        }

        console.log("✅ Embedded bundle integrity verification successful");
        return true;
    } catch (error) {
        console.error(
            "🚨 Embedded integrity verification error:",
            error instanceof Error ? error.message : String(error)
        );
        return false;
    }
}

/**
 * Enforce embedded integrity and exit if verification fails
 */
export function enforceEmbeddedIntegrity(): void {
    const isValid = verifyEmbeddedIntegrity();

    if (!isValid) {
        console.error("🚨 SECURITY VIOLATION: Embedded bundle integrity check failed");
        console.error("🚨 Application will not start due to potential tampering");
        console.error("🚨 The bundle has been modified or corrupted");
        process.exit(1);
    }
}

/**
 * Initialize embedded integrity checking - call this early in your application
 */
export function initializeEmbeddedIntegrityCheck(enforce: boolean = true): boolean {
    if (enforce) {
        enforceEmbeddedIntegrity();
        return true;
    } else {
        return verifyEmbeddedIntegrity();
    }
}
