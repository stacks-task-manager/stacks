# Tiptap Pro extensions (optional)

Stacks does not currently depend on any [Tiptap Pro](https://tiptap.dev/pro) extensions out of the box. The editor in `@stacks/app` uses Tiptap's open-source extensions only, which install from the public npm registry without any authentication.

If you want to **add a Tiptap Pro extension** (for example `@tiptap-pro/extension-emoji`, `@tiptap-pro/extension-mention-pro`, etc.), you need:

1. A Tiptap Pro account — sign up at <https://tiptap.dev/pro>.
2. Your **registry auth token** from the [Tiptap Pro dashboard → Account → Settings](https://cloud.tiptap.dev/account/settings) (the "npm token" / "registry token" — it looks like a short opaque string).

## Table of Contents

-   [How to wire it up locally](#how-to-wire-it-up-locally)
-   [CI / production](#ci-production)
-   [If you accidentally commit the token](#if-you-accidentally-commit-the-token)
-   [Why we don't ship the registry block by default](#why-we-dont-ship-the-registry-block-by-default)

## How to wire it up locally

### 1. Export the token in your shell

Add to your shell rc file (`~/.zshrc`, `~/.bashrc`, `~/.config/fish/config.fish`, etc.):

```bash
# Bash / zsh
export TIPTAP_NPM_TOKEN="your-tiptap-pro-token-here"

# fish
set -gx TIPTAP_NPM_TOKEN "your-tiptap-pro-token-here"
```

Open a fresh terminal so the variable is picked up, or `source` your rc file.

### 2. Add the `npmScopes` block back to `.yarnrc.yml`

The repo ships `.yarnrc.yml` without a Tiptap registry block — add it back when you need it:

```yaml
npmScopes:
    tiptap-pro:
        npmAlwaysAuth: true
        npmAuthToken: "${TIPTAP_NPM_TOKEN}"
        npmRegistryServer: "https://registry.tiptap.dev/"
```

> **⚠ Never paste the token literal here.** Always use the `${TIPTAP_NPM_TOKEN}` form so the secret stays in your environment and out of git.

### 3. Add the Tiptap Pro package to the workspace that needs it

```bash
yarn workspace @stacks/app add @tiptap-pro/extension-emoji
```

`yarn install` will use `TIPTAP_NPM_TOKEN` from your environment to authenticate against `https://registry.tiptap.dev/`.

## CI / production

In CI, set `TIPTAP_NPM_TOKEN` as a GitHub Actions secret and expose it to the install step:

```yaml
- name: Install
  env:
      TIPTAP_NPM_TOKEN: ${{ secrets.TIPTAP_NPM_TOKEN }}
  run: yarn install --immutable
```

For Docker production builds, pass the token in as a build-time secret (BuildKit `--secret`) — do not bake it into the image layer.

## If you accidentally commit the token

1. **Rotate it immediately** in the Tiptap Pro dashboard — assume the published value is compromised.
2. Scrub it from history with `git filter-repo --replace-text` (one entry per leaked token), then force-push and ask anyone with a clone to re-clone.
3. Replace the literal in `.yarnrc.yml` with `${TIPTAP_NPM_TOKEN}` per the instructions above.

## Why we don't ship the registry block by default

A `.yarnrc.yml` that references the Tiptap registry will cause `yarn install` to attempt authenticated requests against `registry.tiptap.dev` even if you don't use any Pro packages — which fails noisily for contributors who don't have a token. Keeping the registry block out by default means `yarn install` works for everyone; you opt in only when you need Pro extensions.
