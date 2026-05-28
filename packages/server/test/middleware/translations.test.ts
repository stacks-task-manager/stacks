// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { translations } from "../../src/middleware/translations";
import * as LocalesModule from "../../src/i18n/locales";

describe("translations middleware", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    test("sets locale from Accept-Language header (mocked pickLocale)", async () => {
        const pickLocaleSpy = vi.spyOn(LocalesModule, "pickLocale").mockReturnValue("de");
        const getMergedSpy = vi.spyOn(LocalesModule, "getMergedTranslationsForLocale").mockReturnValue({});

        const app = new Hono();
        let capturedLocale: string | undefined;
        app.use("*", translations);
        app.get("/test", c => {
            capturedLocale = c.get("locale") as string | undefined;
            return c.text("ok");
        });

        const res = await app.request("/test", {
            headers: { "Accept-Language": "de" },
        });
        expect(res.status).toBe(200);
        expect(capturedLocale).toBe("de");
        expect(pickLocaleSpy).toHaveBeenCalledWith("de");
        expect(getMergedSpy).toHaveBeenCalledWith("de");
    });

    test("defaults to 'en' when Accept-Language is missing", async () => {
        const pickLocaleSpy = vi.spyOn(LocalesModule, "pickLocale").mockReturnValue("en");
        const getMergedSpy = vi.spyOn(LocalesModule, "getMergedTranslationsForLocale").mockReturnValue({});

        const app = new Hono();
        let capturedLocale: string | undefined;
        app.use("*", translations);
        app.get("/test", c => {
            capturedLocale = c.get("locale") as string | undefined;
            return c.text("ok");
        });

        const res = await app.request("/test");
        expect(res.status).toBe(200);
        expect(capturedLocale).toBe("en");
        expect(pickLocaleSpy).toHaveBeenCalledWith(undefined);
    });

    test("defaults to 'en' when Accept-Language is empty", async () => {
        const pickLocaleSpy = vi.spyOn(LocalesModule, "pickLocale").mockReturnValue("en");
        const getMergedSpy = vi.spyOn(LocalesModule, "getMergedTranslationsForLocale").mockReturnValue({});

        const app = new Hono();
        let capturedLocale: string | undefined;
        app.use("*", translations);
        app.get("/test", c => {
            capturedLocale = c.get("locale") as string | undefined;
            return c.text("ok");
        });

        const res = await app.request("/test", {
            headers: { "Accept-Language": "" },
        });
        expect(res.status).toBe(200);
        expect(capturedLocale).toBe("en");
        expect(pickLocaleSpy).toHaveBeenCalledWith("");
    });

    test("skips static paths without setting locale", async () => {
        const app = new Hono();
        let capturedLocale: string | undefined;
        app.use("*", translations);
        app.get("/static/file.js", c => {
            capturedLocale = c.get("locale") as string | undefined;
            return c.text("static");
        });

        const res = await app.request("/static/file.js", {
            headers: { "Accept-Language": "de" },
        });
        expect(res.status).toBe(200);
        // Static paths bypass the translations middleware
        expect(capturedLocale).toBeUndefined();
    });

    test("skips .well-known paths", async () => {
        const app = new Hono();
        let capturedLocale: string | undefined;
        app.use("*", translations);
        app.get("/.well-known/assetlinks.json", c => {
            capturedLocale = c.get("locale") as string | undefined;
            return c.text("well-known");
        });

        const res = await app.request("/.well-known/assetlinks.json", {
            headers: { "Accept-Language": "fr" },
        });
        expect(res.status).toBe(200);
        expect(capturedLocale).toBeUndefined();
    });

    test("passes through to next handler", async () => {
        const pickLocaleSpy = vi.spyOn(LocalesModule, "pickLocale").mockReturnValue("en");
        const getMergedSpy = vi.spyOn(LocalesModule, "getMergedTranslationsForLocale").mockReturnValue({});

        const app = new Hono();
        let nextReached = false;
        app.use("*", translations);
        app.get("/test", c => {
            nextReached = true;
            return c.text("next-reached");
        });

        const res = await app.request("/test");
        expect(res.status).toBe(200);
        expect(nextReached).toBe(true);
        expect(await res.text()).toBe("next-reached");
        expect(pickLocaleSpy).toHaveBeenCalled();
    });
});
