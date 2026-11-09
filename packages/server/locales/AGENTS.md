# Locales — Agent Instructions

Applies to locale files here. Also read these rules before adding or changing translation calls
in any workspace. Required guides: [translations](../../../docs/packages/translations.md) and
[locale tooling](../../../docs/packages/locales-tui.md).

- UI strings live in `app/`; API strings in `server/` (relative to this directory).
- Use `@stacks/locales-tui` (`yarn dev:locales`) or its programmatic operations; do not hand-edit JSON.
- Search for an existing equivalent key first, using `findSimilarEntries` or the TUI suggestions.
  Reuse keys such as `"URL"` rather than adding a spelling variant.
- `en.json` is required and is the source of truth. Add keys with `addEnglishEntry(dir, key, value)`.
  English entries fall back automatically for other locales; `syncMissingKeysFromEn` can backfill
  when needed. Do not churn every locale for an English-only addition.
- Keys may contain only ASCII letters, digits, underscores, and spaces. Put interpolation tokens
  in values, never keys. Verify every referenced key exists in the relevant `en.json`; missing
  keys render uppercased rather than supplying a translation.
- Preserve `%{...}` placeholders verbatim (including `%{day}`, `%{days}`, `%{duration}` and
  `[%{days}]`), plus literal shortcuts such as `Ctrl+enter` and separators such as `-`.
- Use the existing integrity checks and relevant translation/tooling tests when changing locale
  behavior; inspect placeholders and fallback behavior rather than checking JSON syntax alone.
