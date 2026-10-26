// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * T06: activation and password-reset credentials are single-use, hashed at rest, and
 * always carry an expiry. Two concurrent replays of the same emailed link must change
 * the password exactly once, and recovery responses must not reveal which emails have
 * accounts (only the email queue sees the difference).
 */
import { describe, expect, test, vi } from "vitest";
import app from "../../src/index";
import { EMAIL_TEMPLATES } from "@stacks/types";
import { EmailQueueEntity, RoleEntity, SessionEntity, TenantEntity, UserEntity } from "@stacks/db";
import { EmailsLoader } from "../../src/loaders";
import {
    ACTIVATION_TOKEN_TTL_MS,
    createActivationToken,
    createEmailChangeToken,
    createPasswordResetToken,
    hashAccountToken,
} from "../../src/services/accountTokens";
import {
    MAX_PASSWORD_BYTES,
    MIN_NEW_PASSWORD_CHARACTERS,
    isAcceptableNewPassword,
} from "../../src/utils/passwordPolicy";
import { compare, hash } from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { Op } from "sequelize";
import { getAuthenticatedHeaders, mintSessionToken } from "../helpers/authHelper";
import { sessionStillValid } from "../../src/services/sessions";
import { translate } from "@stacks/translations";

const LEGACY_PASSWORD = "testpassword123";
const NEW_PASSWORD_A = "first-new-password";
const NEW_PASSWORD_B = "second-new-password";

/** Rows seeded by these tests; hard-deleted by cleanupSeededRows so fixtures never leak. */
const seededRows: any[] = [];

const cleanupSeededRows = async (): Promise<void> => {
    while (seededRows.length > 0) {
        const row = seededRows.pop();
        try {
            await row.destroy({ force: true });
        } catch (error) {
            console.warn("T06 fixture cleanup failed:", error);
        }
    }
};

const activeTenant = async (): Promise<string> => {
    const tenant = await TenantEntity.findOne({ where: {} });
    if (!tenant) throw new Error("No test tenant found");
    return String(tenant.get("id"));
};

const fixtureUser = async (fields: Record<string, any> = {}) => {
    const tenant = await activeTenant();
    const role = await RoleEntity.findOne({ where: { title: "User", tenant } });
    if (!role) throw new Error("Default test role not found");
    const user = await UserEntity.create({
        email: `t06-${randomUUID()}@example.com`,
        password: await hash(LEGACY_PASSWORD, 10),
        firstName: "Token",
        lastName: "Subject",
        real: true,
        role: role.get("id"),
        tenant,
        ...fields,
    });
    seededRows.push(user);
    return user;
};

const userRow = async (user: any) => (await UserEntity.findOne({ where: { id: user.get("id") } })) ?? user;

/** Stores an activation credential the way the new contract requires (hash + expiry).
 * An omitted expiry issues a fresh credential; an explicit one (including null) models
 * the expired and absent-expiry cases the contract rejects. */
const seedActivation = async (user: any, expiresAt: Date | null | undefined = undefined) => {
    const activation = createActivationToken();
    user.set("activationTokenHash", activation.hash);
    user.set("activationTokenExpiresAt", expiresAt === undefined ? activation.expiresAt : expiresAt);
    await user.save();
    return activation.token;
};

const formBody = (fields: Record<string, string>): string =>
    Object.entries(fields)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");

const postForm = (path: string, fields: Record<string, string>) =>
    app.request(path, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody(fields),
    });

const activationSucceeded = async (res: any): Promise<boolean> =>
    (await res.text()).includes("activation-success-message");

const resetSucceeded = (res: any): boolean => res.status === 302 && res.headers.get("location") === "/login";

const flashCookieOf = (res: any): string => (res.headers.get("set-cookie") ?? "").split(";")[0];

