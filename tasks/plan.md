# Security analysis and TDD remediation handoff

Prepared 2026-10-16 (Europe/Rome). This document is for the next implementing agent.
**No application security fixes have been made as part of preparing this handoff.**

## 1. Mandate, decisions, and evidence limits

The user requested an analysis of the current system, a detailed local implementation plan, tests written
before fixes, and independent verification by the implementing agent. The user selected:

- Protect an **internet-facing deployment**, including multiple users and tenants, plus localhost risks.
- **Require fresh sign-in at rollout**; compatibility with existing bearer tokens is not required.
- Preserve existing unrelated work. Do not commit, push, merge, deploy, send reports, or contact anyone.

Snapshot anchor: `3a11c7b822033164438fb9bf0c44cda05d5b2baa`. The checkout initially contained extensive
AI/MCP changes and became clean during analysis through activity outside this task. Reinspect HEAD,
status, staged/unstaged diffs, and relevant untracked files before implementing. Line references below
are navigation anchors, not a promise that the next checkout has identical spans. Revalidate every finding.

Evidence labels used here:

- **Observed:** control or unsafe behavior established by source inspection; not a live exploit claim.
- **Probe-confirmed:** a bounded experiment against the installed library confirmed the stated behavior.
- **Conditional:** impact depends on configuration or reachability described alongside the finding.
- **Unverified:** further investigation is required; do not implement a speculative fix without evidence.

Executed during analysis: repository graph queries, source/configuration/diff inspection, an in-memory
Hono cookie probe with synthetic values, and the native Yarn dependency audit. The cookie probe returned
`httpOnly=false`, `secure=false`, `sameSite=false`, `hasMaxAge=false`, `hasPath=true` for the login route's
current option-free `setSignedCookie` pattern. **No real credentials were used or printed.**

`yarn npm audit --all --recursive --json` failed with exit 1 and registry HTTP 400 from
`https://registry.yarnpkg.com/-/npm/v1/security/audits/quick`. An earlier piped attempt misleadingly emitted
`[]` because its parser ignored non-JSON error output; that is **not** a clean audit. No dependency is
declared safe or vulnerable based on these attempts. Runtime suites, browser exploits, migration tests,
secret-history scanning, and deployed infrastructure checks were not executed. No saved test reports
were used as current evidence. This is a targeted first security assessment, not exhaustive certification.

## 2. Current system and trust boundaries

| Subsystem     | Current design                                                                                                           | Boundary and assets                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| HTTP          | Hono on Node; global logger, CORS, secure headers; public HTML/JSON auth; authenticated API routers                      | Internet input to sessions, tenant data, parsers, and privileged writes                       |
| Identity      | HS256 JWT through bearer header first, otherwise signed `auth_token` cookie; database user/role loading for API requests | Stolen browser cookies/bearer tokens; disabled users/tenants; inconsistent login paths        |
| Authorization | AsyncLocalStorage request context; tenant/soft-delete scoping; per-record ACL plus RBAC                                  | Same-tenant unauthorized users and cross-tenant identifiers; REST, MCP, background jobs       |
| PostgreSQL    | Sequelize; shared user/profile/authentication row; per-tenant entities                                                   | Credential columns must never become public profile fields; SQL must preserve tenant scope    |
| Realtime      | `/ws`; in-memory connections, presence, queues, and app event broadcasts                                                 | Upgrade, origin, identity lifetime, tenant/ACL delivery, client-controlled messages           |
| Files         | Authenticated attachment routes; hash-addressed uploads/previews; database attachment rows                               | Read/write ACL, shared physical storage, memory/disk exhaustion, filename/decoder input       |
| OAuth         | Google auth URL and callbacks; credentials stored in `users.oauthTokens`                                                 | Browser authorization response to account linking and third-party calendar credentials        |
| AI/MCP        | AI SDK chat over WS; schema-based tool registry; authenticated stateless HTTP MCP                                        | Untrusted model/tool inputs, concurrent tenant context, mutation permissions, provider costs  |
| Web/mobile    | React SPA; custom HTML rendering; Expo bearer stored with SecureStore                                                    | Stored/reflected XSS, session theft, unsafe URLs, sending tokens to a changed server          |
| Email         | Database queue and template compiler; HTML value escaping exists                                                         | Reset/activation links, recipient tenant binding, sensitive queue payload retention           |
| Delivery      | Yarn 3.6.4, root lockfile, CI unit/integration jobs, Docker PostgreSQL 15                                                | Dependency advisories/scripts, destructive test setup, runtime configuration, secret exposure |

Existing controls worth preserving: explicit HS256 verification; production missing/default-secret checks;
registration/recovery disabled by default; hashed expiring reset tokens; tenant/user cache keys; generic
loader ownership checks; schema validation on many routes; MCP argument parsing; AI history limits,
120-second model timeout and 12-step cap; PDF sanitization, JavaScript disabled and HTTP/WS requests
blocked in the renderer; email HTML interpolation escaping; mobile SecureStore. These are inspected
controls, not proof that all callers enforce them correctly. `isPublic` ACL means **within a tenant**.

## 3. Findings and priority

Priority reflects remediation order and plausible internet exposure, not a formal CVSS score.

