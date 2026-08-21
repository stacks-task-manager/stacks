# `@stacks/locales-tui`

A terminal UI for managing the locale JSON files used by `@stacks/server` and `@stacks/app`. Built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal). It is also the canonical set of helper functions for validating and editing locale files — **check these before hand-editing locale JSON.**

## Table of Contents

- [Environment](#environment)
- [Development](#development)
- [Usage](#usage)
- [Agent guidance](#agent-guidance)
- [Overview](#overview)
- [Related](#related)

## Environment

None.

## Development

From the repo root:

```bash
yarn dev:locales      # alias for `yarn workspace @stacks/locales-tui start`
```

The `start` script runs `tsx src/cli.tsx` so no build step is needed.

## Usage

The TUI manages two sections: **Server** (`packages/server/locales/server`) and **App** (`packages/server/locales/app`). It lets you browse locales, find untranslated keys, add/edit entries, sync missing keys from English, and report unused English keys. Keyboard shortcuts (see [`src/App.tsx`](../../packages/locales-tui/src/App.tsx)):

| Key                 | Action                                                        |
| ------------------- | ------------------------------------------------------------- |
| `↑` / `↓` / `Enter` | Navigate menus and confirm selections                         |
| `Esc`               | Back / cancel                                                 |
| `u`                 | Toggle untranslated-only filter                               |
| `/`                 | Enter search mode (filter by key or value)                    |
| `d`                 | Delete key _(English locale only — it's the source of truth)_ |
| `r`                 | Rename key _(English locale only)_                            |

Workspace actions (from the language picker): **Add new language**, **Sync translations** (refill missing/empty/`*…*` placeholder keys from English), **Show unused English keys**. From an English locale you can also **Add new translation** — the TUI suggests similar existing keys/values via `findSimilarEntries` before you commit a new key.

Locale files are loaded from the server and app locale directories; edits are written back as JSON (alphabetized, 4-space indent).

## Agent guidance

This package already implements every locale operation. **Use these functions instead of hand-editing the JSON** when you need to check or modify translations:

- `findSimilarEntries(en, key, value, threshold)` — find an already-translated alternative for a candidate key/value before creating a new key.
- `addEnglishEntry(dir, key, value)` — add a new English key (source of truth; throws if it already exists).
- `updateEnglishValue` / `updateLocaleValue` — edit a value in a specific file.
- `syncMissingKeysFromEn(dir)` — refill missing/empty/placeholder keys across all locales from English.
- `renameKeyAcrossLocales` / `deleteKeyAcrossLocales` — rename/remove a key everywhere.
- `addLanguageFile(dir, localeId)` — create a new locale file from English keys.
- `checkLocaleIntegrity(section, dir)` — key mismatches vs `en.json`, duplicate values, near-duplicates.
- `findUnusedEnglishKeys(enKeys, roots, repoRoot)` — English keys not referenced by any `translate("...")` in source.
- `isValidLocaleKey` / `isLocaleKeyWithinMaxLength` — key-format validation.

All functions are covered by unit tests (`*.test.ts`) in `src/`.

## Overview

- `src/cli.tsx` — entry (shebang-ready)
- `src/App.tsx` — main Ink component, input routing, screen state
- `src/localeOps.ts` — disk read/write + add/update/sync/rename/delete operations
- `src/similarity.ts` — fuzzy search for similar existing keys/values
- `src/localeIntegrity.ts` — duplicate-value, key-mismatch, near-duplicate reports
- `src/unusedTranslate.ts` — scan source for `translate("...")` keys not in `en.json`
- `src/validation.ts` — key format/length validation
- `src/sections.ts` — server/app section definitions and path resolution
- `src/repoRoot.ts` — repo-root discovery
- `src/tuiChrome.tsx`, `src/tuiOptions.ts` — Ink layout/theme
- `src/browseFilters.ts` — browse/search filtering

## Related

- [`@stacks/translations`](translations.md) — the runtime that consumes these locale tables
