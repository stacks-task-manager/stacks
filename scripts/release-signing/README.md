# Release signing

This folder holds the **release-signing keypair** used to verify that a built `releases/server.js` bundle hasn't been tampered with between build and deploy. It is **not** the keypair used to issue Stacks license files — that's a separate concern.

> Cleanup history: this folder used to be called `scripts/license_keys/`. The name was misleading — it confused bundle integrity with license issuance, and the `release:server` step in the root `package.json` was accidentally copying the bundle-signing public key into `releases/server/public.pem` where the license verifier expected the *license-verify* public key. Both have been separated; see [`packages/server/docs/EMBEDDED_INTEGRITY.md`](../../packages/server/docs/EMBEDDED_INTEGRITY.md) for the full model.

## When you need a keypair here

Only when you're **cutting a production release** of `@stacks/server`:

- Contributors running `yarn dev` never touch this — the bundle integrity check is skipped on TypeScript sources (`NODE_ENV !== "production"`).
- CI / release engineers running `yarn build:server` or `yarn release` **do** need a keypair, because the esbuild integrity plugin signs the bundle at build time.

If you're a fork maintainer producing your own builds, generate your own keypair below — don't try to reuse anyone else's.

## Generating a keypair

Run the helper:

```bash
./scripts/release-signing/generate-keys.sh
```

It will:

1. Prompt for a passphrase (or read it from `$RELEASE_SIGNING_PASSPHRASE` if set).
2. Generate a 2048-bit RSA private key, encrypted with that passphrase, into `scripts/release-signing/private.pem`.
3. Extract the matching public key into `scripts/release-signing/public.pem`.

Both `*.pem` files are gitignored — they should never be committed.

## Running a release

```bash
export RELEASE_SIGNING_PASSPHRASE='<your passphrase>'
yarn release      # or `yarn build:server` for just the bundle
```

Two things use this passphrase:

| Step | Where | What it signs |
| --- | --- | --- |
| `yarn build:server` (esbuild integrity plugin) | [`packages/server/esbuild-integrity-plugin.js`](../../packages/server/esbuild-integrity-plugin.js) | Embeds hash + signature + public key into `dist/server.js` |
| `node scripts/sign-and-verify.js` (legacy / standalone) | [`../sign-and-verify.js`](../sign-and-verify.js) | Produces detached `releases/server.hash` + `releases/server.sig` |

Both honour `RELEASE_SIGNING_PASSPHRASE`. The esbuild plugin treats it as optional (an unencrypted key still works); the standalone script requires it.

## Rotation

If a passphrase is ever exposed (or you suspect the private key file leaked):

1. Generate a fresh keypair with `generate-keys.sh`.
2. Re-run any release builds — old `dist/server.js` bundles will continue to verify against the old embedded key inside them, but new builds will sign with the new key.
3. Update your CI secret store with the new `RELEASE_SIGNING_PASSPHRASE`.
4. Securely delete the old private key file.

The license-verify keypair (`packages/server/public.pem` + the private key the maintainer keeps for issuing `license.key` files) is **independent** of this folder — rotating one doesn't affect the other.
