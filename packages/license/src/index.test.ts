// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import {
    initializeLicense,
    getLicense,
    __setLicenseForTests,
    __resetLicenseForTests,
    license as exportedLicense,
} from "./index";
import fs from "fs";
import crypto from "crypto";
import https from "https";
import { ILicense, LICENSETYPE } from "@stacks/types";

// Mock dependencies
vi.mock("fs");
vi.mock("crypto", async () => {
    const actual = await vi.importActual<typeof import("crypto")>("crypto");
    const mock = {
        ...actual,
        publicDecrypt: vi.fn(),
        createDecipheriv: vi.fn(),
        createVerify: vi.fn(),
        createHash: vi.fn(),
        constants: actual.constants,
    };
    return {
        ...mock,
        default: mock,
    };
});
vi.mock("https", () => {
    const mock = { request: vi.fn() };
    return { ...mock, default: mock };
});
// Provide a real-ish join so module-level constants (LICENSE_PATH, PUBLIC_KEY_PATH)
// are usable strings at import time, not undefined.
vi.mock("path", () => {
    const join = vi.fn((...args: string[]) => args.filter(Boolean).join("/"));
    return { join, default: { join } };
});

/**
 * Helper to build a mock https.request that resolves with the given body and status.
 */
const mockHttpsResponse = (body: string, statusCode = 200) => {
    (https.request as Mock).mockImplementation((_options: any, cb: any) => {
        const dataHandlers: Array<(chunk: string) => void> = [];
        const endHandlers: Array<() => void> = [];
        const res = {
            statusCode,
            on: (event: string, handler: any) => {
                if (event === "data") dataHandlers.push(handler);
                if (event === "end") endHandlers.push(handler);
            },
        };
        // Defer so callers attach their own listeners first.
        setImmediate(() => {
            cb(res);
            dataHandlers.forEach(h => h(body));
            endHandlers.forEach(h => h());
        });
        return {
            on: vi.fn(),
            end: vi.fn(),
            destroy: vi.fn(),
        };
    });
};

/**
 * Helper to make https.request emit an `error` event.
 */
const mockHttpsError = (error: Error) => {
    (https.request as Mock).mockImplementation(() => {
        const errorHandlers: Array<(err: Error) => void> = [];
        setImmediate(() => errorHandlers.forEach(h => h(error)));
        return {
            on: (event: string, handler: any) => {
                if (event === "error") errorHandlers.push(handler);
            },
            end: vi.fn(),
            destroy: vi.fn(),
        };
    });
};

