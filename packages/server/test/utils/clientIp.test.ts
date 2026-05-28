// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import { getClientIP } from "../../src/utils/clientIp";

const withEnv = (value: string | undefined, fn: () => void) => {
    const orig = process.env.TRUST_PROXY_HEADERS;
    if (value === undefined) {
        delete process.env.TRUST_PROXY_HEADERS;
    } else {
        process.env.TRUST_PROXY_HEADERS = value;
    }
    try {
        fn();
    } finally {
        if (orig === undefined) {
            delete process.env.TRUST_PROXY_HEADERS;
        } else {
            process.env.TRUST_PROXY_HEADERS = orig;
        }
    }
};

describe("getClientIP", () => {
    test("returns 'unknown' when no forwarding headers and TRUST_PROXY_HEADERS is not set", () => {
        withEnv(undefined, () => {
            const ctx = {
                req: {
                    header: (name: string) => {
                        if (name === "x-forwarded-for") return "1.2.3.4";
                        if (name === "x-real-ip") return "5.6.7.8";
                        if (name === "cf-connecting-ip") return "9.10.11.12";
                        return undefined;
                    },
                },
            } as any;

            expect(getClientIP(ctx)).toBe("unknown");
        });
    });

    test("returns x-forwarded-for first IP when TRUST_PROXY_HEADERS=1", () => {
        withEnv("1", () => {
            const ctx = {
                req: {
                    header: (name: string) => {
                        if (name === "x-forwarded-for") return "10.0.0.1, 10.0.0.2, 192.168.1.1";
                        if (name === "x-real-ip") return "5.6.7.8";
                        if (name === "cf-connecting-ip") return "9.10.11.12";
                        return undefined;
                    },
                },
            } as any;

            expect(getClientIP(ctx)).toBe("10.0.0.1");
        });
    });

    test("trims whitespace from x-forwarded-for", () => {
        withEnv("1", () => {
            const ctx = {
                req: {
                    header: (name: string) => {
                        if (name === "x-forwarded-for") return "  10.0.0.1  , 10.0.0.2";
                        return undefined;
                    },
                },
            } as any;

            expect(getClientIP(ctx)).toBe("10.0.0.1");
        });
    });

    test("falls back to x-real-ip when x-forwarded-for is absent", () => {
        withEnv("1", () => {
            const ctx = {
                req: {
                    header: (name: string) => {
                        if (name === "x-forwarded-for") return undefined;
                        if (name === "x-real-ip") return "5.6.7.8";
                        if (name === "cf-connecting-ip") return "9.10.11.12";
                        return undefined;
                    },
                },
            } as any;

            expect(getClientIP(ctx)).toBe("5.6.7.8");
        });
    });

    test("falls back to cf-connecting-ip when both forwarded headers are absent", () => {
        withEnv("1", () => {
            const ctx = {
                req: {
                    header: (name: string) => {
                        if (name === "x-forwarded-for") return undefined;
                        if (name === "x-real-ip") return undefined;
                        if (name === "cf-connecting-ip") return "9.10.11.12";
                        return undefined;
                    },
                },
            } as any;

            expect(getClientIP(ctx)).toBe("9.10.11.12");
        });
    });

    test("prefers x-forwarded-for over x-real-ip", () => {
        withEnv("1", () => {
            const ctx = {
                req: {
                    header: (name: string) => {
                        if (name === "x-forwarded-for") return "1.2.3.4";
                        if (name === "x-real-ip") return "5.6.7.8";
                        return undefined;
                    },
                },
            } as any;

            expect(getClientIP(ctx)).toBe("1.2.3.4");
        });
    });
});