| ID  | Priority / confidence                               | Evidence                                                                                                                                                                                                                               | Consequence                                                                                                                                                                                                                                                                                         |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | P0 / observed                                       | `packages/server/src/loaders/people.ts:151-215` strips only `password`; `packages/db/src/entities/User.ts:60-64` stores activation/reset fields and `oauthTokens`; `packages/server/src/routes/people.ts:22-60` returns loader results | Authenticated directory readers can receive other users' Google access/refresh credentials and account-token metadata; raw activation tokens enable account activation/password setting. Registration JSON at `routes/auth.ts:172-176` also removes only password and returns its activation token. |
| S02 | P0 / observed                                       | `packages/server/src/routes/socket.ts:729-778,831-862` returns undefined on failed authentication but still upgrades; `254-333` registers anonymous clients; `415-465,807-828` broadcasts to all subscribers                           | Anonymous and other-tenant clients can receive update metadata and ACL snapshots; some presence/statistics also lack recipient scoping. This does not establish full record-body leakage.                                                                                                           |
| S03 | P1 / probe-confirmed + observed                     | `packages/server/src/routes/login.ts:133-143`; `routes/auth.ts:272-277`; `middleware/auth.ts:77-105,164-216`; password reset at `routes/login.ts:263-294`                                                                              | Login cookie lacks protective flags; API bearer lasts ten years; password reset does not revoke issued JWTs; tenant-disabled checks are absent from ongoing API auth and HTML login.                                                                                                                |
| S04 | P1 / observed                                       | `packages/server/src/routes/googleAuth.ts:26-45,66-110` inserts JSON containing query `error` directly into a script element                                                                                                           | `JSON.stringify` does not escape the HTML script terminator. A callback error containing `</script>` can introduce executable HTML in an authenticated response. Browser proof is pending.                                                                                                          |
| S05 | P1 / observed                                       | `packages/server/src/services/googleOAuthService.ts:130-146`; `routes/googleAuth.ts:66-116`                                                                                                                                            | Auth URLs and callbacks do not bind/consume OAuth state. An attacker-controlled authorization response can be associated with the signed-in Stacks account.                                                                                                                                         |
| S06 | P1 / observed sink, reachability to reproduce       | `packages/app/src/app/components/common/Comments/Comment.tsx:286,305-337`; `packages/app/src/app/utils/string.tsx:93-124,214-242`                                                                                                      | Activity diff fields are interpolated into raw HTML. Custom markdown preserves/inserts HTML and URLs. Demonstrate persisted user-content reachability; do not assume every helper has active callers. Announcement/changelog raw HTML sinks also need source tracing.                               |
| S07 | P1 / observed                                       | `packages/server/src/loaders/files.ts:658-723` buffers every chunk, then concatenates, before parent authorization in `uploadFile:228-259`; `routes/files.ts:21-33` trusts MIME/name                                                   | Authenticated users can force unbounded memory consumption, including for unauthorized parents; spoofed image input reaches decoders.                                                                                                                                                               |
| S08 | P1 / conditional on `DELETE_FILES=true`             | `packages/server/src/loaders/files.ts:248-253` stores bytes under global hash; `148-215` counts references only in the deleting tenant                                                                                                 | Two tenants with identical bytes share one physical path; deleting the last attachment in one tenant can remove the other tenant's data. Physical preview cleanup also uses a different directory from `PREVIEW_DIR`.                                                                               |
| S09 | P1 / observed, write policy must be locked in tests | `packages/server/src/loaders/files.ts:40-72,333-378,510-598` uses parent visibility for mutation and hash reuse                                                                                                                        | Read-only viewers can reach attachment mutations; hash-only reuse can attach a guessed same-tenant private file to an accessible parent without access to its source attachment.                                                                                                                    |
| S10 | P1 / observed gap                                   | No limiter found in indexed request/auth code; `packages/server/src/index.ts:80-94`, login/register/recovery handlers; `utils/clientIp.ts:7-31` returns `unknown` unless forwarded headers trusted                                     | Credential guessing, email abuse, and request/AI resource exhaustion have no application rate budget identified. Do not claim a deployed proxy lacks limits: infrastructure is unverified.                                                                                                          |
| S11 | P2 / observed + conditional                         | `packages/server/src/index.ts:26-42` defaults to wildcard CORS; no shared browser CSRF gate in inspected middleware/routes; WS lacks origin validation                                                                                 | CORS is not CSRF protection. Cookie-authenticated mutations, form login and OAuth need browser-origin/request binding; wildcard alone does not prove credentialed cross-origin reads.                                                                                                               |
| S12 | P2 / observed                                       | `packages/server/src/routes/files.ts:152` sets `public, max-age=3600` for authenticated preview bytes; `171` interpolates original filename into download header                                                                       | Shared caches may retain private previews; hostile names need safe header encoding. Actual cache behavior depends on deployment.                                                                                                                                                                    |
| S13 | P2 / observed + conditional                         | `packages/server/src/routes/auth.ts:298-361,378-452` logs tokens; global Hono logger logs request URLs; `ai/debugLog.ts:20-49,77-100`; `ai/debugServer.ts:9-53` has unauthenticated read/delete routes and unspecified bind host       | Account links and AI content may reach logs. If separately launched and reachable, debug viewer exposes conversations/tool results and allows clearing them. Read limit does not bound the log file or read memory.                                                                                 |
| S14 | P2 / observed                                       | `packages/server/src/routes/login.ts:184-200,270-289`; activation at `routes/auth.ts:388-420`                                                                                                                                          | Recovery responses distinguish account states. Reset/activation use read-then-save rather than atomic one-time consumption, allowing concurrency races. Activation accepts a missing expiry.                                                                                                        |
| S15 | P2 / observed configuration weakness                | `packages/server/src/config/secrets.ts:7-45` rejects only two placeholders and empty values                                                                                                                                            | Arbitrarily short/repeated secrets pass strict validation. No assertion of actual deployed weak secrets is made.                                                                                                                                                                                    |
| S16 | P1 verification gap                                 | `packages/server/src/routes/__tests__/socket.test.ts:38-135` mocks registration/asserts stand-in objects; `socket.ts:793-796` skips route registration in tests; `test/globalSetup.ts:9-20` forces schema sync                         | Current socket tests do not establish handshake/delivery security. Full server tests can destroy a non-disposable database if configured incorrectly.                                                                                                                                               |

## 4. Implementation contract and mandatory TDD loop

Use `tasks/todo.md` as the progress index and this file for full instructions. Read root/scoped AGENTS,
`docs/AGENT_WORKFLOW.md`, relevant guides and the latest source before each subsystem. Use Graft first.
When new translation strings are needed, read locale AGENTS and use locales-tui. Do not hand-edit JSON.

For **each task**, the implementing agent must:

1. Revalidate the evidence and list observable acceptance criteria. Mark disproven findings with evidence;
   do not change production behavior merely to make this document appear correct.
2. Add the narrow behavioral regression first. Include an allowed-operation control, so a fix that denies
   everything cannot pass. Run it and record the command and the expected assertion failure (**RED**).
3. Distinguish assertion failure from missing services/imports/setup. Fix the harness before claiming RED.
   A test passing immediately is characterization, not proof of reproducing the reported issue.
4. Make the minimum fix (**GREEN**), then necessary cleanup (**REFACTOR**), rerunning affected checks.
   Mock external providers/time, not the authentication/authorization function being tested.
5. Inspect the diff independently, attempt a variant the original regression did not encode, and run the
   relevant full affected spec plus package checks. Record exact results, skipped tests, and limitations.
6. Update the finding/task ledger with evidence and remaining gaps. Do not mark done from type checks,
   metadata annotations, screenshots, model self-reports, or previously saved reports alone.

Never replace code with a baseline copy in a shared checkout to show RED. Use a genuinely isolated
checkout/environment if a fix already exists. No automated forced dependency upgrades or secret output.

### T00 — Safe test environment and security harness (first; S16)

1. Inventory current HEAD/diffs and active services without changing them. Read the server Vitest configs,
   E2E guide, `test/globalSetup.ts`, auth fixtures, and nearest security/permission tests.