describe("Account token lifecycle", () => {
    test.each([
        ["new", false],
        ["revived", true],
    ])(
        "admin-created %s login users receive a single-use activation link without wire secrets",
        async (_kind, revived) => {
            const tenant = await activeTenant();
            const admin = await fixtureUser({ admin: true });
            const session = await mintSessionToken(String(admin.get("id")), tenant, 120);
            const existing = revived
                ? await fixtureUser({ email: `revived-${randomUUID()}@example.test` })
                : null;
            const staleSession = existing
                ? await mintSessionToken(String(existing.get("id")), tenant, 120)
                : null;
            let staleCookie: string | null = null;
            let staleResetToken: string | null = null;
            let staleEmailChangeToken: string | null = null;
            if (existing) {
                const login = await postForm("/login", {
                    email: String(existing.get("email")),
                    password: LEGACY_PASSWORD,
                });
                expect(login.headers.get("location")).toBe("/app");
                staleCookie =
                    login.headers.get("set-cookie")?.match(/(?:^|, )auth_token=([^;]+)/)?.[1] ?? null;
                expect(staleCookie).toBeTruthy();

                const reset = createPasswordResetToken();
                const emailChange = createEmailChangeToken();
                staleResetToken = reset.token;
                staleEmailChangeToken = emailChange.token;
                existing.set({
                    deleted: new Date(),
                    disabled: false,
                    token: "legacy-activation-token",
                    passwordResetTokenHash: reset.hash,
                    passwordResetTokenExpiresAt: reset.expiresAt,
                    pendingEmail: `pending-${randomUUID()}@example.test`,
                    emailChangeTokenHash: emailChange.hash,
                    emailChangeTokenExpiresAt: emailChange.expiresAt,
                });
                await existing.save();
            }
            const targetEmail = existing?.get("email") ?? `created-${randomUUID()}@example.test`;
            const role = String(admin.get("role"));
            let targetId: string | null = null;
            try {
                const response = await app.request("/api/people", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        firstName: "Invited",
                        lastName: "Person",
                        role,
                        email: targetEmail,
                        real: true,
                    }),
                });
                expect(response.status).toBe(200);
                const responseText = await response.text();
                expect(responseText).not.toMatch(
                    /activationToken|activationTokenHash|activationLink|"token"/
                );

                const target = await UserEntity.findOne({ where: { email: targetEmail, tenant } });
                expect(target).not.toBeNull();
                targetId = String(target!.get("id"));
                seededRows.push(target);
                const email = await EmailQueueEntity.findOne({
                    where: { userId: target!.get("id"), template: EMAIL_TEMPLATES.WELCOME },
                });
                expect(email).not.toBeNull();
                const link = (email!.get("data") as { activationLink: string }).activationLink;
                const token = link.split("/").pop()!;
                expect(responseText).not.toContain(token);
                expect(target!.get("token")).toBeNull();
                expect(target!.get("activationTokenHash")).toBe(hashAccountToken(token));
                expect((target!.get("activationTokenExpiresAt") as Date).getTime()).toBeGreaterThan(
                    Date.now()
                );

                if (revived) {
                    expect(target!.get("disabled")).toBe(true);
                    expect(target!.get("token")).toBeNull();
                    expect(target!.get("passwordResetTokenHash")).toBeNull();
                    expect(target!.get("passwordResetTokenExpiresAt")).toBeNull();
                    expect(target!.get("pendingEmail")).toBeNull();
                    expect(target!.get("emailChangeTokenHash")).toBeNull();
                    expect(target!.get("emailChangeTokenExpiresAt")).toBeNull();
                    expect(await sessionStillValid(staleSession!.sid, targetId)).toBe(false);
                    const replacedPasswordHash = String(target!.get("password"));

                    const oldBearer = await app.request(`/api/people/${targetId}`, {
                        headers: { Authorization: `Bearer ${staleSession!.token}` },
                    });
                    expect(oldBearer.status).toBe(401);
                    const oldCookie = await app.request(`/api/people/${targetId}`, {
                        headers: { Cookie: staleCookie! },
                    });
                    expect(oldCookie.status).toBe(401);

                    const staleReset = await postForm("/login/password-reset", {
                        token: staleResetToken!,
                        password1: NEW_PASSWORD_B,
                        password2: NEW_PASSWORD_B,
                    });
                    expect(staleReset.status).toBe(400);
                    await target!.reload();
                    expect(target!.get("password")).toBe(replacedPasswordHash);
                    const staleEmailChange = await app.request(`/auth/email-change/${staleEmailChangeToken}`);
                    expect(await staleEmailChange.text()).toContain("Verification failed");

                    const blockedLogin = await postForm("/login", {
                        email: targetEmail,
                        password: LEGACY_PASSWORD,
                    });
                    expect(blockedLogin.headers.get("location")).toBe("/login");
                }

                const activated = await postForm("/auth/activate", {
                    token,
                    password1: NEW_PASSWORD_A,
                    password2: NEW_PASSWORD_A,
                });
                expect(await activationSucceeded(activated)).toBe(true);
                const replay = await postForm("/auth/activate", {
                    token,
                    password1: NEW_PASSWORD_B,
                    password2: NEW_PASSWORD_B,
                });
                expect(await activationSucceeded(replay)).toBe(false);
                await target!.reload();
                expect(await compare(NEW_PASSWORD_A, String(target!.get("password")))).toBe(true);
                if (revived) {
                    expect(target!.get("disabled")).toBe(false);
                    const freshLogin = await postForm("/login", {
                        email: targetEmail,
                        password: NEW_PASSWORD_A,
                    });
                    expect(freshLogin.headers.get("location")).toBe("/app");
                }
            } finally {
                if (targetId) await EmailQueueEntity.destroy({ where: { userId: targetId }, force: true });
                if (staleSession)
                    await SessionEntity.destroy({ where: { userId: existing!.get("id") }, force: true });
                await cleanupSeededRows();
                await session.row.destroy({ force: true });
            }
        }
    );

    test("admin-created non-login contacts receive no activation email or credential", async () => {
        const tenant = await activeTenant();
        const admin = await fixtureUser({ admin: true });
        const session = await mintSessionToken(String(admin.get("id")), tenant, 120);
        const email = `contact-${randomUUID()}@example.test`;
        let targetId: string | null = null;
        try {
            const response = await app.request("/api/people", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    firstName: "Contact",
                    lastName: "Person",
                    role: String(admin.get("role")),
                    email,
                    real: false,
                }),
            });
            expect(response.status).toBe(200);
            const target = await UserEntity.findOne({ where: { email, tenant } });
            expect(target).not.toBeNull();
            targetId = String(target!.get("id"));
            seededRows.push(target);
            expect(target!.get("activationTokenHash")).toBeNull();
            expect(target!.get("activationTokenExpiresAt")).toBeNull();
            expect(
                await EmailQueueEntity.count({
                    where: { userId: target!.get("id"), template: EMAIL_TEMPLATES.WELCOME },
                })
            ).toBe(0);
        } finally {
            if (targetId) await EmailQueueEntity.destroy({ where: { userId: targetId }, force: true });
            await cleanupSeededRows();
            await session.row.destroy({ force: true });
        }
    });

    test("reviving a login account as a contact clears prior access and login credentials", async () => {
        const tenant = await activeTenant();
        const admin = await fixtureUser({ admin: true });
        const adminSession = await mintSessionToken(String(admin.get("id")), tenant, 120);
        const target = await fixtureUser({ email: `contact-revival-${randomUUID()}@example.test` });
        const oldSession = await mintSessionToken(String(target.get("id")), tenant, 120);
        const reset = createPasswordResetToken();
        const emailChange = createEmailChangeToken();
        target.set({
            deleted: new Date(),
            passwordResetTokenHash: reset.hash,
            passwordResetTokenExpiresAt: reset.expiresAt,
            pendingEmail: `pending-${randomUUID()}@example.test`,
            emailChangeTokenHash: emailChange.hash,
            emailChangeTokenExpiresAt: emailChange.expiresAt,
        });
        await target.save();

        try {
            const response = await app.request("/api/people", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${adminSession.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    firstName: "Contact",
                    lastName: "Again",
                    role: String(admin.get("role")),
                    email: String(target.get("email")),
                    real: false,
                }),
            });
            expect(response.status).toBe(200);

            await target.reload();
            expect(target.get("real")).toBe(false);
            expect(target.get("disabled")).toBe(true);
            expect(target.get("deleted")).toBeNull();
            expect(target.get("token")).toBeNull();
            expect(target.get("activationTokenHash")).toBeNull();
            expect(target.get("passwordResetTokenHash")).toBeNull();
            expect(target.get("pendingEmail")).toBeNull();
            expect(target.get("emailChangeTokenHash")).toBeNull();
            expect(await sessionStillValid(oldSession.sid, String(target.get("id")))).toBe(false);

            const oldSessionRequest = await app.request(`/api/people/${target.get("id")}`, {
                headers: { Authorization: `Bearer ${oldSession.token}` },
            });
            expect(oldSessionRequest.status).toBe(401);
            const oldReset = await postForm("/login/password-reset", {
                token: reset.token,
                password1: NEW_PASSWORD_A,
                password2: NEW_PASSWORD_A,
            });
            expect(oldReset.status).toBe(400);
            const oldEmailChange = await app.request(`/auth/email-change/${emailChange.token}`);
            expect(await oldEmailChange.text()).toContain("Verification failed");
            const oldPasswordLogin = await postForm("/login", {
                email: String(target.get("email")),
                password: LEGACY_PASSWORD,
            });
            expect(oldPasswordLogin.headers.get("location")).toBe("/login");
        } finally {
            await EmailQueueEntity.destroy({ where: { userId: target.get("id") }, force: true });
            await cleanupSeededRows();
            await SessionEntity.destroy({ where: { userId: target.get("id") }, force: true });
            await adminSession.row.destroy({ force: true });
        }
    });

    test("a failed activation-email queue leaves a revived login blocked and old credentials revoked", async () => {
        const tenant = await activeTenant();
        const admin = await fixtureUser({ admin: true });
        const adminSession = await mintSessionToken(String(admin.get("id")), tenant, 120);
        const target = await fixtureUser({ email: `queue-failure-${randomUUID()}@example.test` });
        const oldSession = await mintSessionToken(String(target.get("id")), tenant, 120);
        const reset = createPasswordResetToken();
        const emailChange = createEmailChangeToken();
        target.set({
            deleted: new Date(),
            passwordResetTokenHash: reset.hash,
            passwordResetTokenExpiresAt: reset.expiresAt,
            pendingEmail: `pending-${randomUUID()}@example.test`,
            emailChangeTokenHash: emailChange.hash,
            emailChangeTokenExpiresAt: emailChange.expiresAt,
        });
        await target.save();
        const queueEmail = vi.spyOn(EmailsLoader, "queueEmail").mockResolvedValue(false);

        try {
            const response = await app.request("/api/people", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${adminSession.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    firstName: "Queue",
                    lastName: "Failure",
                    role: String(admin.get("role")),
                    email: String(target.get("email")),
                    real: true,
                }),
            });
            expect(response.status).toBe(500);

            const revived = await UserEntity.findByPk(target.get("id"));
            expect(revived?.get("deleted")).toBeNull();
            expect(revived?.get("disabled")).toBe(true);
            expect(revived?.get("activationTokenHash")).toBeNull();
            expect(revived?.get("passwordResetTokenHash")).toBeNull();
            expect(revived?.get("pendingEmail")).toBeNull();
            expect(revived?.get("emailChangeTokenHash")).toBeNull();
            expect(await sessionStillValid(oldSession.sid, String(target.get("id")))).toBe(false);
            const oldSessionRequest = await app.request(`/api/people/${target.get("id")}`, {
                headers: { Authorization: `Bearer ${oldSession.token}` },
            });
            expect(oldSessionRequest.status).toBe(401);
            expect(
                await EmailQueueEntity.count({
                    where: { userId: target.get("id"), template: EMAIL_TEMPLATES.WELCOME },
                })
            ).toBe(0);
        } finally {
            queueEmail.mockRestore();
            await EmailQueueEntity.destroy({ where: { userId: target.get("id") }, force: true });
            await cleanupSeededRows();
            await SessionEntity.destroy({ where: { userId: target.get("id") }, force: true });
            await adminSession.row.destroy({ force: true });
        }
    });

    test("a failed session revocation rolls the revival back and keeps the deleted account denied", async () => {
        const tenant = await activeTenant();
        const admin = await fixtureUser({ admin: true });
        const adminSession = await mintSessionToken(String(admin.get("id")), tenant, 120);
        const target = await fixtureUser({ email: `revival-failure-${randomUUID()}@example.test` });
        const oldSession = await mintSessionToken(String(target.get("id")), tenant, 120);
        target.set("deleted", new Date());
        await target.save();
        const updateSessions = vi
            .spyOn(SessionEntity, "update")
            .mockRejectedValueOnce(new Error("session revocation failed"));

        try {
            const response = await app.request("/api/people", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${adminSession.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    firstName: "Revival",
                    lastName: "Failure",
                    role: String(admin.get("role")),
                    email: String(target.get("email")),
                    real: true,
                }),
            });
            expect(response.status).toBe(500);

            const afterFailure = await UserEntity.findByPk(target.get("id"));
            expect(afterFailure?.get("deleted")).not.toBeNull();
            expect(afterFailure?.get("disabled")).toBe(false);
            expect(await sessionStillValid(oldSession.sid, String(target.get("id")))).toBe(true);
            const staleSessionRequest = await app.request(`/api/people/${target.get("id")}`, {
                headers: { Authorization: `Bearer ${oldSession.token}` },
            });
            expect(staleSessionRequest.status).toBe(302);
            expect(staleSessionRequest.headers.get("location")).toMatch(/^\/login(?:\?|$)/);
        } finally {
            updateSessions.mockRestore();
            await cleanupSeededRows();
            await SessionEntity.destroy({ where: { userId: target.get("id") }, force: true });
            await adminSession.row.destroy({ force: true });
        }
    });

    test("activation credentials are 32 random bytes stored only as a hash", async () => {
        const first = createActivationToken();
        const second = createActivationToken();

        expect(first.token).not.toBe(second.token);
        expect(first.token).toMatch(/^[0-9a-f]{64}$/);
        expect(Buffer.from(first.token, "hex")).toHaveLength(32);
        expect(first.hash).toBe(hashAccountToken(first.token));
        expect(first.hash).not.toBe(first.token);
        expect(first.expiresAt.getTime()).toBeGreaterThan(Date.now());
        expect(first.expiresAt.getTime()).toBeLessThan(Date.now() + ACTIVATION_TOKEN_TTL_MS + 5_000);
    });

    test("the raw activation token never reaches the user row or a public person", async () => {
        const user = await fixtureUser({ disabled: true });
        const token = await seedActivation(user);
        try {
            const row = await userRow(user);
            expect(row.get("token")).toBeNull();
            expect(row.get("activationTokenHash")).toBe(hashAccountToken(token));

            const page = await app.request(`/auth/activate/${token}`);
            expect(page.status).toBe(200);
            expect(await page.text()).toContain("activation-card");

            const api = await app.request(`/api/people/${user.get("id")}`, {
                headers: await getAuthenticatedHeaders(),
            });
            expect(api.status).toBe(200);
            expect(api.body).not.toContain(token);
            expect(api.body).not.toContain(hashAccountToken(token));
        } finally {
            await cleanupSeededRows();
        }
    });

    test("two concurrent activations of one link change the password exactly once", async () => {
        const user = await fixtureUser({ disabled: true });
        const token = await seedActivation(user);
        try {
            const responses = await Promise.all([
                postForm("/auth/activate", { token, password1: NEW_PASSWORD_A, password2: NEW_PASSWORD_A }),
                postForm("/auth/activate", { token, password1: NEW_PASSWORD_B, password2: NEW_PASSWORD_B }),
            ]);
            const successes = await Promise.all(responses.map(activationSucceeded));
            const winners = successes.filter(ok => ok);

            expect(winners).toHaveLength(1);
            const accepted = successes[0] ? NEW_PASSWORD_A : NEW_PASSWORD_B;
            const rejected = successes[0] ? NEW_PASSWORD_B : NEW_PASSWORD_A;

            const row = await userRow(user);
            expect(await compare(accepted, row.get("password"))).toBe(true);
            expect(await compare(rejected, row.get("password"))).toBe(false);
            expect(row.get("activationTokenHash")).toBeNull();
            expect(row.get("activationTokenExpiresAt")).toBeNull();
            expect(row.get("disabled")).toBe(false);
        } finally {
            await cleanupSeededRows();
        }
    });

    test("expired, absent-expiry, consumed and malformed activation links all fail", async () => {
        const expiryCases: Record<string, Date | null> = {
            expired: new Date(Date.now() - 60_000),
            "absent-expiry": null,
        };

        for (const expiresAt of Object.values(expiryCases)) {
            const user = await fixtureUser({ disabled: true });
            const token = await seedActivation(user, expiresAt);
            try {
                const page = await app.request(`/auth/activate/${token}`);
                expect(page.status).toBe(200);
                expect(await page.text()).toContain("activation-error-page");

                const submitted = await postForm("/auth/activate", {
                    token,
                    password1: NEW_PASSWORD_A,
                    password2: NEW_PASSWORD_A,
                });
                expect(await activationSucceeded(submitted)).toBe(false);
                const row = await userRow(user);
                expect(await compare(LEGACY_PASSWORD, row.get("password"))).toBe(true);
                expect(row.get("disabled")).toBe(true);
            } finally {
                await cleanupSeededRows();
            }
        }

        const consumedUser = await fixtureUser({ disabled: true });
        const consumedToken = await seedActivation(consumedUser);
        try {
            const first = await postForm("/auth/activate", {
                token: consumedToken,
                password1: NEW_PASSWORD_A,
                password2: NEW_PASSWORD_A,
            });
            expect(await activationSucceeded(first)).toBe(true);
            const replay = await postForm("/auth/activate", {
                token: consumedToken,
                password1: NEW_PASSWORD_B,
                password2: NEW_PASSWORD_B,
            });
            expect(await activationSucceeded(replay)).toBe(false);
            const row = await userRow(consumedUser);
            expect(await compare(NEW_PASSWORD_B, row.get("password"))).toBe(false);
        } finally {
            await cleanupSeededRows();
        }

        const deleted = await fixtureUser({ disabled: true, deleted: new Date() });
        const deletedToken = await seedActivation(deleted);
        try {
            const page = await app.request(`/auth/activate/${deletedToken}`);
            expect(await page.text()).toContain("activation-error-page");
        } finally {
            await cleanupSeededRows();
        }

        const malformedToken = randomBytes(8).toString("hex");
        const malformed = await postForm("/auth/activate", {
            token: malformedToken,
            password1: NEW_PASSWORD_A,
            password2: NEW_PASSWORD_A,
        });
        expect(await activationSucceeded(malformed)).toBe(false);
    });

    test("two concurrent password resets of one link change the password exactly once", async () => {
        const user = await fixtureUser();
        try {
            const recovery = await postForm("/login/password-recovery", { email: String(user.get("email")) });
            expect(recovery.status).toBe(302);

            const emailRow = await EmailQueueEntity.findOne({
                where: { userId: user.get("id"), template: EMAIL_TEMPLATES.PASSWORD_RESET },
                order: [["id", "DESC"]],
            });
            expect(emailRow).not.toBeNull();
            const resetLink = (emailRow!.get("data") as { resetLink: string }).resetLink;
            const token = new URL(resetLink, "http://localhost").searchParams.get("token")!;

            const responses = await Promise.all([
                postForm("/login/password-reset", {
                    token,
                    password1: NEW_PASSWORD_A,
                    password2: NEW_PASSWORD_A,
                }),
                postForm("/login/password-reset", {
                    token,
                    password1: NEW_PASSWORD_B,
                    password2: NEW_PASSWORD_B,
                }),
            ]);
            const successes = responses.map(resetSucceeded);
            expect(successes.filter(ok => ok)).toHaveLength(1);

            const accepted = successes[0] ? NEW_PASSWORD_A : NEW_PASSWORD_B;
            const rejected = successes[0] ? NEW_PASSWORD_B : NEW_PASSWORD_A;

            const row = await userRow(user);
            expect(await compare(accepted, row.get("password"))).toBe(true);
            expect(await compare(rejected, row.get("password"))).toBe(false);
            expect(row.get("passwordResetTokenHash")).toBeNull();
            expect(row.get("passwordResetTokenExpiresAt")).toBeNull();

            const replay = await postForm("/login/password-reset", {
                token,
                password1: NEW_PASSWORD_B,
                password2: NEW_PASSWORD_B,
            });
            expect(resetSucceeded(replay)).toBe(false);
            expect(await replay.text()).toContain(translate("Password reset link is invalid or expired"));
        } finally {
            await cleanupSeededRows();
            await EmailQueueEntity.destroy({ where: { userId: user!.get("id") }, force: true });
        }
    });

    test("expired, absent-expiry and malformed reset links never change a password", async () => {
        const user = await fixtureUser();
        const reset = createPasswordResetToken();
        const expiryCases = { expired: new Date(Date.now() - 60_000), "absent-expiry": null };

        for (const [name, expiresAt] of Object.entries(expiryCases)) {
            try {
                user.set("passwordResetTokenHash", reset.hash);
                user.set("passwordResetTokenExpiresAt", expiresAt);
                await user.save();

                const page = await app.request(`/login/password-reset?token=${reset.token}`);
                expect(page.status).toBe(400);
                expect(await page.text()).toContain(translate("Password reset link is invalid or expired"));

                const submitted = await postForm("/login/password-reset", {
                    token: reset.token,
                    password1: NEW_PASSWORD_A,
                    password2: NEW_PASSWORD_A,
                });
                expect(resetSucceeded(submitted)).toBe(false);
                const row = await userRow(user);
                expect(await compare(LEGACY_PASSWORD, row.get("password"))).toBe(true);
            } finally {
                await cleanupSeededRows();
            }
        }

        const malformed = await postForm("/login/password-reset", {
            token: "short",
            password1: NEW_PASSWORD_A,
            password2: NEW_PASSWORD_A,
        });
        expect(malformed.status).toBe(400);
    });

    test("recovery responses are identical for missing, disabled, system and eligible accounts", async () => {
        const eligible = await fixtureUser();
        const disabled = await fixtureUser({ disabled: true });
        const system = await fixtureUser({ system: true });
        const emails = [
            String(eligible.get("email")),
            String(disabled.get("email")),
            String(system.get("email")),
            `t06-missing-${randomUUID()}@example.com`,
        ];
        try {
            const responses = await Promise.all(
                emails.map(email => postForm("/login/password-recovery", { email }))
            );
            responses.forEach(res => {
                expect(res.status).toBe(302);
                expect(res.headers.get("location")).toBe("/login/password-recovery");
            });
            const flashes = responses.map(flashCookieOf);
            expect(new Set(flashes)).toEqual(new Set([flashes[0]]));

            const genericKey = "Password recovery link sent if the account exists";
            const generic = translate(genericKey);
            expect(generic).not.toBe(genericKey.toUpperCase());
            const page = await app.request("/login/password-recovery", { headers: { Cookie: flashes[0] } });
            expect(page.status).toBe(200);
            expect(await page.text()).toContain(generic);

            const queued = await EmailQueueEntity.findAll({
                where: {
                    userId: {
                        [Op.in]: [eligible.get("id"), disabled.get("id"), system.get("id")],
                    },
                    template: EMAIL_TEMPLATES.PASSWORD_RESET,
                },
            });
            expect(queued).toHaveLength(1);
            expect(String(queued[0].get("userId"))).toBe(String(eligible.get("id")));
            expect(queued[0].get("status")).toBe("pending");
            expect(queued[0].get("sentAt")).toBeNull();
        } finally {
            await cleanupSeededRows();
            await EmailQueueEntity.destroy({ where: { userId: eligible!.get("id") }, force: true });
        }
    });

    test("an administrator can resend a fresh activation link", async () => {
        const tenant = await activeTenant();
        const admin = await fixtureUser({ admin: true });
        const user = await fixtureUser({ disabled: true });
        const session = await mintSessionToken(String(admin.get("id")), tenant, 120);
        try {
            const resent = await app.request(`/api/people/${user.get("id")}/resend-activation`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session.token}` },
            });
            expect(resent.status).toBe(200);

            const emailRow = await EmailQueueEntity.findOne({
                where: { userId: user.get("id"), template: EMAIL_TEMPLATES.REGISTRATION },
                order: [["id", "DESC"]],
            });
            expect(emailRow).not.toBeNull();
            const verificationLink = (emailRow!.get("data") as { verificationLink: string }).verificationLink;
            const token = verificationLink.split("/").pop()!;

            const row = await userRow(user);
            expect(row.get("activationTokenHash")).toBe(hashAccountToken(token));
            expect(row.get("activationTokenExpiresAt").getTime()).toBeGreaterThan(Date.now());

            const activated = await postForm("/auth/activate", {
                token,
                password1: NEW_PASSWORD_A,
                password2: NEW_PASSWORD_A,
            });
            expect(await activationSucceeded(activated)).toBe(true);
        } finally {
            await cleanupSeededRows();
            await session.row.destroy({ force: true });
            await EmailQueueEntity.destroy({ where: { userId: user!.get("id") }, force: true });
        }
    });

    test("a tenant administrator cannot replace another tenant's activation token", async () => {
        const tenantA = await activeTenant();
        const admin = await fixtureUser({ admin: true });
        const tenantB = await TenantEntity.create({
            title: `T06 foreign ${randomUUID()}`,
            description: "temporary fixture",
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        seededRows.push(tenantB);
        const system = await UserEntity.findOne({ where: { system: true } });
        if (!system) throw new Error("System user not found");
        const roleB = await RoleEntity.create({
            title: "User",
            description: "temporary fixture",
            access: {},
            disabled: false,
            tenant: String(tenantB.get("id")),
            createdBy: String(system.get("id")),
            updatedBy: String(system.get("id")),
        });
        seededRows.push(roleB);
        const existingActivation = createActivationToken();
        const foreignUser = await UserEntity.create({
            email: `t06-foreign-${randomUUID()}@example.com`,
            password: await hash(LEGACY_PASSWORD, 10),
            firstName: "Foreign",
            lastName: "Subject",
            real: true,
            disabled: true,
            role: String(roleB.get("id")),
            tenant: String(tenantB.get("id")),
            activationTokenHash: existingActivation.hash,
            activationTokenExpiresAt: existingActivation.expiresAt,
        });
        seededRows.push(foreignUser);
        const session = await mintSessionToken(String(admin.get("id")), tenantA, 120);

        try {
            const response = await app.request(`/api/people/${foreignUser.get("id")}/resend-activation`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session.token}` },
            });

            expect(response.status).toBe(404);
            const stillPending = await userRow(foreignUser);
            expect(stillPending.get("activationTokenHash")).toBe(existingActivation.hash);
            expect(
                await EmailQueueEntity.findOne({
                    where: {
                        userId: foreignUser.get("id"),
                        template: EMAIL_TEMPLATES.REGISTRATION,
                    },
                })
            ).toBeNull();
        } finally {
            await cleanupSeededRows();
            await session.row.destroy({ force: true });
            await EmailQueueEntity.destroy({ where: { userId: foreignUser.get("id") }, force: true });
        }
    });

    test("new passwords are bounded before bcrypt and legacy passwords still verify", async () => {
        const asciiTooShort = "a".repeat(MIN_NEW_PASSWORD_CHARACTERS - 1);
        const asciiAtLimit = "a".repeat(MIN_NEW_PASSWORD_CHARACTERS);
        const multibyteTooLong = "\u00e9".repeat(Math.floor(MAX_PASSWORD_BYTES / 2) + 1);
        const multibyteAtLimit = "\u00e9".repeat(Math.floor(MAX_PASSWORD_BYTES / 2));

        expect(isAcceptableNewPassword(asciiAtLimit)).toBe(true);
        expect(isAcceptableNewPassword(asciiTooShort)).toBe(false);
        expect(isAcceptableNewPassword(multibyteAtLimit)).toBe(true);
        expect(isAcceptableNewPassword(multibyteTooLong)).toBe(false);
        expect(Buffer.byteLength(multibyteTooLong, "utf8")).toBeGreaterThan(MAX_PASSWORD_BYTES);

        const user = await fixtureUser({ disabled: true });
        const token = await seedActivation(user);
        try {
            const rejected = await postForm("/auth/activate", {
                token,
                password1: multibyteTooLong,
                password2: multibyteTooLong,
            });
            expect(await activationSucceeded(rejected)).toBe(false);
            const unchanged = await userRow(user);
            expect(await compare(LEGACY_PASSWORD, unchanged.get("password"))).toBe(true);

            const accepted = await postForm("/auth/activate", {
                token,
                password1: multibyteAtLimit,
                password2: multibyteAtLimit,
            });
            expect(await activationSucceeded(accepted)).toBe(true);
            const row = await userRow(user);
            expect(await compare(multibyteAtLimit, row.get("password"))).toBe(true);
        } finally {
            await cleanupSeededRows();
        }

        const tenant = await TenantEntity.findOne({ where: { disabled: false } });
        const role = await RoleEntity.findOne({
            where: { tenant: tenant!.get("id"), title: "User", disabled: false, deleted: null },
        });
        const email = `t06-policy-${randomUUID()}@example.com`;
        const registered = await postForm("/register", {
            email,
            password: asciiTooShort,
            tenant: String(tenant!.get("id")),
            firstName: "Token",
            lastName: "Subject",
        });
        expect(registered.status).not.toBe(302);
        const created = await UserEntity.findOne({ where: { email } });
        expect(created).toBeNull();
    });
});
