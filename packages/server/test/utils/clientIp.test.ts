// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import { getClientIP } from "../../src/utils/clientIp";

const originalTrustProxy = process.env.TRUST_PROXY_HEADERS;

afterEach(() => {
    if (originalTrustProxy === undefined) delete process.env.TRUST_PROXY_HEADERS;
    else process.env.TRUST_PROXY_HEADERS = originalTrustProxy;
});

const context = (remoteAddress?: string, headers: Record<string, string> = {}) => ({
    env: remoteAddress === undefined ? {} : { incoming: { socket: { remoteAddress } } },
    req: { header: (name: string) => headers[name.toLowerCase()] },
});

describe("getClientIP", () => {
    it("uses the Node peer address and ignores spoofed forwarding headers by default", () => {
        delete process.env.TRUST_PROXY_HEADERS;
        expect(
            getClientIP(
                context("192.0.2.10", {
                    "x-forwarded-for": "203.0.113.99",
                    "x-real-ip": "203.0.113.98",
                    "cf-connecting-ip": "203.0.113.97",
                }) as any
            )
        ).toBe("192.0.2.10");
    });

    it("uses a single valid forwarded address only when proxy headers are explicitly enabled", () => {
        process.env.TRUST_PROXY_HEADERS = "1";
        expect(getClientIP(context("192.0.2.10", { "x-forwarded-for": "203.0.113.99" }) as any)).toBe(
            "203.0.113.99"
        );
    });

    it("does not trust an arbitrary first address in a forwarded chain", () => {
        process.env.TRUST_PROXY_HEADERS = "1";
        expect(
            getClientIP(context("192.0.2.10", { "x-forwarded-for": "203.0.113.99, 192.0.2.20" }) as any)
        ).toBe("192.0.2.10");
    });

    it("ignores malformed forwarded addresses and falls back to the Node peer", () => {
        process.env.TRUST_PROXY_HEADERS = "1";
        expect(getClientIP(context("192.0.2.10", { "x-forwarded-for": "not-an-ip" }) as any)).toBe(
            "192.0.2.10"
        );
    });

    it("returns unknown only when neither trusted forwarding nor a peer address is available", () => {
        process.env.TRUST_PROXY_HEADERS = "0";
        expect(getClientIP(context(undefined, { "x-forwarded-for": "203.0.113.99" }) as any)).toBe("unknown");
    });
});