2. Add a database-target safety validator **before any DB import/connection/sync** in integration setup.
   Require `NODE_ENV=test`, explicit `ALLOW_TEST_DB_RESET=1`, explicit connection target and database name
   ending `_test`; use a dedicated database role confined to that disposable DB. Production tests must
   not gain the override by merely inheriting a developer `.env`. CI should set the explicit opt-in.
3. RED: missing opt-in, missing DB variable, non-test name, production mode and accidental default target
   refuse before authenticate/sync. GREEN: the explicit disposable fixture proceeds. Test validator without
   touching a database, then verify one reset against the disposable database only.
4. Build shared fixtures: tenants A/B; A owner/admin/viewer/unrelated user; B admin/user; public/private
   resources; disabled/deleted users and disabled tenants. Seed synthetic credentials only. Preserve and
   restore previous env values, including absence; cleanup fixtures independently even after assertions.
5. Replace fake socket security assertions with an actual local Node server on ephemeral port `0`, real
   WS client connections and real event dispatch. Extract a reusable socket setup seam so the harness
   exercises registration without bootstrapping the application/license or mutating NODE_ENV globally.
   Close clients, timers, listeners and server in finally/teardown. Never bind this harness on 3001.

Acceptance: unsafe DB setup cannot run, and one positive + one rejected real socket handshake is testable.
Depends on none. Keep environment-validator and socket-harness changes as separately reviewable slices.

### T01 — Stop credential fields leaving user rows (S01; first remediation)

1. RED unit/route tests: give directory fixtures synthetic `password`, `token`, reset hash/expiry,
   `oauthTokens.google.access_token`, refresh token and an unknown future private field. Test list, single,
   birthdays, create/revive, registration, cached responses, boot consumers and exports that include people.
   Assert **exact allowed response fields**, not just absence of one known password field.
2. Add a single explicit public-person serializer and use it at every public user-row response boundary.
   Keep authentication entities server-only. Add a public shared response type in `@stacks/types`; remove
   password/token from that public shape and keep credential inputs as separate request/server types.
   Preserve currently required profile/role/admin/status fields; this task does not invent new PII policy.
3. Registration JSON must not return its activation credential or reset/OAuth state. Inventory and repair
   all user entity `toJSON()` response paths and any nested inclusion, rather than patching just getAll.
4. AI tools already projecting selected people fields should retain those projections. Test REST/MCP/chat
   outputs with sensitive-field sentinels; ensure serializer changes do not leak them through debug/errors.
5. Restart/redeploy with empty in-memory response caches. Document that already distributed credentials
   may need operator-controlled Google revocation and reauthorization; do not invoke provider revocation
   against real users during development. Do not put token values in the incident note.

Acceptance: no tested public user response contains an authentication credential or internal token field.
Depends on T00 for DB tests. Run internal build after shared-type changes, then app/server checks.

### T02 — Require authenticated WebSocket upgrades (S02, S16)

1. RED real-handshake tests: missing/malformed/expired JWT, missing user, disabled/deleted user and disabled
   tenant must fail before upgrade/registration; valid cookie and bearer clients can connect. Assert rejected
   clients never receive an acknowledgment, stats, update or queued message.
2. Reuse one server authentication policy for API and WS; do not simply check that a user row exists.
   Return HTTP 401 for absent/invalid credentials and 403 for inactive accounts/tenants before upgrade.
3. Check exact trusted Origin for browser/cookie WS. Reject unknown/null origins; absent Origin is permitted
   only with a valid bearer credential for native clients. Never accept bearer tokens from query strings.
4. Store only authenticated connection identity. Revalidate on messages and at most every 60 seconds while
   idle; close invalid sessions with 1008 and remove presence/queue/subscription state. Enforce token expiry.

Acceptance: a rejected identity never enters connection registries, and native/browser legitimate clients work.
Depends on T00; integrate the revocable session policy from T05 when available.

### T03 — Enforce tenant and ACL delivery on the server (S02)

1. RED real-delivery tests: private A event reaches A owner/allowed role/allowed user and A admin; never A
   unrelated user, B admin/user, or unauthenticated clients. Tenant-public reaches A only. Missing audience
   context fails closed. Test targeted updates, broadcasts, queues/reconnect, presence and statistics.
2. Carry trusted tenant identity and resource/audience information in the **internal event envelope**,
   produced by server context or explicit background-job identity. Do not derive it from a client payload.
   Extend shared types only if client wire data actually changes. Preserve lightweight invalidations.
3. Authorize recipients before serialization/send, reusing canonical tenant/ACL/RBAC rules and current role
   state. Apply the same check to queue insertion/delivery and all presence/status handlers. Tenant admin
   bypass applies only within that tenant. Never treat a missing permissions snapshot as public access.
4. For permission withdrawal/deletion, send a minimal id/type/action removal invalidation to previous
   authorized recipients, scoped within the tenant, without the new ACL or record body. Clients remove
   inaccessible rows and subsequent reads deny. Test new grants and revoked users on already-open sockets.
5. Remove server-global counts from user-visible stats or make them tenant scoped. Keep operational
   aggregate metrics internal. Preserve originating-instance suppression after recipient authorization.

Acceptance: raw socket frames, including metadata, obey tenant/visibility rules without client filtering.
Depends on T02. Re-run existing realtime, notification, permission and affected UI flow tests.

### T04 — Repair HTML/script injection (S04, S06)

1. RED OAuth callback test with error `</script><img src=x onerror="window.__securityProbe=1">`:
   response must contain no attacker-created script/image; browser probe remains unset. Test both Google
   route aliases and success/error payloads. Do not rely on CSP alone to make unsafe HTML appear harmless.
2. Use a constant public OAuth error code/message. Encode any data embedded into HTML script context by
   escaping `<` and Unicode line separators as well as JSON serialization; use a per-response nonce if
   inline script remains. Keep postMessage exact-origin targeting. Do not reflect provider query errors.
3. RED activity tests render malicious before/after fields through the real component, including the
   missing-before branch, common prefix/suffix and ordinary formatting. Render diff segments as React text
   nodes with `ins`/`del`, removing HTML interpolation for plain activity data.
4. Trace actual callers and content sources for custom markdown, announcements and changelogs. For active
   rich HTML paths, use one maintained parser-backed allowlist at the final sink; first evaluate whether an
   already installed browser-compatible sanitizer is available. If none is suitable, use `dompurify` with
   the smallest reviewed dependency addition. Permit existing safe formatting, https/http/mailto/tel links
   and safe relative links; reject executable schemes, event handlers, scripts, SVG active content, frames
   and style attributes. Set external link rel to `noopener noreferrer`. Do not create a regex sanitizer.
