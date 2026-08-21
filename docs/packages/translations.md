# `@stacks/translations`

A lightweight runtime i18n library — translation registration plus a `translate()` helper with interpolation and pluralization. Used by `@stacks/server` and `@stacks/app`.

## Table of Contents

- [Environment](#environment)
- [Development](#development)
- [Usage](#usage)
- [Overview](#overview)
- [Related](#related)

## Environment

None.

## Development

```bash
yarn workspace @stacks/translations build   # one-shot tsc
yarn workspace @stacks/translations dev     # tsc --watch (run automatically by `yarn dev`)
yarn workspace @stacks/translations test    # vitest
```

## Usage

```ts
import { setTranslations, translate } from "@stacks/translations";

// At app boot, register the available locale tables:
setTranslations({
  en: { "Task created": "Task created" },
  es: { "Task created": "Tarea creada" },
});

translate("Task created"); // -> "Task created"

// Interpolation — templates use %{name} placeholders, filled from the params object
setTranslations({ en: { Welcome: "Welcome, %{name}!" } });
translate("Welcome", { name: "Ada" }); // -> "Welcome, Ada!"

// Pluralization — the value is a map of plural categories; `count` drives the variant
setTranslations({
  en: {
    "Unread notifications": {
      zero: "No notifications",
      one: "%{count} notification",
      other: "%{count} notifications",
    },
  },
});
translate("Unread notifications", { count: 0 }); // -> "No notifications"
translate("Unread notifications", { count: 1 }); // -> "1 notification"
translate("Unread notifications", { count: 5 }); // -> "5 notifications"
```

**Keys are flat strings, not a dotted tree.** There is no JSON-hierarchy lookup — `translate("notifications.unread")` is **not** a nested lookup. Keys must match `^[A-Za-z0-9_ ]+$` (ASCII letters, digits, underscores, and spaces — no dots or other punctuation). A key that violates this logs a warning and returns `❌ <KEY>`. Use a single flat key per message (e.g. `"Unread notifications"`), not `"notifications.unread"`.

Locale tables live under [`packages/server/locales/app/`](../../packages/server/locales/app/) (web-app UI strings) and [`packages/server/locales/server/`](../../packages/server/locales/server/) (API strings). `en.json` is the source of truth: the server merges `en.json` under every other locale, so a key present in `en.json` falls back to English everywhere automatically. To edit them interactively, use [`@stacks/locales-tui`](locales-tui.md).

## Adding a translation

Before adding a new key, check for an existing key that already conveys the same meaning (e.g. reuse `"URL"` rather than adding `"Url"`). Two ways:

- **Interactive:** run [`@stacks/locales-tui`](locales-tui.md) (`yarn dev:locales`) and use its search / similar-key suggestion before adding.
- **Programmatic:** use `findSimilarEntries(en, key, value)` from `@stacks/locales-tui` to find an existing alternative, and `addEnglishEntry(dir, key, value)` to add one.

If a new key is unavoidable:

1. Add it to `en.json` — this is **required**, since `en.json` is the source of truth and covers every locale via the English fallback (use `addEnglishEntry` from `@stacks/locales-tui`, which alphabetizes and validates).
2. Optionally add proper translations to the other locale files.

A key absent from `en.json` makes `translate()` return the uppercased key (e.g. `"Pinned"` → `"PINNED"`), so always verify the key exists. Missing keys in a _non-English_ locale automatically fall back to `en.json`, so you only need the key in `en.json` to avoid the uppercase fallback. After adding English keys, `syncMissingKeysFromEn` can backfill the other locale files.

> **Preserve `%{var}` placeholder tokens when translating.** Values use `%{var}` tokens (e.g. `%{count}`, `%{days}`, `%{type}`, or bracket forms like `[%{days}]`) that `translate()` substitutes from the `params` argument. Keep the `%{...}` token byte-for-byte (including `%`, `{`/`}`, and `[`/`]`) in every translation — renaming, reordering, or dropping it breaks the interpolation. Keep other literal tokens (e.g. `Ctrl+enter`) and separators (e.g. `-` in `"Last used view - Default"`) as-is as well.

## Overview

- `src/index.ts` — public API (`setTranslations`, `translate`, types)
- `src/plural.ts` — plural-rule selection
- `src/interpolation.ts` — `%{var}` substitution

## Related

- [`@stacks/locales-tui`](locales-tui.md) — terminal UI for editing locale JSON
