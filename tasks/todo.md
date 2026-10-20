# Security remediation — remaining work

Updated 2026-10-20 (Europe/Rome). Invitation and account-revival fixes are complete; do not reopen
without a concrete regression. Section 2 records local dependency evidence and unresolved dispositions;
operator access or decisions remain open. The independent E2E backlog remains in
[e2e-coverage/todo.md](e2e-coverage/todo.md).

## 1. Google credential rotation, artifact cleanup, live verification

- [ ] **Operator: inventory and rotate the exposed Google OAuth client secret.** Identify the Google
      Cloud OAuth client and environments that used the credential copied into generated build/image
      contexts. Rotate the client secret in Google Cloud; update the secret manager/deployment settings for
      every active environment and restart/roll out only through the approved release. Decide separately
      whether affected user grants/refresh tokens need provider revocation and user reauthorization; client
      secret rotation and per-user grant revocation are distinct actions. Record dates, affected environment
      identifiers, approver and completion evidence without recording secret values.
- [ ] **Operator: contain retained copies.** Inventory CI artifacts/caches, release bundles and Docker
      images/layers/tags, registries, backups and any retained build contexts from the exposure window. Remove
      affected copies using each system's retention/purge controls and record artifact identifiers, purge
      results and unavoidable retention/expiry dates. Review relevant source/history with a secret scanner;
      report paths and rule IDs only. Source inspection now shows the server build reads configuration at
      runtime and the Docker context excludes `.env`; that does not establish cleanup of historical outputs.
- [ ] **Operator: verify provenance and authorize handling of the local imported people data.**
      Decision owner: project maintainer; name a data owner if the import contains real records.
      `packages/server/import/workspace-imported_2026-02-02T16-06-48-706Z/people` is ignored and
      untracked. Sanitized Gitleaks triage found 20 matches in `password`/`passwordConfirm` fields
      across 10 records: 10 distinct nonempty values, each repeated as its confirmation; none
      matched the common-placeholder set checked. Treat as possible real plaintext credentials
      and personal data until the maintainer confirms the source is disposable fixture data. If
      it is real, identify affected accounts and authorize account-credential remediation and
      secure containment/deletion. No values were recorded and no data was changed. See
      `evidence/gitleaks-local-triage-2026-10-20.txt`.
- [ ] **Operator: inventory and contain remote secret-scan candidates.** Gitleaks 8.30.1 scanned
      repository history and the current working tree with full redaction. History and working
      tree report the same candidate at `.yarn/releases/yarn-3.6.4.cjs`, confirmed as the same
      unquoted parser identifier false positive. The working-tree scan reported 1,201 detections across 22
      path/rule pairs (1,200 `generic-api-key`, one `linkedin-client-id`). Local candidate
      classifications and sanitized comparison results are in
      `evidence/gitleaks-local-triage-2026-10-20.txt`; raw path/rule counts are in
      `evidence/gitleaks-working-tree-2026-10-20-095547.txt`. The 22 candidate paths include
      the source `packages/server/.env`, leaving 21 comparison targets outside it. Exact,
      URL-encoded and JSON-escaped forms of the locally available Google client secret matched
      none of 1,254 local artifact files, the 21 other working-tree candidates or the one
      available historical Yarn bundle version. No exact match for other configured local
      secrets was found outside `.env`. These local checks do not inspect CI caches, registry
      images, backups or hosted Git refs, and do not prove prior exposure copies were purged.
      Inventory and purge/expire remote copies using each system's controls; record identifiers,
      outcomes and unavoidable expiry dates without recording secret values.
- [ ] **Operator: verify the real Google flow on authorized staging** using the rotated credential, a
      dedicated test Stacks account, a dedicated Google test account/calendar, and the exact deployed HTTPS
      origin and registered redirect URI. Save timestamped redacted logs/screenshots and provider console
      evidence; never save authorization codes, tokens or client secrets. Procedure:
  1. Start from a signed-in browser session; initiate Google linking and confirm the consent URL uses the
     registered client/redirect, requested calendar scopes, fresh state and S256 PKCE challenge.
  2. Complete consent with the intended Google account; confirm the callback returns to the initiating
     browser/session, succeeds once, and links only the intended Stacks user. Confirm replay is denied.
  3. Confirm status is connected and calendars/events load. Create a uniquely named disposable event in
     the dedicated test calendar, read it back, update it, then delete that test event; record each result.
  4. Exercise refresh using a staging account/token whose access token is expired or through the approved
     provider test procedure. Confirm calendar access succeeds afterward and the linked account remains
     unchanged. Do not force expiry by editing real user data.
  5. Disconnect; confirm status is disconnected and Google credentials are absent from that Stacks
     account while unrelated provider data remains. Reauthorize and confirm the correct account works
     again. Record all outcomes and any provider/configuration failures.