5. Add sanitizer unit cases for mixed-case/encoded schemes, malformed HTML and attribute-breaking inputs;
   browser E2E stores payloads through the ordinary API then opens the real activity/content view. Assert
   visible safe text and no execution/network side effects; keep POM/testid conventions.

Acceptance: malicious persisted/reflected content stays inert and intended text/formatting still works.
Depends on T00. Treat unused helpers as tracked investigation, not an excuse for unrelated cleanup.

### T05 — Bounded, revocable sessions and consistent account checks (S03)

1. RED tests across HTML login, JSON login, API, WS and MCP: expired/revoked/legacy sessions denied;
   disabled/deleted users and disabled tenants denied; valid credentials work; token has required claims.
2. Add a server-only sessions table with UUID id, userId, tenant, createdAt, expiresAt and revokedAt, indexed
   for lookup/user revocation. New JWTs carry `uid`, `sid`, `iat`, `exp`, fixed issuer `stacks` and audience
   `stacks-client`; explicitly verify HS256 and all required claims. Store no raw bearer token in DB.
3. Use a seven-day **absolute** lifetime for HTML and bearer login, no automatic refresh in this iteration.
   Preserve JSON login response `{ token, user, id }`. Reject all legacy JWTs missing session/required
   claims immediately at rollout, as authorized by the user. Missing exp is invalid. Session and current
   user/tenant state must be checked for every protected request; static session checks may use a narrow
   query but cannot bypass revocation. Authentication infrastructure failures fail closed.
4. Centralize cookie settings: `HttpOnly`, `SameSite=Lax`, `Path=/`, Max-Age bounded by token expiry,
   Secure in production HTTPS. Permit non-Secure only in explicit local development/test. Keep `uid` and
   `tenant` cookies as non-authoritative hints only; clear using matching path/domain settings.
5. Add authenticated `POST /auth/logout` (revoke current sid) and `POST /auth/logout-all` (revoke user
   sessions); apply browser CSRF protection. Web/mobile logout must call current-session revocation and
   clear local state even when the network fails, while reporting failed server revocation accurately.
   Do not change Google's disconnect into Stacks logout. Update mobile 401 handling and MCP setup docs
   for expiry/re-login. Never introduce browser localStorage bearer storage.
6. Password reset/change revokes all user sessions atomically with credential update. Test stolen-token
   replay after logout/reset and already-connected socket closure. New migrations use next available
   numeric `.cjs` prefix, transactions, consistent models and meaningful down paths on disposable data.

Acceptance: no ten-year or unrevocable session remains; all transports enforce the same live account rules.
Depends on T00 and T01 public/private types; coordinate T02/T03 rather than duplicating identity logic.

### T06 — One-time account tokens and safe recovery responses (S14)

1. RED: concurrent requests with the same valid reset token result in exactly one successful password
   change; second request fails and cannot overwrite password. Repeat for activation; test expired,
   absent-expiry, consumed, malformed and disabled/deleted-account cases. Use real database concurrency.
2. Hash activation tokens at rest using the existing SHA-256 helper and a dedicated hash field; issue
   random 32-byte credentials. Migrate pending legacy activations by expiring them, not by retaining raw
   token lookup. Provide an administrator-triggered resend path using existing email queue mechanisms;
   do not bulk-email users automatically. Explicitly document pending-link invalidation at rollout.
3. Consume reset/activation credentials in a transaction using a row lock or a conditional update that
   checks unconsumed hash and expiry. Save password, clear token fields and revoke sessions in the same
   transaction; retain current disabled-account policy. Require non-null, future expiry.
4. Give recovery requests for nonexistent, inactive, system and eligible accounts the same status/redirect
   and public message. Only eligible accounts enqueue email. Do not reveal queue errors/account existence
   in the public response. Assert real queue routing with synthetic records; mock SMTP, never send email.
5. Bound password input before bcrypt; define new-password policy as 12+ characters and at most 72 UTF-8
   bytes, preserving legacy password verification. Apply consistently to signup/activation/reset/change.
   Test multibyte byte limits and mismatch; do not silently truncate. Keep hash cost unchanged until a
   measured performance test supports raising it; do not treat bcrypt cost 10 alone as a confirmed exploit.

Acceptance: tokens are one-use under concurrency, have mandatory expiry and never leave public serializers.
Depends on T05 session revocation. Test migrations up/down/up against a disposable DB.

### T07 — Bind Google OAuth to the initiating browser/session (S05)

1. RED: auth URL includes unpredictable state; callback rejects absent/mismatched/expired/other-session/
   other-user/replayed state **before** token exchange/store. Both GET/POST aliases enforce identical rules.
2. Add server-only OAuth attempts table: unique state hash, userId, tenant, sid, expiry (10 minutes),
   consumedAt and server-side PKCE verifier. Bind an independent random nonce through an HttpOnly,
   Secure-in-production, SameSite=Lax cookie; store its hash in the attempt. Never expose verifier/nonce
   via public APIs. Auth URL generation passes state and S256 challenge to the Google client.
3. Atomically consume a valid attempt bound to current live session and browser nonce; exchange code with
   its verifier; no retry/replay after consumption even if exchange fails. A failure requires a new attempt.
   Verify no credentials are stored for a different user/tenant, including concurrent callbacks.
4. Avoid sharing mutable Google OAuth client credentials between users. Instantiate per operation or pass
   explicit per-user auth; test overlapping users with distinct token fixtures and refreshed credentials.
5. Test authorized success, provider denial, provider timeout and disconnect. State validation also applies
   to error responses. Browser smoke uses mocked provider endpoints; no real Google consent or emails.

Acceptance: unsolicited or replayed callback cannot link credentials or leak script data. Depends on T04/T05.

### T08 — Browser origin, CSRF, and CORS policy (S11)

1. RED matrix: allowed, attacker, suffix-spoofed, `null` and absent Origin for form login/register/recovery,
   cookie API mutations, OAuth and WS; bearer-only native/MCP requests remain possible without Origin.
   Test form, JSON and multipart types; a trusted-origin preflight alone must not authorize a mutation.
2. Trusted browser origins are exact URL origins from required production `APP_ORIGIN` plus explicit
   `CORS_ORIGINS`; development defaults only to the configured local app origin. No wildcard credentialed
   CORS; return `Vary: Origin`; only needed methods/headers. Invalid production origin config fails boot.
