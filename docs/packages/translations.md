# `@stacks/translations`

A lightweight runtime i18n library — translation registration plus a `translate()` helper with interpolation and pluralization. Used by `@stacks/server` and `@stacks/app`.

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
    en: { "task.created": "Task created" },
    es: { "task.created": "Tarea creada" },
});

translate("task.created");            // -> "Task created"

// Interpolation
translate("welcome", { name: "Ada" }); // strings can include {{name}}

// Pluralization (count drives the variant)
translate("notifications.unread", { count: 0 });   // "no notifications"
translate("notifications.unread", { count: 1 });   // "1 notification"
translate("notifications.unread", { count: 5 });   // "5 notifications"
```

Locale tables live under [`packages/app/src/app/locales/`](../../packages/app/src/app/locales/) for the web app and [`packages/server/src/locales/`](../../packages/server/src/locales/) for the server. To edit them interactively, use [`@stacks/locales-tui`](locales-tui.md).

## Overview

- `src/index.ts` — public API (`setTranslations`, `translate`, types)
- `src/plural.ts` — plural-rule selection
- `src/interpolate.ts` — `{{var}}` substitution

## Related

- [`@stacks/locales-tui`](locales-tui.md) — terminal UI for editing locale JSON
