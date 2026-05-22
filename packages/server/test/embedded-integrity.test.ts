// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import * as crypto from "crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    computeNormalizedBundleHash,
    verifyBundleIntegrityAtPath,
    verifyEmbeddedIntegrity,
    verifyIntegrityPayload,
} from "../src/embedded-integrity";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const esbuild = require("esbuild");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { integrityPlugin } = require("../esbuild-integrity-plugin");

/** Build a bundle body and matching hash/signature/public PEM (mirrors esbuild plugin semantics). */
function buildSignedIntegrityFixture(): {
    bundleBody: string;
    bundleHash: string;
    signature: string;
    publicPem: string;
} {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const publicPem = publicKey as string;
    const privateKeyPem = privateKey as string;

    const cleanCanonical =
        "<<<H>>>__BUNDLE_HASH__<<<S>>>__BUNDLE_SIGNATURE__<<<P>>>__PUBLIC_KEY__<<<E>>>";
    const bundleHash = crypto.createHash("sha256").update(Buffer.from(cleanCanonical)).digest("hex");

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(bundleHash);
    const signature = sign.sign(privateKeyPem, "hex");

    const bundleBody = `<<<H>>>${bundleHash}<<<S>>>${signature}<<<P>>>${publicPem}<<<E>>>`;

    return { bundleBody, bundleHash, signature, publicPem };
}

describe("computeNormalizedBundleHash", () => {
    it("matches after placeholder normalization", () => {
        const hash = "abc123";
        const sig = "deadbeef";
        const pub = "my-public-key-pem";
        const bundle = `prefix ${hash} middle ${sig} end ${pub}`;
        const computed = computeNormalizedBundleHash(bundle, hash, sig, pub);
        const expected = computeNormalizedBundleHash(
            "prefix __BUNDLE_HASH__ middle __BUNDLE_SIGNATURE__ end __PUBLIC_KEY__",
            "__BUNDLE_HASH__",
            "__BUNDLE_SIGNATURE__",
            "__PUBLIC_KEY__"
        );
        expect(computed).toBe(expected);
    });

    it("changes when bundle content is tampered", () => {
        const hash = "abc123";
        const sig = "sig";
        const pub = "pub";
        const bundle = `x${hash}y`;
        const good = computeNormalizedBundleHash(bundle, hash, sig, pub);
        const tampered = computeNormalizedBundleHash(`X${hash}y`, hash, sig, pub);
        expect(tampered).not.toBe(good);
    });
});

describe("verifyIntegrityPayload / verifyBundleIntegrityAtPath", () => {
    it("accepts a correctly signed in-memory bundle", () => {
        const f = buildSignedIntegrityFixture();
        expect(computeNormalizedBundleHash(f.bundleBody, f.bundleHash, f.signature, f.publicPem)).toBe(f.bundleHash);
        expect(verifyIntegrityPayload(f.bundleBody, f.bundleHash, f.signature, f.publicPem)).toBe(true);
    });

    it("rejects tampered bundle content", () => {
        const f = buildSignedIntegrityFixture();
        const tampered = `${f.bundleBody}X`;
        expect(verifyIntegrityPayload(tampered, f.bundleHash, f.signature, f.publicPem)).toBe(false);
    });

    it("rejects wrong signature hex", () => {
        const f = buildSignedIntegrityFixture();
        const badSig = "00".repeat(256);
        expect(verifyIntegrityPayload(f.bundleBody, f.bundleHash, badSig, f.publicPem)).toBe(false);
    });

    it("verifies a bundle file on disk", () => {
        const f = buildSignedIntegrityFixture();
        const dir = mkdtempSync(join(tmpdir(), "stacks-integ-"));
        const filePath = join(dir, "fake-bundle.js");
        writeFileSync(filePath, f.bundleBody, "utf8");
        expect(verifyBundleIntegrityAtPath(filePath, f.bundleHash, f.signature, f.publicPem)).toBe(true);
    });

    it("returns false for missing file", () => {
        const f = buildSignedIntegrityFixture();
        expect(
            verifyBundleIntegrityAtPath(
                join(tmpdir(), "nonexistent-bundle-integrity-xyz.js"),
                f.bundleHash,
                f.signature,
                f.publicPem
            )
        ).toBe(false);
    });
});