describe("License Utility", () => {
    const mockLicenseData: ILicense = {
        type: LICENSETYPE.LOCAL,
        tenants: [
            {
                id: "tenant-1",
                name: "Test Tenant",
                expiry: "2099-12-31",
                seats: 10,
                features: { feature1: true },
                admins: [
                    {
                        email: "admin@test.com",
                        firstName: "Admin",
                        lastName: "User",
                    },
                ],
            },
        ],
    };

    /**
     * Wires up a v1.0 (legacy) license file decryption so we can short-circuit
     * the local-decrypt step and reach the type-normalization branch.
     */
    const mockV1License = (license: unknown): void => {
        (fs.existsSync as Mock).mockReturnValue(true);
        (fs.readFileSync as Mock).mockImplementation((p: string) => {
            if (p.includes("public.pem")) return "public-key";
            if (p.includes("license"))
                return JSON.stringify({
                    key: "encrypted-key-hex",
                    iv: "iv-hex",
                    data: "encrypted-data-hex",
                });
            return "";
        });

        (crypto.publicDecrypt as Mock).mockReturnValue(Buffer.from("decrypted-aes-key"));
        (crypto.createDecipheriv as Mock).mockReturnValueOnce({
            update: vi.fn().mockReturnValue(""),
            final: vi.fn().mockReturnValue(JSON.stringify(license)),
            setAAD: vi.fn(),
            setAuthTag: vi.fn(),
        });
    };

    /**
     * Mocks the v3.0 GCM decipher + signature verify so that
     * verifyAndDecryptRSAPayload returns the given payload (or fails if signatureValid=false).
     */
    const mockServerCrypto = (payload: unknown, signatureValid = true): void => {
        (crypto.createDecipheriv as Mock).mockReturnValueOnce({
            update: vi.fn().mockReturnValue(JSON.stringify(payload)),
            final: vi.fn().mockReturnValue(""),
            setAAD: vi.fn(),
            setAuthTag: vi.fn(),
        });
        (crypto.createVerify as Mock).mockReturnValueOnce({
            update: vi.fn(),
            verify: vi.fn().mockReturnValue(signatureValid),
        });
        (crypto.createHash as Mock).mockReturnValue({
            update: vi.fn().mockReturnThis(),
            digest: vi.fn().mockReturnValue("license-hash"),
        });
    };

    /**
     * Builds a base64-encoded blob that satisfies verifyAndDecryptRSAPayload's JSON.parse step.
     * Actual cryptographic values are stubbed out by mockServerCrypto.
     */
    const fakeServerBlob = (): string =>
        Buffer.from(
            JSON.stringify({
                encryptedKey: Buffer.from("k").toString("base64"),
                data: "00",
                iv: "00",
                authTag: "00",
                signature: "sig",
            })
        ).toString("base64");

    const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation((code?: number | string | null | undefined) => {
            throw new Error(`Process.exit called with code ${code}`);
        }) as unknown as Mock;

    const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    beforeEach(() => {
        vi.clearAllMocks();
        __resetLicenseForTests();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("__setLicenseForTests", () => {
        it("should set the license correctly", () => {
            __setLicenseForTests(mockLicenseData);
            const license = getLicense();
            expect(license).toEqual(mockLicenseData);
            expect(exportedLicense).toEqual(mockLicenseData);
        });
    });

    describe("getLicense", () => {
        it("should exit if license is not initialized", () => {
            expect(() => getLicense()).toThrow("Process.exit called with code 1");
            expect(mockConsoleError).toHaveBeenCalledWith("❌ License not initialized, exiting...");
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe("initializeLicense", () => {
        it("should exit if license file not found", async () => {
            (fs.existsSync as Mock).mockReturnValue(false);

            await expect(initializeLicense()).rejects.toThrow("Process.exit called with code 1");
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining("❌ No license file found, exiting at path:")
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("should exit if license file is empty", async () => {
            (fs.existsSync as Mock).mockReturnValue(true);
            (fs.readFileSync as Mock).mockReturnValue("   "); // Empty/whitespace

            await expect(initializeLicense()).rejects.toThrow("Process.exit called with code 1");
            expect(mockConsoleWarn).toHaveBeenCalledWith(
                expect.stringContaining("⚠️  License file is empty, exiting at path:")
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("should decrypt and load valid legacy license (v1.0)", async () => {
            mockV1License(mockLicenseData);

            await initializeLicense();

            const license = getLicense();
            expect(license).toEqual(mockLicenseData);
            expect(mockConsoleLog).toHaveBeenCalledWith("🔍 Detected legacy license format (v1.0)");
            expect(mockConsoleLog).toHaveBeenCalledWith("✅ License successfully loaded and validated");
            expect(https.request).not.toHaveBeenCalled();
        });

        it("should default to LOCAL when type is missing and skip server validation", async () => {
            const { type, ...licenseWithoutType } = mockLicenseData;
            mockV1License(licenseWithoutType);

            await initializeLicense();

            const license = getLicense();
            expect(license.type).toBe(LICENSETYPE.LOCAL);
            expect(https.request).not.toHaveBeenCalled();
        });

        it("should force SERVER when any tenant is missing expiry", async () => {
            const licenseMissingExpiry = {
                ...mockLicenseData,
                type: undefined,
                tenants: mockLicenseData.tenants.map(({ expiry: _expiry, ...rest }) => rest),
            };
            mockV1License(licenseMissingExpiry);
            mockServerCrypto({ valid: true, expiry: "2099-12-31T00:00:00.000Z" });
            mockHttpsResponse(fakeServerBlob());

            await initializeLicense();

            const license = getLicense();
            expect(license.type).toBe(LICENSETYPE.SERVER);
            expect(license.tenants[0].expiry).toBe("2099-12-31T00:00:00.000Z");
            expect(https.request).toHaveBeenCalled();
        });

        it("should refresh tenant expiry from server for SERVER licenses", async () => {
            const serverLicense: ILicense = { ...mockLicenseData, type: LICENSETYPE.SERVER };
            mockV1License(serverLicense);
            mockServerCrypto({ valid: true, expiry: "2100-06-30T12:00:00.000Z" });
            mockHttpsResponse(fakeServerBlob());

            await initializeLicense();

            const license = getLicense();
            expect(license.type).toBe(LICENSETYPE.SERVER);
            license.tenants.forEach(t => {
                expect(t.expiry).toBe("2100-06-30T12:00:00.000Z");
            });
            expect(mockConsoleLog).toHaveBeenCalledWith("🌐 Expiry refreshed from server: 2100-06-30T12:00:00.000Z");
        });

        it("should exit when server reports valid: false", async () => {
            const serverLicense: ILicense = { ...mockLicenseData, type: LICENSETYPE.SERVER };
            mockV1License(serverLicense);
            mockServerCrypto({ valid: false, expiry: "ignored" });
            mockHttpsResponse(fakeServerBlob());

            await expect(initializeLicense()).rejects.toThrow("Process.exit called with code 1");
            expect(mockConsoleError).toHaveBeenCalledWith("❌ License server reported license as invalid");
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("should exit when server returns non-2xx status", async () => {
            const serverLicense: ILicense = { ...mockLicenseData, type: LICENSETYPE.SERVER };
            mockV1License(serverLicense);
            (crypto.createHash as Mock).mockReturnValue({
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue("license-hash"),
            });
            mockHttpsResponse("", 500);

            await expect(initializeLicense()).rejects.toThrow("Process.exit called with code 1");
            expect(mockConsoleError).toHaveBeenCalledWith(
                "❌ License server unreachable:",
                "License server returned status 500"
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("should exit when network request errors", async () => {
            const serverLicense: ILicense = { ...mockLicenseData, type: LICENSETYPE.SERVER };
            mockV1License(serverLicense);
            (crypto.createHash as Mock).mockReturnValue({
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue("license-hash"),
            });
            mockHttpsError(new Error("network down"));

            await expect(initializeLicense()).rejects.toThrow("Process.exit called with code 1");
            expect(mockConsoleError).toHaveBeenCalledWith("❌ License server unreachable:", "network down");
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("should exit when server response signature is invalid", async () => {
            const serverLicense: ILicense = { ...mockLicenseData, type: LICENSETYPE.SERVER };
            mockV1License(serverLicense);
            mockServerCrypto({ valid: true, expiry: "2099-12-31T00:00:00.000Z" }, /*signatureValid*/ false);
            mockHttpsResponse(fakeServerBlob());

            await expect(initializeLicense()).rejects.toThrow("Process.exit called with code 1");
            expect(mockConsoleError).toHaveBeenCalledWith(
                "❌ Failed to decrypt server license response:",
                expect.stringContaining("Signature verification failed")
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });
});
