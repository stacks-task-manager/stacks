import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { redactLogMetadata, redactLogPath, redactLogText } from "../logRedaction";
import { Logger, LogLevel, loggingMiddleware } from "../logger";

describe("security log redaction", () => {
    it("hides account tokens in route paths and removes query values", () => {
        expect(redactLogPath("/auth/activate/secret-sentinel?next=/private&token=query-sentinel")).toBe(
            "/auth/activate/[redacted]"
        );
        expect(redactLogPath("/auth/password-reset/secret-sentinel")).toBe("/auth/password-reset/[redacted]");
        expect(redactLogPath("/auth/email-change/secret-sentinel")).toBe("/auth/email-change/[redacted]");
    });

    it("hides nested credential values but keeps incident identifiers", () => {
        expect(
            redactLogMetadata({
                requestId: "incident-1",
                token: "secret-sentinel",
                password: "password-sentinel",
                cookie: "cookie-sentinel",
                refreshToken: "refresh-token-sentinel",
                nested: { authorization: "Bearer another-secret", userId: "person-1" },
                path: "/auth/activate/path-secret",
            })
        ).toEqual({
            requestId: "incident-1",
            token: "[redacted]",
            password: "[redacted]",
            cookie: "[redacted]",
            refreshToken: "[redacted]",
            nested: { authorization: "[redacted]", userId: "person-1" },
            path: "/auth/activate/[redacted]",
        });
    });

    it("redacts credentials in error text, URLs and bearer tokens", () => {
        const text =
            "provider access_token=error-secret https://example.test/callback?code=code-secret Bearer bearer-secret";
        const redacted = redactLogText(text);
        expect(redacted).not.toContain("error-secret");
        expect(redacted).not.toContain("code-secret");
        expect(redacted).not.toContain("bearer-secret");
    });

    it("redacts credential metadata at the actual logger output", () => {
        const previousLevel = Logger.getLevel();
        const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
        try {
            Logger.setLevel(LogLevel.INFO);
            Logger.info("Activation checked", { token: "secret-sentinel", userId: "person-1" });
            Logger.error("Provider failed", new Error("access_token=error-secret-sentinel"));
            const printed = output.mock.calls.map(call => String(call[0])).join("\n");
            expect(printed).not.toContain("secret-sentinel");
            expect(printed).not.toContain("error-secret-sentinel");
            expect(printed).toContain("person-1");
        } finally {
            Logger.setLevel(previousLevel);
            output.mockRestore();
        }
    });

    it("does not log OAuth callback query credentials in HTTP request paths", async () => {
        const app = new Hono();
        app.use("*", loggingMiddleware());
        app.get("/api/google/callback", c => c.text("ok"));
        const previousLevel = Logger.getLevel();
        const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
        try {
            Logger.setLevel(LogLevel.INFO);
            await app.request("/api/google/callback?code=oauth-code-sentinel&state=oauth-state-sentinel");
            const printed = output.mock.calls.map(call => String(call[0])).join("\n");
            expect(printed).not.toContain("oauth-code-sentinel");
            expect(printed).not.toContain("oauth-state-sentinel");
            expect(printed).toContain("/api/google/callback");
        } finally {
            Logger.setLevel(previousLevel);
            output.mockRestore();
        }
    });
});