describe("verifyEmbeddedIntegrity", () => {
    const originalArgv1 = process.argv[1];

    afterEach(() => {
        vi.unstubAllEnvs();
        process.argv[1] = originalArgv1;
    });

    it("skips verification when running from TypeScript source", () => {
        vi.stubEnv("FORCE_INTEGRITY_CHECK", "");
        process.argv[1] = "/fake/path/src/index.ts";
        expect(verifyEmbeddedIntegrity()).toBe(true);
    });

    it("does not skip via NODE_ENV=development on a non-TS entry (env can't bypass on a built bundle)", () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.stubEnv("FORCE_INTEGRITY_CHECK", "");
        process.argv[1] = "/fake/path/dist/index.js";
        expect(verifyEmbeddedIntegrity()).toBe(false);
    });

    it("returns false in production when placeholders were not replaced", () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("FORCE_INTEGRITY_CHECK", "");
        process.argv[1] = "/fake/path/dist/index.js";
        expect(verifyEmbeddedIntegrity()).toBe(false);
    });

    it("FORCE_INTEGRITY_CHECK=1 disables the source-mode skip", () => {
        vi.stubEnv("FORCE_INTEGRITY_CHECK", "1");
        process.argv[1] = "/fake/path/src/index.ts";
        expect(verifyEmbeddedIntegrity()).toBe(false);
    });
});

/**
 * End-to-end build-plugin tests.
 *
 * These actually invoke esbuild + the integrity plugin on a TS source file and verify the
 * resulting bundle. They exist specifically to catch the class of bugs where the runtime
 * verifier passes its own unit tests but the production build pipeline produces a bundle
 * the verifier rejects (or worse, a tampered bundle the verifier accepts).
 *
 * Two regression cases are pinned down:
 *  - The plugin replaces the EMBEDDED_* sentinels (and ONLY them); canonical normalizer
 *    placeholders inside `computeNormalizedBundleHash` MUST survive in the bundle so the
 *    runtime can recompute the same hash. The previous bug stripped them.
 *  - A freshly built bundle passes `verifyBundleIntegrityAtPath`, and tampering with even
 *    one byte causes that check to fail.
 */