3. Implement browser CSRF tokens using a signed HttpOnly browser nonce cookie and an HMAC-derived token
   returned by no-store `GET /auth/csrf` and embedded in server forms. Verify token from hidden form field
   or `X-CSRF-Token` on browser unsafe methods, bound to that browser nonce; rotate on login/logout.
   Require exact trusted Origin when present; reject `null`/foreign Origin regardless of token. Without
   Origin, allow browser mutation only with a valid token. Do not make authentication GETs perform writes,
   apart from the state-bound OAuth callback. Enforce Origin on the CSRF issuance endpoint as well.
4. Permit a CSRF exemption only for **successfully verified bearer authentication selected by the shared
   extractor**, not mere presence of an Authorization header. An invalid bearer cannot fall back to a
   cookie exemption. Public JSON login remains token-protected for browser Origins; originless native
   login is allowed with JSON content type and no cookies. Test each transport explicitly.
5. Integrate token acquisition/rotation in the shared Axios client and HTML forms, and avoid caching tokens
   across browser identities. OAuth browser state/nonce is its callback CSRF binding. Add valid and rejected
   browser flows through existing POMs. Do not use same-site cookie flags as the only CSRF defense.
   Consume/remove the hidden CSRF field before strict business-payload validation; reject duplicate token
   fields. Test this explicitly for registration, whose existing schema rejects unknown fields.

Acceptance: legitimate web/native/MCP flows work; hostile browser origins cannot perform state changes.
Depends on T05/T07; WS Origin checks from T02 use the same policy.

Implementation order is T00 → T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T11 →
T10 → T12 → T13 → T14 → T15. Earlier tasks may add tests for later tasks, but keep the failing evidence
local to the active slice rather than leave a knowingly red shared branch. T10's publication changes and
T12's deletion changes must share one storage locking contract; verify the combined races before release.

### T09 — Shared abuse limits and request budgets (S07, S10)

1. RED fake-clock + shared-store tests: limits apply before bcrypt, DB mutation, email enqueue and model
   invocation; two application instances share counters; concurrent increments cannot exceed the budget.
   429 includes Retry-After, has generic content and does not reveal whether an account exists.
2. Use PostgreSQL atomic fixed-window counters with expiry/indexed cleanup (no new Redis service). Store
   HMACs of account identifiers/IPs, not raw emails. Validate/fail boot on invalid configured bounds.
   Defaults: login 10/account/15 min and 100/IP/15 min; recovery/register 5/account/15 min and 30/IP/15 min;
   authenticated API 300/user/min; unauthenticated API/auth 600/IP/min. Count failed and successful public
   attempts alike. Counter-store failure returns 503 on protected expensive routes, not an unlimited pass.
3. Derive direct peer IP from the Node adapter. Forwarded identity is accepted only when an explicitly
   configured trusted proxy overwrites incoming headers; never key every direct client as `unknown` or
   trust an arbitrary first X-Forwarded-For value. Document ingress restrictions; test forged headers.
4. Add pre-parser body cap 1 MiB for ordinary JSON/forms and 256 KiB for MCP; exclude upload route which
   has its own byte counter. Test chunked bodies, dishonest/missing Content-Length and parser rejection.
5. WS defaults: 256 KiB frame limit before JSON parse, 60 messages/user/min, five connections/user and
   100/IP. AI defaults: two concurrent requests/user, 20 requests/user/5 min, 60/tenant/5 min; release
   capacity on disconnect, success, error and timeout. Keep existing history/token-step/time bounds.

Acceptance: limits are shared, deterministic, early and cleanup-safe; legitimate boundary-sized traffic works.
Depends on T00/T05. Split limiter storage, HTTP integration and WS/AI integration into small review slices.

Revalidation note (2026-10-17): the prior client-IP helper returned `unknown` for direct requests and
trusted the first forwarded value whenever `TRUST_PROXY_HEADERS=1`. It now uses the Node adapter's socket
peer, validates addresses, and accepts only a single valid forwarded value under explicit proxy mode;
login recovery metadata and WebSocket metadata share the resolver. Tests reproduce the unknown-peer,
spoofed-chain, and malformed-address failures. This closes only the client-identity subtask; shared
PostgreSQL counters, configured request budgets, body/frame bounds, and cleanup remain open.

Counter-store progress (2026-10-17): `rate_limit_counters` now has an indexed expiry and a composite
subject/window key; `consumeRateLimit` uses one atomic PostgreSQL UPSERT and HMAC-SHA256 keys, and
`deleteExpiredRateLimitCounters` removes a bounded batch. Unit tests cover deterministic boundaries,
secret/scope separation, and input validation; disposable-DB tests cover shared concurrent increments,
limit decisions, rollover, expiry, and cleanup. Remaining T09 requirements are endpoint wiring and
validated budgets, generic 429/Retry-After and fail-closed 503 behavior, pre-parser HTTP/MCP body caps,
WebSocket byte/message/connection limits, AI concurrency/request budgets, and automatic cleanup.

Public auth/API progress (2026-10-17): login, recovery, and registration enforce account and peer-IP
budgets on both HTML and JSON transports before account lookup, password verification/hashing, or email
enqueue. Public `/auth/*` and `/api/*` middleware applies a peer-IP budget; authenticated API routers
also count resolved user IDs. Defaults match the plan and bounded environment overrides validate during
module startup. Tests prove generic 429 + `Retry-After`, fail-closed 503, short-circuit before the user
lookup, and separate account/IP behavior. Remaining work is automatic counter cleanup, pre-parser body
caps (including MCP), WebSocket limits, and AI concurrency/request budgets.

Cleanup/body progress (2026-10-17): a minute timer begins after database startup, immediately runs one
bounded expiry cleanup, and logs only a fixed message on failure. A pre-parser counter enforces 1 MiB
ordinary and 256 KiB MCP limits against actual bytes, including streamed requests with missing or
dishonest `Content-Length`; oversized streams are cancelled, and `/api/files/upload` is excluded for its
own 25 MiB byte limit. Integration tests cover exact-boundary acceptance, both streamed oversized cases,
MCP rejection, and upload exclusion. Remaining T09 work is WebSocket and AI resource budgets.

