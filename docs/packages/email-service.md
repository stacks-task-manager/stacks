# `@stacks/email-service`

A background worker that compiles React Email templates and drains an outbound email queue over SMTP on a configurable interval.

## Table of Contents

- [Environment](#environment)
- [Development](#development)
- [Local SMTP testing](#local-smtp-testing)
- [Overview](#overview)
    - [Retries and failure handling](#retries-and-failure-handling)
    - [Idle mode](#idle-mode)
- [Multilanguage templates](#multilanguage-templates)
    - [Subjects: `emails.json`](#subjects-emailsjson)
    - [Lookup fallback chain](#lookup-fallback-chain)
    - [Placeholder substitution (`%key%`)](#placeholder-substitution-key)
- [How to add a new template](#how-to-add-a-new-template)
- [How to add a new language](#how-to-add-a-new-language)
- [Editing templates with the React Email preview server](#editing-templates-with-the-react-email-preview-server)
- [Related](#related)

## Environment

`packages/email-service/.env` from [`packages/email-service/env.example`](../../packages/email-service/env.example):

```bash
cp packages/email-service/env.example packages/email-service/.env
```

SMTP + service:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`
- `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`
- `EMAIL_PROCESS_INTERVAL` — queue poll interval in milliseconds
- `PUBLIC_URL` — used to build absolute links inside emails

Database (required — the service reads the queue from Postgres via `@stacks/db`):

- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

If SMTP isn't configured, the service starts in **idle mode** (no processing) until configuration is supplied and the process is restarted.

## Development

```bash
yarn dev:email           # full service in watch mode
yarn workspace @stacks/email-service dev:email  # template preview server on :3005
```

`yarn dev:email` runs the actual worker against your local Postgres and SMTP host. The `dev:email` workspace script (different name, same package) is React Email's preview server for editing templates in the browser.

## Local SMTP testing

Use a local mail-capture server so emails don't leak. Either of these works:

- **MailHog** — `docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog`
- **Mailpit** — `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit`

Point the service at it:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=dev@localhost
```

View captured mail at <http://localhost:8025>. To confirm the queue is draining, watch the service log output or check the `email_queue` table in Postgres for rows transitioning from `pending` to `sent`.

## Overview

```
packages/email-service/
├── src/
│   ├── index.ts                       # entry point, lifecycle, signal handling
│   ├── services/
│   │   ├── EmailService.ts            # SMTP transport, queue draining, retry
│   │   └── TemplateCompiler.ts        # React Email render, DB upsert, locale resolution
│   └── utils/logger.ts
├── emails/                            # React Email components, one .tsx per template type
│   ├── welcome.tsx
│   ├── password-reset.tsx
│   ├── registration.tsx
│   └── notification.tsx
├── emails.json                        # per-tenant, per-locale subject lines
└── design/
    ├── common.tsx                     # shared <Email> layout (header, footer, logo)
    └── styles.ts                      # shared inline styles
```

The service has two responsibilities, kept in separate files on purpose:

| Responsibility | Where | When it runs |
| --- | --- | --- |
| **Compile templates → DB** | `TemplateCompiler.compileAllTemplates()` | Once at boot. For every (tenant × templateType × locale) it renders the React component to HTML, looks up the subject, and upserts a row into `email_templates`. Stale rows are deactivated (`isActive = false`), never deleted. |
| **Drain the queue** | `EmailService.processQueuedEmails()` | Every `EMAIL_PROCESS_INTERVAL` ms. Claims up to 50 pending rows with `FOR UPDATE … SKIP LOCKED`, fetches the matching compiled template, substitutes `%placeholders%`, and sends. |

Queue rows are picked from `email_queue` (see [`@stacks/db`](db.md)). The recipient address is joined in from `users.email` at processing time — the queue itself only stores `userId`.

### Retries and failure handling

Failures are recorded inside the same transaction that locked the row, so a service crash mid-batch always rolls back cleanly and the rows return to `pending`.

- Transient SMTP errors (`ETIMEDOUT`, `ECONNRESET`) — retried inline up to 2 times with a 5s / 10s back-off ([`EmailService.sendEmail`](../../packages/email-service/src/services/EmailService.ts)).
- Any other failure — the row's `retryCount` is incremented and `scheduledAt` is pushed out exponentially (`2^retryCount` minutes) up to `MAX_RETRIES = 3`. After that the row is marked `failed` and the reason is stored in `failureReason`.

### Idle mode

If the required SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`) are missing, the service logs the missing names and sits idle. It does **not** crash, so an orchestrator (Docker / systemd) won't restart it in a loop. Restart the process after editing `.env` to pick up the new configuration.

## Multilanguage templates

Each file in `emails/` exports one named React component **per locale**. The compiler discovers locales from `emails.json` and looks for a matching export using a deterministic naming rule:

```
component name = PascalCase(templateType) + PascalCase(locale)
```

Examples:

| File | Locale in `emails.json` | Expected export |
| --- | --- | --- |
| `emails/welcome.tsx` | `en` | `export const WelcomeEn` |
| `emails/welcome.tsx` | `de` | `export const WelcomeDe` |
| `emails/password-reset.tsx` | `fr` | `export const PasswordResetFr` |

If the expected export is missing the compiler logs `No export 'XxxXx' found in <file>` and skips that (template, locale) pair without aborting the rest of the run.

### Subjects: `emails.json`

`emails.json` lives next to the `emails/` folder and is structured `tenant → templateType → locale → subject`:

```json
{
    "default": {
        "welcome":        { "en": "Welcome to %appName%!", "de": "Willkommen bei %appName%!" },
        "password-reset": { "en": "Reset your %appName% password" },
        "registration":   { "en": "Confirm your %appName% account" },
        "notification":   { "en": "%title%" }
    },
    "acme-tenant-id": {
        "welcome": { "en": "Welcome aboard the Acme platform" }
    }
}
```

The `default` tenant is the fallback used whenever a per-tenant override is missing. `%appName%` is replaced at compile time with the tenant's `title` column from the `tenants` table; everything else is substituted at send time from the queue row's `data` payload.

### Lookup fallback chain

`TemplateCompiler.getCompiledTemplate(templateType, locale, tenant)` resolves a compiled row in this order, returning the first match:

1. `(templateType, locale, tenant)`
2. `(templateType, locale, "default")` — if `tenant !== "default"`
3. `(templateType, "en", tenant)` — if `locale !== "en"`
4. `(templateType, "en", "default")` — final fallback

Practical consequence: as long as you keep an English `default` row for every template type, missing per-tenant or per-locale variants degrade gracefully instead of erroring.

### Placeholder substitution (`%key%`)

After the per-tenant HTML is fetched from `email_templates`, the worker replaces `%key%` markers using the queue row's `data` JSON plus a few injected values:

- everything in the row's `data` JSONB (e.g. `firstName`, `activationLink`, `title`)
- `%publicUrl%` — from the service's `PUBLIC_URL` env var

The regex is `/%\s*key\s*%/g` and the keys are escaped, so unusual characters in user-supplied keys can't break the substitution. Missing keys are replaced with the empty string.

The same substitution is applied to the **subject** loaded from `emails.json` — that's why `"%title%"` works as a subject for the notification template.

## How to add a new template

1. **Define the type and payload** in [`packages/types/src/models/email.ts`](../../packages/types/src/models/email.ts):

   ```ts
   export enum EMAIL_TEMPLATES {
       // ...existing
       INVOICE_READY = "invoice-ready",
   }

   export interface InvoiceReadyEmailTemplate extends BaseEmailTemplate {
       template: EMAIL_TEMPLATES.INVOICE_READY;
       data: { invoiceNumber: string; downloadLink: string };
   }
   ```

   Then extend the `EmailTemplate` union and the `EmailTemplateData<T>` mapping below it. The matching string must equal the filename you're about to create.

2. **Write the React component** as `packages/email-service/emails/invoice-ready.tsx`:

   ```tsx
   import { Button, Section, Text } from "@react-email/components";
   import Email from "../design/common";
   import Styles from "../design/styles";

   interface Props { appName: string; }

   export const InvoiceReadyEn: React.FC<Props> = ({ appName }) => (
       <Email preview={`Your ${appName} invoice is ready`}>
           <Section>
               <Text style={Styles.text}>Invoice #%invoiceNumber% is ready.</Text>
           </Section>
           <Section style={Styles.centered}>
               <Button style={Styles.button} href="%publicUrl%%downloadLink%">Download</Button>
           </Section>
       </Email>
   );

   export default InvoiceReadyEn;
   ```

   Reuse `<Email>` from `design/common.tsx` so you inherit the header / footer / logo, and pull inline styles from `design/styles.ts` rather than hand-rolling new ones.

3. **Add the subject** to `emails.json` under `"default"`:

   ```json
   "invoice-ready": { "en": "Your %appName% invoice is ready" }
   ```

4. **Restart the email service.** `compileAllTemplates()` only runs at boot, so new or edited templates won't appear in the `email_templates` table until you bounce the process.

5. **Send it** from the server: see [`@stacks/server` → Sending email](server.md#sending-email).

## How to add a new language

1. **Add the locale to `emails.json`** under every template type you want to translate. The locale string is whatever value the server will pass to `EmailsLoader.queueEmail` (typically the BCP-47 short code: `en`, `de`, `fr`, `ro`, …).

   ```json
   "welcome": {
       "en": "Welcome to %appName%!",
       "de": "Willkommen bei %appName%!"
   }
   ```

2. **Add the matching component export** in the matching `.tsx` file using the `PascalCase(templateType) + PascalCase(locale)` naming rule:

   ```tsx
   export const WelcomeDe: React.FC<{ appName: string }> = ({ appName }) => (
       <Email preview={`Willkommen bei ${appName}`}>
           {/* German body */}
       </Email>
   );
   ```

3. **Restart the email service** so the compiler picks up the new locale and writes a row per tenant into `email_templates`.

A locale doesn't have to be present in every template — when a row is missing, the fallback chain above will use English. The compiler logs `Subject not found for <type>_<locale>` for missing subjects and emits a synthetic fallback so the send still succeeds.

## Editing templates with the React Email preview server

```bash
yarn workspace @stacks/email-service dev:email   # http://localhost:3005
```

This runs React Email's hot-reloading preview UI against the files in `emails/`. It does **not** touch the queue or the database — it's purely a visual editor for the components. Once you're happy with the design, restart the worker (`yarn dev:email`, different script) so the new HTML is re-compiled and persisted.

## Related

- [`@stacks/db`](db.md) — the `email_queue` and `email_templates` tables this service consumes / writes
- [`@stacks/server`](server.md#sending-email) — enqueues outbound mail via `c.sendEmail(...)` / `EmailsLoader.queueEmail(...)`
- [`@stacks/types`](types.md) — `EMAIL_TEMPLATES` enum and `EmailTemplateData<T>` typed payloads
