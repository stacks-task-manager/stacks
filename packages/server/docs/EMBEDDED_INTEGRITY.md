# Embedded bundle integrity

The production Node bundle can include an embedded SHA-256 hash and RSA signature (see `esbuild-integrity-plugin.js` and `src/embedded-integrity.ts`).

## Two keypairs, two jobs — don't conflate them

Stacks uses **two independent RSA keypairs**:

| Keypair | Used for | Public key location | Private key holder |
| --- | --- | --- | --- |
| **License-verify** | Decrypting + verifying `license.key` at server boot ([`@stacks/license`](../../license/src/index.ts)) | [`packages/server/public.pem`](../public.pem) — committed to the repo and copied into `releases/server/public.pem` by `yarn release:server` | The maintainer (only). Used to sign each `license.key` distributed via [getstacksapp.com/dev-program](https://getstacksapp.com/dev-program/). |
| **Release-signing** | Signing the built `releases/server.js` bundle so the server can verify it hasn't been tampered with at boot | Embedded **into the bundle** at build time by the esbuild integrity plugin (no shipped file) | Whoever cuts a release (you, CI, a fork maintainer). See [`scripts/release-signing/`](../../../scripts/release-signing/). |

These keys are deliberately separate:

- The license-verify public key is part of the AGPL-distributed source so anyone can verify a maintainer-issued license file. The matching private key never leaves the maintainer's environment.
- The release-signing keypair is **per-release-engineer**, never centralized. Each build embeds its own public key. Compromise of one release-signing key has zero effect on license issuance, and vice versa.

> **Historical note:** before May 2026 the folder was called `scripts/license_keys/`, the `release:server` step copied the bundle-signing public key into `releases/server/public.pem`, and `scripts/sign-and-verify.js` hardcoded the passphrase. All three were tidied up so the two jobs no longer share material.

## Generating a release-signing keypair

Only needed if you build production bundles (`yarn build:server` / `yarn release`). Contributors running `yarn dev` skip the integrity check entirely.

```bash
./scripts/release-signing/generate-keys.sh
export RELEASE_SIGNING_PASSPHRASE='<the passphrase you just set>'
yarn release    # or yarn build:server
```

See [`scripts/release-signing/README.md`](../../../scripts/release-signing/README.md) for the full lifecycle (generation, rotation, what each consumer of the key does).

## Behavior

| Condition | Verification |
|-----------|----------------|
| `NODE_ENV=test` | Skipped in `index.ts` (tests may import helpers directly). |
| Entry file ends in `.ts`/`.tsx` (e.g. `tsx watch src/index.ts`) | Skipped unless `FORCE_INTEGRITY_CHECK=1`. Placeholders are only replaced by the esbuild integrity plugin, so a TS entry can never be a built bundle. |
| Built bundle (`dist/index.js` or similar) | Runs at startup; exits the process on failure. |

`NODE_ENV` is intentionally **not** an override on a built bundle: a production server must not be
downgradable by editing `.env`. The only ways to skip the check on a built bundle are running tests
(`NODE_ENV=test` is honoured by `index.ts`, not the verifier) or rebuilding via the secure pipeline.

## Threat model

- **In scope:** Tampering with the compiled server bundle on disk.
- **Out of scope:** Static files served from `app/`, runtime memory attacks, or a compromised host.

## Operations

- Entry path for the bundle is `process.argv[1]`, or the integrity module path as a fallback.
- Ensure production builds always run through the secure esbuild pipeline so placeholders are replaced.

## Sentinels vs. canonical placeholders

The build plugin and the runtime use **two distinct sets of placeholder strings**:

| Purpose | Strings | Where they live in source | Touched by build plugin? |
|---------|---------|---------------------------|--------------------------|
| Embedded constants (replaced at build) | `__INTEGRITY_EMBED_HASH__`, `__INTEGRITY_EMBED_SIG__`, `__INTEGRITY_EMBED_PUB__` | `const EMBEDDED_*` declarations only | **Yes** — replaced with the actual hash, signature, and PEM. |
| Canonical normalizer placeholders | `__BUNDLE_HASH__`, `__BUNDLE_SIGNATURE__`, `__PUBLIC_KEY__` | Inside `computeNormalizedBundleHash` body | **No** — must remain as literals so the runtime can normalize the on-disk bundle and recompute the same hash that the plugin computed. |

Earlier versions used the canonical placeholders for both jobs. After minification the `computeNormalizedBundleHash` body literals appeared **before** the constant declarations in the bundle, so a single-occurrence `replace()` in the plugin overwrote the wrong copy and left the constants un-substituted. Using two distinct sets makes the plugin's target unambiguous.

The runtime's "are the constants embedded?" check uses **value-shape** validation (64 hex chars for the hash, hex signature with even length ≥ 256, PEM markers in the public key) rather than string-equality against the sentinel literal. This is robust against the plugin's `replaceAll` touching every occurrence of the sentinel in the bundle, including any literal we'd put in a string-equality check.

## Testing helpers

- `computeNormalizedBundleHash` — same normalization as runtime and the esbuild plugin.
- `verifyIntegrityPayload` — hash + RSA verify on an in-memory string.
- `verifyBundleIntegrityAtPath` — read a file and run the same checks (used for fixture tests).

Run `yarn test:unit` in `packages/server` (no database). Full `yarn test` also runs these via the same Vitest unit config entries.

## CI

GitHub Actions workflow `.github/workflows/server-tests.yml`:

- **server-test-unit** — builds `types`, `db`, `license`, installs server, runs `yarn test:unit`.
- **server-test-integration** — Postgres 16 service, `stacks_hono` database, `mkdir app` to avoid static-root noise, runs `yarn test`.