## 2. Dependency advisory triage — proposals only, not accepted risk

The project maintainer is the **proposed accountable owner** for all dispositions; the technical
investigation and local mitigations were prepared in this task. Proposed review date for each item:
**2026-11-20**, or sooner if an upstream fix or dependency path changes. These are proposals only;
**no residual-risk acceptance is operator-approved**.

| Advisory / resolved version and lockfile paths                                                                                                                                                                                                                                                                                            | Reachability and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Proposed disposition, proposed owner and review date                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), High — `braces@3.0.3`**. App: `eslint-webpack-plugin>micromatch>braces`, `webpack-dev-server@5.2.7>http-proxy-middleware>micromatch>braces`; mobile: `tailwindcss>micromatch>braces`, `expo>@expo/metro>metro-file-map>micromatch>braces` (plus Metro paths). | Build/dev tooling; source search found no app caller passing attacker-controlled patterns. The live GHSA remains High for `braces <=3.0.3` with no patched release; upstream issue [#70](https://github.com/micromatch/braces/issues/70) contains maintainer dispute of the finding, but does not change advisory status. Local patch bounds nesting in parsing and in both recursive walkers; this also covers callers that supply a manually constructed AST directly to public `compile`/`expand`. The harness tests nested brace/paren strings through both methods and 5,000-level ASTs through each method, with 5s subprocess limits; normal compile/expand controls pass. Repository search found no untrusted runtime caller of the AST forms.                                                                                                                                                                                                                                                                                                                                                                                                    | Retain the tested local patch. Remove it only when an upstream fixed release or compatible replacement resolves every path and passes these string and direct-AST regressions plus the app consumer build. Owner: project maintainer. Review: **2026-11-20** (earlier if upstream changes). Proposal, not risk acceptance.                                                                                                         |
| **[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), High — locally patched `node-forge@1.4.0`**. App path: `webpack-dev-server>selfsigned>node-forge`; mobile paths include `expo>@expo/cli>node-forge` and `expo>@expo/cli>@expo/code-signing-certificates>node-forge` (full fresh audit paths in evidence).     | Build/development and Expo code-signing CLI tooling. The current GHSA affects `<=1.4.0` and lists no patched release (High, CVSS 8.7 v4; Yarn audit metadata reports 7.5 v3); registry latest remains `1.4.0`. The local backport's nested `DigestAlgorithm` length guard matches the fix in upstream's still-open [PR #1152](https://github.com/digitalbazaar/forge/pull/1152); that PR proposes 1.4.1 but is not a release. Installed Expo CLI calls `validateSelfSignedCertificate`, which calls `certificate.verify(certificate)`; the dependency harness exercises that consumer with a generated disposable certificate and rejects the advisory's low-exponent forged-signature vector directly through `node-forge`. Inputs are project/config controlled during local code-signing actions; no app request path was found. Earlier RSA advisory GHSA-ppp5-5v6c-4jwp was fixed in 1.4.0.                                                                                                                                                                                                                                                           | Keep the tested local backport; review code-signing input provenance and replace it with an official fixed release when available, after the same forged-signature vector and Expo validator test pass across all paths. Owner: project maintainer. Review: **2026-11-20** (earlier if upstream changes). Residual acceptance pending.                                                                                             |
| **[GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh), Moderate — mobile `@tiptap/core@2.27.3`** via `@10play/tentap-editor@0.5.33>@tiptap/starter-kit@2.27.2>@tiptap/core@2.27.3` (four current mobile audit paths; see raw evidence).                                                                              | Installed v2.27.3 bundle defines own `__proto__` with `Object.defineProperty`; regression verifies prototype and inherited-attribute safety. Tiptap maintainer issue [#8339](https://github.com/ueberdosis/tiptap/issues/8339) documents the v2.27.3 backport (PR #8301, release PR #8310), but remains open; the live GHSA metadata still lists only 3.30.4 as patched and range `>=2.0.0-alpha.0 <3.30.4`. `yarn why -R @tiptap/core` places v2.27.3 only under mobile; the app-scoped audit nevertheless repeats a v2 finding, while the app lock paths resolve to 3.30.5. Treat it as mobile reachability plus advisory metadata discrepancy, pending maintainer review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Technical disposition: known backported fix / advisory metadata false positive for v2.27.3; maintain the separate mobile v2 graph and regression. Owner: project maintainer. Review: **2026-11-20**. Maintainer review of the proposed disposition remains open; no risk acceptance is implied.                                                                                                                                    |
| **[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), Moderate — `sprintf-js@1.0.3`**. `yarn why -R` confirms app tooling path `@stacks/app>babel-jest>@jest/transform>babel-plugin-istanbul>@istanbuljs/load-nyc-config>js-yaml@3.15.2>argparse>sprintf-js`.                                                       | The exact app lock path from `yarn why -R sprintf-js` is `babel-jest>@jest/transform>babel-plugin-istanbul>@istanbuljs/load-nyc-config>js-yaml@3.15.2>argparse@1.0.10>sprintf-js@1.0.3`; it is an app test/config tool path. The mobile workspace audit also reports five sprintf paths, but `yarn why -R sprintf-js` shows no mobile resolution path. Likewise, several version-unqualified paths in the app audit do not match the lock graph; use `yarn why` for installed reachability and preserve raw audit output as advisory evidence only. In the actual vulnerable edge, argparse uses fixed strings for argument errors; its format-capable help/usage templates are project configuration. js-yaml 3.15.2 imports argparse only from its `bin/js-yaml.js`; its CLI help/prog strings are static, input YAML is not a format string, and repository scripts do not invoke that bin. No server/browser request-data path reaches these tools. The GHSA affects `<=1.1.3` and lists no fixed release; npm latest `1.1.3` is still affected, so a registry upgrade alone cannot resolve it. Full current audit paths are in workspace raw records. | Propose tooling-only disposition while the exact lock path remains app Jest/config tooling, the dormant js-yaml CLI is not invoked, and no untrusted format-string entry point is introduced. Recheck callers and paths at review or on graph change; maintainer approval is still required. Replace/update the path if a compatible fix becomes available. Owner: project maintainer. Review: **2026-11-20**. Acceptance pending. |

The previous app-only findings in `webpack-dev-server@4`, `webpack-dev-middleware@5`, and
`serialize-javascript@6` were resolved with `webpack-dev-server@5.2.7`, `webpack-dev-middleware@7.4.6`,
and `serialize-javascript@7.1.2`. The current app audit no longer reports those advisories; dev-server
startup, app build, and consumer regression evidence is recorded below.

Fresh native Yarn audits on 2026-10-20 (09:48 Europe/Rome) used `yarn npm audit --recursive --json`,
`yarn npm audit --all --recursive --json`, `yarn npm audit --all --recursive --environment production --json`,
and `yarn workspace <name> npm audit --recursive --json` for all nine workspaces against the immutable final
lockfile. Root recursive reported two High advisories; app reported 16 moderate/7 high affected-path counts
across three records; mobile reported 9 moderate/18 high across four records; db, license, locales-tui, server,
translations and types reported zero. Email-service and aggregate all-environment requests returned HTTP 400.
Workspace audit path strings are not consistently lock-graph accurate: the app scan repeats
`@tiptap/core@2.27.3` although `yarn why -R @tiptap/core` places it only in mobile, and the mobile scan
reports `sprintf-js@1.0.3` although `yarn why -R sprintf-js` shows that path only under app/Jest. The app's
actual core is 3.30.5. Use `yarn why` paths to assess reachability; retain native audit records as advisory
feed findings, not proof of each workspace's exact path. The correct all-workspace production scan exited 0 with four advisory records
(Tiptap v2.27.3, node-forge 1.4.0, braces 3.0.3, sprintf-js 1.0.3; 10 moderate/17 high affected-path counts);
this is not clean and does not prove runtime reachability. Raw records are in
`evidence/yarn-audit-2026-10-20-094816-fresh/`.

On 2026-10-20 at 10:00 Europe/Rome, rechecked registry latest versions (`braces@3.0.3`,
`node-forge@1.4.0`, `sprintf-js@1.1.3`) and reran
`yarn npm audit --all --recursive --environment production --json` (exit 0). It returned the same four
advisory records and 10 moderate / 17 high affected-path counts against 1,254 dependencies. The current
summary is in `evidence/dependency-recheck-2026-10-20-1000.txt`; prior per-workspace raw outputs remain in
`evidence/yarn-audit-2026-10-20-094816-fresh/`.

Yarn Berry's production filter does not establish runtime reachability for nested tooling paths. The full root
audit POST to `https://registry.yarnpkg.com/-/npm/v1/security/audits/quick` returned HTTP 400; Yarn's generic
diagnostic lists missing lock entries as one possible cause, which is not established. Email-service all-env
requests returned HTTP 400. Treat affected-path counts as counts, not unique vulnerabilities. Resolve the audit
workflow gap before release; no repository-wide clean audit is claimed.

## 3. Signed release and staging checklist

- [ ] **Release keys/access:** the authorized release engineer uses their own encrypted
      `scripts/release-signing/private.pem` and matching `public.pem`, with `RELEASE_SIGNING_PASSPHRASE`
      supplied through that engineer's approved secret custody. The repository specifies per-release-engineer
      keypairs; provision a key to protected CI only if the release owner authorizes that custody. Keep the
      private key out of Git and artifacts; the build embeds the matching public key in the signed bundle.
      Separately confirm `packages/server/public.pem` is the license-verification key and obtain a valid
      staging `license.key`. These are distinct key roles. Require authorized repository/release-pipeline and
      staging access; do not substitute an ephemeral test key for production trust. Current local inspection
      found the release-signing PEM pair absent and `RELEASE_SIGNING_PASSPHRASE` unset. The license-verification
      public key and a local `packages/server/license.key` are present, but do not prove staging custody or
      license validity.
- [ ] **Build evidence:** produce the signed release candidate; retain commit/tag, toolchain and lockfile
      identifiers, build logs with secrets redacted, artifact hashes, embedded integrity verification result,
      container image digests/SBOM and secret scan result. Verify the actual deployable server artifact and
      image, not just source or a test bundle. Record signer/key fingerprint and verification identity, not
      private key material.
- [ ] **Authorized staging evidence:** deployment operator supplies staging URL, credentials/test users,
      proxy/CDN and PostgreSQL access, logs/metrics access, and change window. Verify HTTPS/TLS; secure cookie
      flags and fresh sign-in; exact allowed origins and hostile-origin rejection; proxy-header replacement
      and blocked direct API access; private response/cache behavior; restricted PostgreSQL app role and
      network isolation; debug viewer disabled/unreachable in production mode; writable mounts limited to
      required paths/permissions; hardened container settings and Chromium PDF behavior (`--no-sandbox`
      containment or supported sandbox decision). Execute rollout probes in `plan.md` section 5, record
      expected and actual status plus sanitized evidence, and document legacy-session/activation-link expiry.
- [ ] **Release decision:** operator records pass/fail, accepted deviations, rollback contact and fresh
      sign-in/re-authorization notice before production approval. No staging/deployment result is claimed here.

## 4. Data protection, backup/restore, retention and deletion decisions

Current implementation evidence: [`UserEntity`](../packages/db/src/entities/User.ts) stores
`oauthTokens` in JSONB without app-layer encryption; [`docs/DOCKER.md`](../docs/DOCKER.md) documents a
plaintext `pg_dump` that includes that column. User rows use a `deleted` timestamp and revival clears it
([`people.ts`](../packages/server/src/loaders/people.ts)); no user hard-delete TTL was found.
[`DELETE_FILES`](../packages/server/src/loaders/files.ts) defaults to false and retains physical bytes after
logical deletion; true permits cleanup after references reach zero. [`EmailService`](../packages/email-service/src/services/EmailService.ts) deletes sent/permanently failed queue rows older than 30 days in batches of 500.
[`debugLog.ts`](../packages/server/src/ai/debugLog.ts) disables AI capture in production and otherwise
bounds local logs to 24 hours and 10 MiB. External model/provider retention follows configured endpoints
and provider terms. These facts do not establish deployed backup encryption or actual retention settings.

- [ ] **Operator decision — storage protection:** confirm encryption-at-rest and access controls for
      PostgreSQL volumes, backups, uploaded files, logs and registry/artifact storage; confirm dump permissions,
      encryption before transfer, key custody and backup access logging. Record evidence/config owner. Decide
      whether application-layer OAuth-token encryption is required. If required, approve a design for key
      provisioning, backup/restore, rotation, migration and rollback before implementation; no encryption
      change is proposed in this handoff.
- [ ] **Operator decision — recovery:** set backup frequency, retention duration, recovery-point/time
      objectives and deletion of expired copies; identify backup/storage owner. Restore a recent encrypted
      backup to an isolated disposable target, verify DB migrations and file references/objects, confirm
      application startup and account/token redaction, then destroy that disposable target under the approved
      procedure. Attach redacted commands/results, timestamps and target identifiers.
- [ ] **Operator decision — lifecycle:** define retention and erasure for soft-deleted users and associated
      projects/files, queued/sent/failed email content, Google credentials/grants, logs/debug data and external
      AI-provider data. Specify request/approval authority, grace period, legal hold, hard-delete schedule,
      backup expiry, provider revocation and evidence of completion. Decide `DELETE_FILES` policy and document
      its effect. Assign a named data owner and record approved durations; no real data deletion is authorized
      by this handoff.

## Evidence status and dependencies

- **Historical result inspected:** an earlier implementation report recorded 47 security files / 481 tests
  passing with retries disabled on a disposable database. This is historical evidence only.
- **Source inspection:** current build/proxy configuration (including the loopback dev-server default), Google OAuth runtime use and Docker context,
  release signing/integrity flow, `UserEntity.oauthTokens` JSONB storage, plaintext Docker `pg_dump`, soft-deleted user/revival behavior
  with no hard-delete TTL found, `DELETE_FILES` behavior, 30-day cleanup for sent/permanently failed email
  queue rows (up to 500 per cleanup), and the production-off / 24-hour / 10 MiB AI debug-log policy. These do not establish deployed storage encryption,
  backup schedules, or provider retention.
- **Previously executed checks (2026-10-20, earlier task turn):** the dependency patch harness passed, including the node-forge forged-signature
  vector and Expo code-signing validator; the mobile unit suite passed (4 files/12 tests); the focused app
  Tiptap tests passed (2 suites/3 tests); the app type check passed. After final dependency relinking,
  `yarn workspace @stacks/app test --runInBand src/app/__tests__/webpackDevServer.security.spec.js`
  passed (2 tests), `yarn workspace @stacks/mobile test:unit` passed (4 files/12 tests), and
  `yarn test:security:dependency-patches` passed. Earlier affected checks recorded in this handoff include
  server unit (120 files/879 tests), email service (5/52), translations (1/15), and license (1/12); the locale
  TUI suite remains incomplete as described below.
- **Braces regression extension:** the new 5,000-level direct-AST tests first failed for `compile` (stack-depth rejection was absent), then passed after depth checks were added to both recursive walkers. `yarn test:security:dependency-patches` now covers string and AST inputs across `compile`/`expand`; it passed after the final patch, followed by `yarn install --immutable --mode=skip-build` (exit 0).
- **Affected consumer verification:** `yarn build:app` exited 0 after the final braces walker guard and the
  `serialize-javascript@7.1.2` update (webpack compiled with 29 warnings; ESLint reported 189 warnings, 0 errors). After moving the app to `webpack-dev-server@5.2.7` and
  `webpack-dev-middleware@7.4.6`, a controlled startup on `HOST=127.0.0.1 PORT=0` compiled successfully,
  reported no TypeScript errors, and shut down cleanly. Its ephemeral-port log did not yield a route URL, so
  no HTTP route result is claimed. The host regression verifies default loopback binding, port 3001 and the
  explicit `HOST` override. App Jest runs emitted a Watchman recrawl warning.
- **Current resolved paths:** `copy-webpack-plugin@12.0.2` resolves `serialize-javascript@7.1.2`; app direct
  `webpack-dev-server@5.2.7` resolves `webpack-dev-middleware@7.4.6`. WDS also resolves websocket-driver 0.7.5,
  http-proxy-middleware 2.0.10 and launch-editor 2.14.1; SVGR uses SVGO 3.3.5 and CSS minimization SVGO 4.1.0.
  App `@tiptap/core` and its editor packages are 3.30.5; mobile remains separately on core 2.27.3 through
  tentap-editor/starter-kit. Vitest 4.1.12 uses Vite 8.0.16, while Vitest 3.2.7 uses Vite 7.3.7. `yarn why -R`
  confirmed the recorded dependency paths.
- **Locale TUI verification:** a fresh pre-fix Vitest 3.2.7 run failed both 30-second
  `checkLocaleIntegrity` full-corpus tests (the other 51 tests passed; run duration 124.41 s).
  The banded edit-distance implementation preserves the existing normalized Levenshtein result
  while pruning rows outside the maximum distance allowed by the threshold. A differential
  boundary test was added. Fresh final `yarn workspace @stacks/locales-tui test --reporter=verbose`
  passed 6 files/56 tests in 3.69 s; `yarn workspace @stacks/locales-tui build` and targeted
  Prettier checks also passed.
- **Test-first baseline:** before the app upgrade, the inline Markdown tokenizer regression measured
  1,595 ms against its 1,000 ms bound on Tiptap 3.30.4; the same test passes on 3.30.5.
- **Earlier native Yarn workspace audit (2026-10-20 at 09:48 Europe/Rome):** root and all nine explicit workspace audits ran against the immutable final graph
  on 2026-10-20 at 09:48 Europe/Rome, after the final braces patch lockfile update. Aggregate all-env and email-service returned HTTP 400. Root recursive
  reported two High findings; app reported 16 moderate/7 high affected-path counts across three advisory
  records; mobile 9 moderate/18 high across four; six other workspaces reported zero. Workspace audit paths are not fully consistent with the installed graph: the app scan repeats mobile's
  `@tiptap/core@2.27.3`, and mobile's scan reports app/Jest's `sprintf-js@1.0.3`. `yarn why -R` confirms app
  resolves Tiptap 3.30.5, mobile Tiptap 2.27.3, and sprintf-js only under app/Jest.
  The app audit no longer lists the Markdown ReDoS advisory, serializer advisories, or WDS/WDM findings cleared
  by the migration. The correct all-workspace production-filtered command exited 0 with four advisories
  (10 moderate/17 high affected-path counts), not a clean result or proof of runtime reachability. Raw fresh
  reports are in `evidence/yarn-audit-2026-10-20-094816-fresh/`.
- **Browser smoke remains pending:** the historical `http://localhost:3000/login` 404 was served
  by another local project (`kbai`), not Stacks, and did not exercise Tiptap. Current port 3000
  is still occupied by that process; `APP_PORT=3010` is available per the app guide and webpack
  port 3001 was free. The existing `stacks-test-db` container exposes PostgreSQL on 15432. A new
  isolated `stacks_editor_smoke_20261020_test` database was created for this browser fixture, but
  the test bootstrap did not finish; connections to PostgreSQL port 15432 reset, and `docker ps`
  returned an HTTP 500 from the Docker API. Its schema state could not be rechecked; the test
  user fixture was not created. No Stacks app/server was started and Chrome DevTools remained on
  `about:blank`; edit/save/reload was not verified. Drop only this named disposable database
  after Docker/PostgreSQL is responsive. Preserve the existing
  `stacks_test` database and unrelated port-3000 process.
- **Other check limits:** no signed release, staging, backup restore, live Google-provider check,
  or integration DB suite was run. The blocked browser smoke needs a responsive isolated local
  PostgreSQL target; production/staging checks remain separate operator gates.
- **Exact external dependencies (not yet confirmed):** Google Cloud client and CI/artifact/registry custody
  access; authorized staging origin and dedicated Stacks/Google test accounts; release-signing private key and passphrase from
  approved CI custody, license-verification public key/staging license, release pipeline access; staging
  deployment/proxy/database/log access; named data/backup owners, approved encryption/retention/recovery
  decisions and isolated restore target; a compatible Yarn audit workflow if development dependencies
  must also be audited; and explicit maintainer/operator dispositions for the flagged backport and
  proposed residual risks.

This handoff does not authorize secret rotation, provider revocation, deployment, infrastructure changes,
or deletion of real data. It does not record operator risk acceptance or claim any live, signed-release,
staging, backup-restore, or real Google-provider result. Keep the separate E2E backlog in
[e2e-coverage/todo.md](e2e-coverage/todo.md).