WebSocket/AI progress (2026-10-17): `rate_limit_leases` reserves active slots across server instances
under a PostgreSQL advisory lock; expired rows are reclaimed on acquisition and bounded cleanup, while
release and renewal are explicit. WebSockets enforce the planned 256 KiB frame, 60 messages/user/minute,
five connections/user and 100/IP limits; heartbeat/message activity renews leases, and close cleanup
releases them. The asynchronous open/message lifecycle is serialized so early frames cannot bypass checks,
and a close during user-status initialization now cleans up the late registration. AI checks 20/user and
60/tenant requests per five minutes before role/model work and reserves two active requests/user; the
lease is released in `finally`, with the existing 120-second model timeout and a five-minute crash expiry.
Unit/integration tests cover budget denial, stream failure release, frame/message limits, active connection
capacity/release, lease concurrency/reclamation/cleanup, and migration 008 up/down on a temporary DB.
Socket cleanup now emits an internal connection-closed event. The AI bridge aborts per-connection request
controllers, and `streamAiChat` combines that caller signal with its existing 120-second provider timeout;
the concurrency lease stays held until the provider stream exits and its `finally` releases the lease.
Mocked orchestration tests prove disconnect cancellation reaches the provider signal and releases capacity
after stream failure. A real socket test injects a shared-counter store failure and verifies close code 1013
before message processing. Final T09 verification on 2026-10-17: all server unit tests passed (87 files / 730
tests); after safe `stacks_test` preflight, `yarn test:server test/security --retry=0` passed (15 files / 99
tests). Migration 008 applied with both expiry indexes and rolled back on a temporary database, which was
then dropped. `yarn workspace @stacks/server tsc --noEmit` passed. The first parallel security run found a
test-only shared-user slot collision; the cap test now creates its own session-bound fixture and the full
security folder passes. T09 is complete.

T13 direct error progress (2026-10-17): a RED test reproduced a direct `replyError(Error, ..., 500)` leak
containing SQL and a token sentinel. The helper now substitutes the generic localized error for non-AppError
5xx responses, omits arbitrary error payloads, and supplies `INTERNAL_ERROR` while preserving status.
Focused error-handler tests pass. Warm-cache authorization/revocation behavior and the rest of T13's
header/route/error matrix remain open.

T14 follow-up (2026-10-17): a RED sentinel test confirmed that an AI WebSocket database failure was
logged with the raw error text. The catch path now logs a fixed message; its focused unit regression
passes. This covers only that limiter failure path; run the full token/provider/AI sentinel matrix before
closing T14.

### T10 — Bound streaming uploads and decoder work (S07)

1. RED streaming cases: unauthorized parent denied before consuming any byte; exactly 25 MiB accepted;
   limit+1 byte, dishonest Content-Length, infinite/slow stream, disconnect, reader error and empty content
   terminate with no DB row/temp file/progress leak. Enforce the cap on actual bytes, not only headers.
2. Default `MAX_UPLOAD_BYTES=26214400` and 60-second upload deadline. Authorize parent/category first;
   stream to a request-owned temp file with incremental SHA-256/backpressure instead of chunk accumulation.
   Cancel/release reader and remove temp files in finally. Atomically publish only after authorization,
   type validation and successful persistence; rollback must not remove another request's shared file.
3. Cap filename at 255 UTF-8 bytes; reject control characters, path separators and malformed category/UUID.
   Validate `check-existing` JSON with Zod as strictly as upload metadata. Reconcile declared image types
   with actual bytes using existing decoders; other arbitrary attachments may remain downloads as octet
   stream. Active formats never render inline. Fail unsupported image decoding safely.
4. Limit decoded images to 40 million pixels and two concurrent thumbnail jobs/process; cap work time at
   15 seconds with actual cancellation/worker termination, not just a rejecting Promise. Test decompression
   bombs, truncated formats and MIME mismatch using bounded fixtures; do not allocate giant real images.
5. Progress state is scoped to tenant/user/request, bounded and cleaned on all paths. No other user's hash,
   size or status can be read from a guessed upload id.

Acceptance: uploads cannot allocate memory proportional to an unbounded body or outlive defined budgets.
Depends on T09 and T11 authorization; keep route validation and storage refactor separate slices.

### T11 — Attachment mutation authorization and hash oracle (S09)

1. RED table by attachment category: owner/authorized writer may upload/delete; same-tenant read-only
   viewer/unrelated user and other-tenant admin may not. Cover single and bulk deletion and use denied
   writes that would otherwise change rows. Reading/preview/download remain available to allowed viewers.
2. Introduce explicit parent **write** authorization using the same domain policy as editing that parent,
   including comments RBAC where applicable. Visibility alone never grants attachment mutation. Do not
   invent a separate weaker attachment policy; read-only resource tests must prove parity.
3. Eliminate external hash-existence disclosure: retain `/check-existing` temporarily as a validated,
   authorized no-op returning `null`, so clients upload bytes normally. Internal post-upload dedup may
   still operate after the caller has supplied the content and passed write authorization. Update the
   client/docs to stop relying on preflight reuse; do not add a source-id API unless a later request needs it.
4. RED: knowing a hash for an inaccessible same-tenant attachment gives neither metadata nor a new
   attachment; another tenant cannot use it either. An ordinary upload of those bytes still succeeds for
   an allowed writer and preserves internal dedup without leaking existence information.

Acceptance: all attachment writes obey parent write policy and hash guesses disclose no source file data.
Depends on T00; complete before T10 changes ingestion internals.

Revalidation and closure evidence (2026-10-17): `CompanyEntity` is tenant-scoped and has no ACL row;
company create/update and logo attachment writes use the `COMPANIES` RBAC write permission. Documents,
notepads and tasks use ACL-owner/admin write rules, while project descriptions, task comments and avatars
use project-settings, comments-RBAC and self/admin rules. A regression first reproduced a successful
same-tenant read-only company update; it and the company-logo role-writer test failed before their guards
were added. Policy tests cover every attachment category, and the disposable-DB loader suite covers all
nine categories, allowed read/write controls, single and bulk denial, cross-tenant admin denial and
unauthorized stream rejection before body consumption. Route tests verify valid hash guesses return only
`null`, with parent write authorization still required. The suite passed on disposable `stacks_test`; see
tasks/todo.md for exact commands and results. T11 acceptance is recorded complete.

### T12 — Tenant-safe physical file lifetime (S08)

Revalidation against the current checkout (2026-10-17): `FileEntity.hash` is globally unique in the model
and in the disposable PostgreSQL schema. Before the T12 upload change, `uploadFile` looked up by both hash
and tenant, so a second tenant's identical-byte upload would hit the global unique constraint instead of
reattaching to the existing row. The originally described two-independent-file-row scenario was therefore
not reachable through that upload path. A shared file row can still have attachment rows with different
tenant ids (the FK is only on `fileId`), and a loader regression reproduced deletion of the physical object
while such a live foreign-tenant reference remained. T12 now uses the global content object explicitly;
keep cross-tenant reference protection and same-hash upload/delete concurrency as acceptance criteria.

1. RED: tenants A and B upload identical bytes; with DELETE_FILES true, removing A's final reference leaves
   B download and preview intact. Repeat deletion orders, concurrent operations and DB rollback failures.
