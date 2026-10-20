# Remaining tasks

## Credentials and retained data

- [ ] Rotate the exposed Google OAuth client secret in Google Cloud and every active deployment through an approved rollout. Separately decide whether affected user grants or refresh tokens require revocation.
- [ ] Inventory and purge retained CI artifacts/caches, release bundles, Docker images/tags, registries, backups, and build contexts that may contain exposed credentials. Triage remote secret-scan candidates; record affected artifact identifiers, purge results, and unavoidable expiry dates without recording secret values.
- [ ] Confirm whether `packages/server/import/workspace-imported_2026-02-02T16-06-48-706Z/people` contains disposable fixture data. If it contains real credentials or personal data, identify affected accounts, authorize remediation, and securely contain or delete the data.
- [ ] Run a fresh redacted secret scan on the current committed history and release candidate; triage and contain any confirmed findings.

## Google OAuth staging verification

- [ ] Verify the live Google linking flow on authorized HTTPS staging with dedicated test accounts: state and S256 PKCE, initiating-session binding, replay rejection, calendar read/create/update/delete, token refresh, disconnect, and reauthorization. Save redacted evidence only.

## Dependency and audit follow-up

- [ ] Review and approve or revise the proposed dispositions for [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh), and [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). Recheck dependency paths and upstream fixes; record maintainer decisions and review dates.
- [ ] Resolve the Yarn all-environment audit HTTP 400 and establish a reproducible audit command for all workspaces before release.

## Integration and browser verification

- [ ] Confirm the server integration-test CI job passes against its disposable PostgreSQL database with the reset safety opt-in enabled.
- [ ] Complete the browser editor smoke test against Stacks: sign in, edit, save, reload, and verify the saved result. Use an isolated test database; once PostgreSQL is available, check and remove only `stacks_editor_smoke_20261020_test` if it exists.

## Signed release and staging

- [ ] Provision authorized release-signing keys and passphrase through approved custody; verify the license-verification public key and staging license. Keep private keys and passphrases out of Git and artifacts.
- [ ] Build a signed release candidate and retain its commit/tag, toolchain and lockfile identifiers, redacted build logs, artifact hashes, integrity-verification result, image digests/SBOM, and secret-scan result.
- [ ] Complete authorized staging checks for TLS/cookies, origin and proxy enforcement, private responses, PostgreSQL role/network isolation, production debug access, writable mounts, container hardening, and Chromium PDF behavior. Record sanitized results and legacy-session/activation-link expiry behavior.
- [ ] Record the release pass/fail decision, accepted deviations, rollback contact, and required fresh-sign-in or reauthorization notice before production approval.

## Data protection and recovery

- [ ] Decide and document encryption-at-rest and access controls for PostgreSQL, backups, uploaded files, logs, and artifact storage; decide whether OAuth-token application encryption is required and approve a migration/rotation/restore design before implementation if so.
- [ ] Set backup retention and recovery-point/time objectives, assign an owner, and restore a recent backup to an isolated disposable target. Verify migrations, files, startup, and account/token redaction, then destroy only that target under the approved procedure.
- [ ] Define and assign retention and erasure policies for deleted users and related data, files, email, Google credentials/grants, debug logs, and external AI-provider data. Decide the `DELETE_FILES` policy and document its effect.
