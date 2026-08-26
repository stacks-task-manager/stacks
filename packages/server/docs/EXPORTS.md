# Export service

The authenticated `POST /api/export` endpoint creates Stacks-branded attachments from client-supplied state. It does not load records from the database.

## Request contract

Every request includes `type`, `format`, `data`, and an optional `title`. Entity names come from `ExportEntityType` in `@stacks/types`.

| Format  | Allowed types                                                 | Response                                            |
| ------- | ------------------------------------------------------------- | --------------------------------------------------- |
| `pdf`   | `task`, `project`, `person`, `company`, `bookmark`, `notepad` | `application/pdf` attachment                        |
| `html`  | `notepad` only                                                | `text/html; charset=utf-8` attachment               |
| `json`  | all six types                                                 | JSON attachment preserving the supplied data        |
| `excel` | all six types                                                 | XLSX attachment built from normalized supplied data |

Invalid format/type combinations return `400`. Filenames use a sanitized title plus a local timestamp.

## Architecture

- `src/routes/schema/export.ts` owns format-aware validation.
- `src/services/export/templateRegistry.ts` is the explicit entity-to-template registry. Never derive a template path from request text.
- `src/services/export/presenters.ts` normalizes flexible client payloads into stable report records, sections, labels, dates, and numbers.
- `src/services/export/renderExportHtml.ts` caches compiled Handlebars templates, partials, CSS, and the Stacks logo for the process lifetime.
- `src/services/export/chromePdfFromHtml.ts` launches an isolated Playwright Chromium browser for each PDF.
- `static/export/pdf/` contains standalone print templates and assets. The server post-build step copies this directory into `dist/static`.

## Adding or changing a template

1. Add the entity to the shared `ExportEntityType` only when it is part of the public contract.
2. Add an explicit registry entry and a presenter with representative empty, zero, long, and multi-record values.
3. Reuse the partials and print design tokens. Inline all required CSS and images; exports must not depend on the app theme or a web origin.
4. Use `translate()` for every visible label. Search for an existing key with `findSimilarEntries`, then add a missing English key with `addEnglishEntry` from `@stacks/locales-tui`. Never hand-edit locale JSON.
5. Add compilation, presenter, route, and visual fixtures.

## Rendering security

Chromium runs with JavaScript disabled and aborts HTTP, HTTPS, WebSocket, and secure WebSocket requests. CSS and the logo are inlined. Notepad HTML is sanitized with a print-focused allowlist: scripts, styles, embedded documents, forms, event handlers, remote images, and unsafe URLs are removed. Only safe links plus inline or bundled images are retained.

The HTML response also sends a restrictive Content Security Policy. Renderer failures log the underlying server-side error and return only a localized, non-sensitive message.

## Chromium and fonts

The production server image installs Chromium and Noto core, CJK, and emoji fonts. It sets `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.

For local overrides, set `CHROMIUM_EXECUTABLE_PATH`. `PUPPETEER_EXECUTABLE_PATH` remains a deprecated fallback for existing installations. With neither variable set, Playwright's Chromium path is used.

## Preview and mandatory visual inspection

From the repository root:

```bash
yarn workspace @stacks/server export:preview
```

The command generates all representative PDFs under `output/pdf/export-preview/` and, when Poppler is installed, renders every page to PNG with `pdftoppm`. Its fixtures include short, long, multilingual, RTL, rich-text, and multi-record content.

Before merging any template or presenter change:

1. Run the export unit tests and Chromium smoke test.
2. Run the preview command.
3. Inspect every generated PNG for clipped text, overflow, broken tables, poor page transitions, missing glyphs, and incorrect RTL layout.
4. Re-render and inspect again after every meaningful layout correction. HTML-only review is not sufficient.