2. Preserve existing global hash paths to avoid a destructive storage migration. Treat bytes as globally
   reference-counted internal objects: physical deletion checks all tenants' live attachments/file rows,
   in addition to existing tenant-specific logical deletion. Global lookup stays server-only.
3. Publish/delete under a PostgreSQL transaction-level lock derived from content hash shared by upload,
   reattach and deletion. Defer destructive disk work until logical commit, re-acquire/check current global
   references under the same lock before unlink, and treat failure as retriable orphan cleanup, never lost
   user data. Test rollback and upload-versus-delete races with separate DB connections.
4. Use the canonical PREVIEW_DIR for cleanup. Before unlink, validate hash grammar, resolve canonical
   storage root/target, refuse root/outside paths and symlink escapes, and require the internal file record
   as ownership evidence. Tests use temp directories and symlinks; never manipulate real uploads.
5. DELETE_FILES=false preserves physical bytes while logically hiding deleted attachments, as before.
   Document its retention effect. A reconciliation command, if required for failures, defaults to dry-run,
   records only orphan identifiers and requires explicit execution authorization for existing data.

Acceptance: one tenant cannot destroy another tenant's physical object; failed transactions preserve data.
Depends on T11; coordinate T10 publication under the same hash lock.

### T13 — Private cache headers, filenames, and safe errors (S12)

1. RED route tests require `Cache-Control: private, no-store` on authenticated file metadata/preview/HTML/
   download, auth/token responses and boot/people responses. Ensure application-internal caching cannot
   restore public headers. Verify cache separation and ACL revocation while entries are warm.
2. Keep successful static assets cacheable. Ensure auth and policy checks precede internal cache hits;
   invalidate affected tenant data after permission/user changes. Never conflate HTTP shared caching and
   per-user in-memory caching.
3. Encode download filenames with safe quoted ASCII fallback plus RFC 5987 `filename*`; reject CR/LF/NUL,
   strip path components, preserve useful Unicode. Test quotes, slashes, semicolons and non-ASCII names.
   Maintain nosniff and attachment disposition for potentially active formats.
4. Audit direct `replyError(Error)` paths: the global handler already hides unknown/SQL errors in
   production, but the response helper can expose arbitrary messages when called directly. RED inject
   synthetic SQL/path/token-bearing errors into file/OAuth/MCP/provider paths and assert generic public
   errors, preserved status/code, and redacted server logs. Retain safe validation details.

Acceptance: private responses cannot be shared-cache hits and hostile names/errors cannot inject/leak data.
Depends on T01/T08/T11; affected focused route/cache tests plus native HTTP header inspection.

### T14 — Logs, debug viewer, and secret configuration (S13, S15)

1. RED sentinel tests cover token route URLs, auth errors, headers, cookies, passwords, OAuth credentials,
   activation/reset links, provider errors and AI tools. Assert values absent from logs, not just field names.
2. Remove account-token logging and redact sensitive URL segments/query values before request logging.
   Preserve route template, request id, actor id and result code for security investigations. Bound and
   sanitize client-controlled log strings. Do not log entire provider errors/request configuration.
3. Disable AI debug capture/viewer in production and refuse viewer startup there. Bind viewer explicitly to
   `127.0.0.1`, validate exact Host/Origin, and require an ephemeral locally generated access credential
   for read/delete APIs. Print its access instructions without adding the credential to tracked files.
   A remote bind is out of scope. This protects against LAN exposure, DNS rebinding and hostile websites.
4. When explicitly enabled in development, write debug directory/file with 0700/0600 permissions, redact
   credential-shaped fields recursively and cap stored logs to 10 MiB and 24 hours. Use bounded reads and
   rotation; read-count limit alone is insufficient. Mark conversation text as sensitive even after redaction.
   Test production refusal, binding, unauthorized requests, host spoofing, expiry and file-size rotation.
5. Require JWT_SECRET and COOKIE_SECRET to be distinct, at least 32 UTF-8 bytes and not known/default/
   repeated-character placeholders in strict mode. Explain that length validation cannot prove entropy;
   document cryptographic generation. Test existing strict/dev/test modes without using actual secrets.

Acceptance: secret sentinels never reach public errors/logs and debug storage has bounded local exposure.
Depends on T01/T08. Keep request redaction, debug controls and secret validation separate small changes.

### T15 — Independent completion audit of remaining surfaces

These are **required investigations**, not additional confirmed vulnerabilities. For each row, write an
abuse test before a fix if a defect is established; otherwise record the inspected invariant and test.

| Surface              | Required independent check / regression                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| REST authorization   | Enumerate actual registered methods/routes. Test no credentials, forged UUID, A viewer and B admin for reads/writes/bulk operations; protected routers must use mountAuthenticated or equivalent explicit guards. Public routes remain an explicit allowlist.                                                                                                                                                                                    |
| SQL/loaders          | Inspect raw literals/replacements, sort/filter construction, mass assignment and relationships. Injection strings remain data; tenant/audit/admin/role fields cannot be overwritten; child links cannot point across tenants; missing ACL fails closed.                                                                                                                                                                                          |
| AI/MCP               | Execute actual registered tools through MCP and chat under A/B contexts, including concurrent calls, forbidden ids, forged history/choice replies, replay and prompt-injected resource text. Server loaders authorize mutations regardless of tool annotations/prompts. Keep chat confirmations enforced in code. Do not impose interactive chat confirmation on MCP as an undocumented protocol break; MCP still must enforce schemas/ACL/RBAC. |
| AI isolation/cost    | Inspect conversation/prompt caches, key construction and cleanup; same conversation id across users/tenants never shares data. Test disconnect/timeout frees concurrency, no cross-request AsyncLocalStorage leakage, no provider key in public config/debug. Network calls mocked; live model evaluation is optional evidence only.                                                                                                             |
| Google credentials   | Verify refresh and account switching cannot mix users. T01 prevents response leakage; separately assess encrypted-at-rest credential storage/key management for deployed threat model. Do not add encryption without a key backup/rotation/migration design and operator decision.                                                                                                                                                               |
| PDF/export           | Preserve sanitizer/network blocking/JS-off controls. Probe unsafe links, file/data URLs, CSS/network resource loads, oversized exports and spreadsheet formula payloads (`=`, `+`, `-`, `@`) through real output. Inspect `--no-sandbox` deployment containment; do not claim arbitrary code execution from that flag alone.                                                                                                                     |
| Email                | Verify queue recipient/template lookup tenant binding, HTML escaping, header newline rejection, retries and suppression for disabled users. Test with fake transport, never deliver real mail. Record retention/deletion of token-bearing sent/failed queue rows.                                                                                                                                                                                |
| Mobile               | Verify SecureStore use, trusted server URL scheme and behavior on host switch. No old-host token may be sent to a newly selected host; logout and cache clearing precede switch. HTTPS in production; explicit local development exception only. Add isolated tests using the repo's available tooling; do not pretend a mobile unit script exists (currently none).                                                                             |
| Secrets/supply chain | Scan tracked files/history with a reviewed secret scanner; record paths/rule ids only, never values. Inspect root Yarn scripts/CI and independent `third-party/rc-gantt/pnpm-lock.yaml` boundary. Native audit must succeed or remain blocked. Advisory severity is not runtime reachability.                                                                                                                                                    |
| Deployment/privacy   | Inspect env templates, proxy TLS/trusted forwarding, debug exposure, PostgreSQL network access, container privileges, backup permissions/restore and user-data retention/deletion inventory. Do not reset infrastructure or treat self-hosted misconfiguration as a proven source-code exploit.                                                                                                                                                  |