describe("integrity build plugin (end-to-end)", () => {
    const entryPath = resolve(__dirname, "..", "src", "embedded-integrity.ts");

    /**
     * Run esbuild + the integrity plugin against the real `src/embedded-integrity.ts` source
     * with the same settings the production `bundle` script uses, into an isolated tmp dir.
     *
     * The plugin's default key path points at `scripts/release-signing/private.pem`, which is
     * (a) absent in CI checkouts and (b) passphrase-encrypted in maintainer checkouts. To keep
     * these tests hermetic, we generate an ephemeral unencrypted keypair per fixture and pass
     * its paths to the plugin instead of using the production keys.
     */
    async function buildIntegrityFixture(): Promise<{
        bundlePath: string;
        bundleContent: string;
        embeddedHash: string;
        embeddedSig: string;
        publicKey: string;
    }> {
        const outDir = mkdtempSync(join(tmpdir(), "stacks-integ-build-"));
        const bundlePath = join(outDir, "server.js");

        const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });
        const privateKeyPath = join(outDir, "private.pem");
        const publicKeyPath = join(outDir, "public.pem");
        writeFileSync(privateKeyPath, privateKey as string, "utf8");
        writeFileSync(publicKeyPath, publicKey as string, "utf8");

        await esbuild.build({
            entryPoints: [entryPath],
            bundle: true,
            platform: "node",
            target: "node18",
            format: "cjs",
            outfile: bundlePath,
            external: ["crypto", "fs"],
            sourcemap: false,
            minify: true,
            keepNames: true,
            logLevel: "silent",
            plugins: [integrityPlugin({ privateKeyPath, publicKeyPath })],
        });

        return {
            bundlePath,
            bundleContent: readFileSync(bundlePath, "utf8"),
            embeddedHash: readFileSync(join(outDir, "server.embedded.hash"), "utf8").trim(),
            embeddedSig: readFileSync(join(outDir, "server.embedded.sig"), "utf8").trim(),
            publicKey: readFileSync(publicKeyPath, "utf8"),
        };
    }

    it("substitutes the EMBEDDED_* sentinels with real values", async () => {
        const f = await buildIntegrityFixture();
        expect(f.bundleContent).not.toContain("__INTEGRITY_EMBED_HASH__");
        expect(f.bundleContent).not.toContain("__INTEGRITY_EMBED_SIG__");
        expect(f.bundleContent).not.toContain("__INTEGRITY_EMBED_PUB__");
        expect(f.embeddedHash).toMatch(/^[0-9a-f]{64}$/);
        expect(f.embeddedSig).toMatch(/^[0-9a-f]+$/);
        expect(f.bundleContent).toContain(f.embeddedHash);
        expect(f.bundleContent).toContain(f.embeddedSig);
    });

    it("preserves the canonical normalizer placeholders inside computeNormalizedBundleHash", async () => {
        // Regression test for the previous bug: the plugin was overwriting the canonical
        // placeholders inside the normalizer body instead of (or in addition to) the
        // EMBEDDED_* constants. The runtime needs the canonical placeholders to survive
        // so it can recompute the same hash that the plugin computed.
        const f = await buildIntegrityFixture();
        expect(f.bundleContent).toContain("__BUNDLE_HASH__");
        expect(f.bundleContent).toContain("__BUNDLE_SIGNATURE__");
        expect(f.bundleContent).toContain("__PUBLIC_KEY__");
    });

    it("produces a bundle that passes verifyBundleIntegrityAtPath", async () => {
        const f = await buildIntegrityFixture();
        expect(verifyBundleIntegrityAtPath(f.bundlePath, f.embeddedHash, f.embeddedSig, f.publicKey)).toBe(true);
    });

    it("rejects a tampered built bundle (single-byte change)", async () => {
        const f = await buildIntegrityFixture();
        const tamperedPath = `${f.bundlePath}.tampered.js`;
        writeFileSync(tamperedPath, `${f.bundleContent}// tamper\n`, "utf8");
        expect(verifyBundleIntegrityAtPath(tamperedPath, f.embeddedHash, f.embeddedSig, f.publicKey)).toBe(false);
    });

    it("rejects a built bundle when the embedded signature does not match the embedded hash", async () => {
        const f = await buildIntegrityFixture();
        const wrongSig = "00".repeat(256);
        expect(verifyBundleIntegrityAtPath(f.bundlePath, f.embeddedHash, wrongSig, f.publicKey)).toBe(false);
    });

    it("the runtime placeholder check passes for a freshly built bundle (verifyEmbeddedIntegrity from inside the bundle)", async () => {
        // Loads the freshly built bundle as a CommonJS module and invokes the bundled copy
        // of `verifyEmbeddedIntegrity`. This is the strongest end-to-end signal: it asserts
        // that the bundle the production pipeline produces would pass its own startup check.
        const f = await buildIntegrityFixture();
        const originalArgv1 = process.argv[1];
        const originalForce = process.env.FORCE_INTEGRITY_CHECK;
        const originalNodeEnv = process.env.NODE_ENV;
        try {
            process.argv[1] = f.bundlePath;
            process.env.NODE_ENV = "production";
            delete process.env.FORCE_INTEGRITY_CHECK;
            // Bypass require cache so we get a fresh module evaluation.
            delete require.cache[require.resolve(f.bundlePath)];
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const builtModule = require(f.bundlePath);
            expect(typeof builtModule.verifyEmbeddedIntegrity).toBe("function");
            expect(builtModule.verifyEmbeddedIntegrity()).toBe(true);
        } finally {
            process.argv[1] = originalArgv1;
            if (originalForce === undefined) {
                delete process.env.FORCE_INTEGRITY_CHECK;
            } else {
                process.env.FORCE_INTEGRITY_CHECK = originalForce;
            }
            if (originalNodeEnv === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = originalNodeEnv;
            }
        }
    });
});
