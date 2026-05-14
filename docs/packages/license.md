# `@stacks/license`

License verification used by the server at startup. Reads a public key and a license file, decrypts and verifies them, and exposes the resulting license payload to the rest of the server. For "server"-typed licenses it can also validate online.

> **⚠ The server will exit (`process.exit(1)`) at startup if the license check fails.** This applies to AGPL / open-source use as well as commercial use. Request a free development key at **[getstacksapp.com/dev-program](https://getstacksapp.com/dev-program/)**.

## Environment

No `.env` file. The package reads two artifacts from `process.cwd()` at the moment `initializeLicense()` runs:

| File | Source path | Description |
| --- | --- | --- |
| `public.pem` | shipped at [`packages/server/public.pem`](../../packages/server/public.pem) | RSA-2048 public key. Copied into the server bundle by `yarn release:server`. |
| `license.key` | obtained via the dev program | Encrypted license file. **Not** checked into git. |

Because the lookup is `process.cwd()`-relative, in development you typically run the server with the `packages/server/` directory as the cwd (which `yarn dev:server` does). In production releases both files sit next to the server bundle in `releases/server/`.

## How it's wired

The server entry calls the initializer during boot:

```ts
// packages/server/src/index.ts (around line 131, inside bootstrap())
await initializeLicense();
```

After that, the rest of the server reads the current license via `getLicense()` — which itself exits the process if called before initialization.

## License payload

The payload (after decryption + signature verification) carries:

- `type` — `"LOCAL"` or `"SERVER"`
- `tenants[]` — array of tenant entries, each with:
  - `name`
  - `expiry`
  - `seats`
  - `admins[]` — entries of `{ firstName, lastName, email }`

The server uses these fields to seed default tenants and to enforce seat limits.

## Failure modes

All failures exit with code `1` and a `❌`-prefixed message:

| Trigger | Message (abbreviated) |
| --- | --- |
| `license.key` missing | `❌ No license file found, exiting at path: …` |
| `license.key` empty | `⚠️ License file is empty, exiting at path: …` |
| `public.pem` missing | `❌ Public key file not found` |
| Decryption failure | `❌ License decryption failed: …` |
| Server license: server unreachable | `❌ License server unreachable: …` |
| Server license: response invalid | `❌ Failed to decrypt server license response: …` |
| Server license: marked invalid | `❌ License server reported license as invalid` |
| Server license: missing expiry | `❌ License server response missing expiry` |
| `getLicense()` called before init | `❌ License not initialized, exiting…` |

## Overview

- [`src/index.ts`](../../packages/license/src/index.ts) — `initializeLicense`, `getLicense`, RSA + AES hybrid decrypt, payload validation

## Related

- [`@stacks/server`](server.md) — the only consumer