Dependency procedure: reproduce the Yarn audit error with preserved exit status; inspect the lockfile and
Yarn/registry compatibility without reinstalling the shared checkout. Try an explicitly scoped alternate
registry only if it supports the same native audit. If a manager migration or lockfile repair is required,
isolate it as a separate reviewed task. Never generate a competing lockfile merely to get a green scan.
Triage advisory id, exact resolved version, dependency path, runtime/build/test reachability and minimum
fixed version; upgrade one family at a time with regression checks. Every unresolved reachable high/critical
requires mitigation, owner and review date; a failed scan is a verification gap, not a zero finding result.

## 5. Verification commands, rollout, and completion gates

Run from repository root. Exact test names below are planned additions; existing names are cited where
available. Confirm scripts/config discovery before invoking. Unit tests belong in discovered `src/**/*.test.ts`
or existing allowed unit test directories. New integration specs belong under server `test/`.

```bash
# RED/GREEN examples (unit; does not invoke full DB global setup)
yarn test:server:unit src/services/__tests__/testDatabaseSafety.test.ts
yarn test:server:unit src/routes/__tests__/socket.security.test.ts
yarn test:server:unit src/loaders/__tests__/people.publicFields.test.ts

# Integration: ONLY after T00, disposable DB target and explicit reset opt-in
yarn test:server test/security/credentials.test.ts
yarn test:server test/security/sessions.test.ts
yarn test:server test/security/accountTokens.test.ts
yarn test:server test/security/files.test.ts
yarn test:server test/googleAuth.test.ts

# Consumers and broad checks after corresponding changes
yarn build:internal
yarn workspace @stacks/server tsc --noEmit
yarn workspace @stacks/app tsc --noEmit
yarn workspace @stacks/mobile tsc --noEmit
yarn test:server:unit
yarn test:server
yarn workspace @stacks/app test --runInBand
yarn lint
yarn type-check:e2e
yarn test:e2e playwright/tests/auth/auth.spec.ts --retries=0
yarn test:e2e playwright/tests/permissions/permissions.spec.ts --retries=0
yarn npm audit --all --recursive --json
yarn prettier --check <explicit-touched-files>
```

`yarn build:internal` invokes install/build steps; run it when shared types/database changes require it,
after inspecting package scripts and existing environment. Do not run `yarn setup` or `yarn clean`.
Use the email workspace's existing Vitest configuration for worker tests after checking its package scripts.
Run newly added focused XSS/CSRF E2E scenarios, then each entire affected spec with retries disabled.
Playwright traffic must use server port 3000 (or configured APP_PORT); webpack remains on 3001. Do not
terminate unrelated processes. Use a valid development license, never bypass production license checks.

For each implementation slice, record: finding id; observed abuse; acceptance criteria; changed paths;
RED command/assertion; GREEN command/result; allowed control; independent variant; package checks;
cleanup outcome; limitations. Fixtures that return 200 **or** 404 opportunistically do not prove access
control. Assert exact expected status and DB/file side effects with known fixtures.

Rollout sequence for the later operator/agent:

1. Complete T00 and urgent S01/S02/XSS fixes first. Keep each small change independently reviewable;
   feature-freeze unsafe affected endpoints if production needs emergency containment, subject to task
   authorization. This handoff does not authorize operating the deployment.
2. Finish session/token/origin/OAuth migrations and consumer changes as a coherent release. Back up DB
   and storage, prove restoration on disposable targets, and test migrations up/down/up. Rollbacks must
   never restore acceptance of compromised legacy sessions. Tell operators all users must sign in again
   and pending legacy activation links expire; document manual resend and Google reauthorization steps.
3. Install limits before reopening expensive surfaces; verify tenant/file fixes with DELETE_FILES both
   false and true. Account for shared database/storage and multi-instance rate counters. Preserve existing
   user data; do not run bulk deletion, secret rotation or provider revocation without operator authorization.
4. In an authorized staging environment, independently run cookie/header inspection, hostile-origin form/
   WS attempts, A/B socket captures, secret-sentinel response tests, revoked-token replay, safe small upload
   limits and OAuth mocks. Observe denial/error counters and latency using identifiers only, not payloads.
5. Production monitoring should track auth failures, revoked sessions, rejected origins, limiter denials,
   upload/decoder failures, denied cross-tenant delivery attempts and OAuth state failures. Baseline allowed
   login/API/WS activity before rollout; investigate unexplained denial spikes immediately. Never disable a
   security boundary automatically to restore traffic. User deployment/merge authorization remains required.

Completion requires all confirmed findings fixed with regression evidence, all T15 rows investigated,
positive flows working, appropriate tests/build/type/lint/format checks executed, migrations verified, and
every gap explicitly resolved or reported as blocked. A dependency audit failure, unavailable browser,
missing disposable DB or missing development license must remain visible. Do not describe the system
as secure or the work as complete while required verification remains unperformed.

At handoff, inspect status/staged/unstaged diffs, orphan code and artifacts again. Format only touched
source/docs. Do not stage/commit/push. Refresh Graft after substantial implementation changes. Follow
SECURITY.md for private disclosure; do not publish exploit details in public issues or PRs.

## 6. Primary references

- Repository: root/scoped AGENTS; `docs/AGENT_WORKFLOW.md`; server permissions, loaders, cache,
  realtime, AI and export guides; `docs/E2E.md`; package scripts and active test configs.
- [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
  supports authenticated upgrades, Origin checks, recipient authorization and limits used in T02/T03/T09.
- [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
  documents state validation used in T07.
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
  informs T08 request binding and trusted-origin checks.
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
  informs T05 cookie/session lifetime and invalidation checks.

These sources support security practices, not claims that the current repository passes their controls.
