// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import crypto from "crypto";
import https from "https";
import { ILicense, LICENSETYPE } from "@stacks/types";

const BEGIN_LICENSE_MARKER = "---BEGIN STACKS LICENSE---" as const;
const END_LICENSE_MARKER = "---END STACKS LICENSE---" as const;
const PUBLIC_KEY_FILE = "public.pem" as const;
const LICENSE_FILE = "license.key" as const;
const PUBLIC_KEY_PATH = join(process.cwd(), PUBLIC_KEY_FILE);
const LICENSE_PATH = join(process.cwd(), LICENSE_FILE);

// TODO: replace with final URL once backend endpoint is ready
const LICENSE_VALIDATION_URL = "https://api.getstacksapp.com/license/validate" as const;

// Singleton license cache
let cachedLicense: ILicense | null = null;
let isLicenseInitialized = false;

/**
 * Utility function to clean license content by removing markers and whitespace
 */
const cleanLicenseContent = (encodedLicense: string): string => {
    return encodedLicense
        .replace(new RegExp(BEGIN_LICENSE_MARKER, "g"), "")
        .replace(new RegExp(END_LICENSE_MARKER, "g"), "")
        .replace(/\s/g, "");
};

/**
 * Utility function to load the public key
 */
const loadPublicKey = (): string => {
    if (!existsSync(PUBLIC_KEY_PATH)) {
        throw new Error("Public key file not found");
    }
    return readFileSync(PUBLIC_KEY_PATH, "utf8");
};

/**
 * Utility function to format error messages consistently
 */
const formatError = (error: unknown): string => {
    return error instanceof Error ? error.message : String(error);
};

/**
 * Generic v3.0 hybrid RSA+AES decrypt + signature verify.
 * Accepts any encoded payload produced by the v3.0 license signing scheme
 * (used both for the local license file and the server validation response).
 */
const verifyAndDecryptRSAPayload = <T>(encodedBlob: string): T => {
    const cleanBlob = cleanLicenseContent(encodedBlob);
    const payloadPackage = JSON.parse(Buffer.from(cleanBlob, "base64").toString("utf8"));
    const publicKey = loadPublicKey();

    const encryptedAESKey = Buffer.from(payloadPackage.encryptedKey, "base64");
    const aesKey = crypto.publicDecrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        encryptedAESKey
    );

    const iv = Buffer.from(payloadPackage.iv, "hex");
    const authTag = Buffer.from(payloadPackage.authTag, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
    decipher.setAAD(Buffer.from("stacks-license-v3", "utf8"));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payloadPackage.data, "hex", "utf8");
    decrypted += decipher.final("utf8");

    const verify = crypto.createVerify("SHA256");
    verify.update(Buffer.from(decrypted, "utf8"));
    const isValid = verify.verify(publicKey, payloadPackage.signature, "base64");

    if (!isValid) {
        throw new Error("Signature verification failed - payload may be tampered with");
    }

    return JSON.parse(decrypted) as T;
};

/**
 * Verifies and decrypts a hybrid RSA+AES license (v3.0 format)
 */
const verifyAndDecryptRSALicense = (encodedLicense: string): ILicense => {
    try {
        const licenseData = verifyAndDecryptRSAPayload<ILicense>(encodedLicense);

        if (!licenseData.tenants || !Array.isArray(licenseData.tenants)) {
            throw new Error("Invalid license structure: missing or invalid tenants");
        }

        return licenseData;
    } catch (error) {
        throw new Error(`Failed to verify RSA license: ${formatError(error)}`);
    }
};

/**
 * Verifies and decrypts a signed license (v2.0 format) - Legacy AES+RSA
 * This function always throws an error as v2.0 format is deprecated
 */
const verifyAndDecryptSignedLicense = (encodedLicense: string): never => {
    // This is legacy format - should not be used for new licenses
    throw new Error("Legacy AES+RSA format detected - please regenerate license with current format");
};

/**
 * Decrypts legacy license format (v1.0 - hybrid RSA+AES)
 */
const decryptLegacyLicense = (license: string): ILicense => {
    try {
        const publicKey = loadPublicKey();
        let decryptedLicenseString: string;

        try {
            // Try hybrid encryption format first
            const encryptedObj = JSON.parse(license);

            // Decrypt AES key with RSA
            const encryptedKeyBuffer = Buffer.from(encryptedObj.key, "hex");
            const aesKey = crypto.publicDecrypt(
                {
                    key: publicKey.toString(),
                },
                encryptedKeyBuffer
            );

            // Decrypt data with AES
            const iv = Buffer.from(encryptedObj.iv, "hex");
            const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
            let decryptedData = decipher.update(encryptedObj.data, "hex", "utf8");
            decryptedData += decipher.final("utf8");

            decryptedLicenseString = decryptedData;
        } catch (hybridError) {
            // Fallback to old RSA-only format
            try {
                const buffer = Buffer.from(license, "hex");
                const decrypted = crypto.publicDecrypt(
                    {
                        key: publicKey.toString(),
                    },
                    buffer
                );
                decryptedLicenseString = decrypted.toString("utf8");
            } catch (rsaError) {
                const hybridMsg = formatError(hybridError);
                const rsaMsg = formatError(rsaError);
                throw new Error(
                    `Failed to decrypt with both hybrid and RSA methods: ${hybridMsg}, ${rsaMsg}`
                );
            }
        }

        return JSON.parse(decryptedLicenseString);
    } catch (error) {
        throw new Error(`Failed to decrypt legacy license: ${formatError(error)}`);
    }
};

/**
 * Normalizes the license `type` field according to backward-compat rules:
 *   1. If any tenant is missing `expiry` → force SERVER (must be validated online).
 *   2. Else if `type` is missing → default to LOCAL.
 *   3. Else use the `type` provided by the license.
 */
const normalizeLicenseType = (license: ILicense): ILicense => {
    const anyMissingExpiry = license.tenants.some(t => !t.expiry);

    if (anyMissingExpiry) {
        return { ...license, type: LICENSETYPE.SERVER };
    }

    if (!license.type) {
        return { ...license, type: LICENSETYPE.LOCAL };
    }

    return license;
};

/**
 * Fetches the current expiry for a `server`-type license from the validation
 * endpoint. The server replies with a v3.0-encrypted blob containing
 * `{ valid, expiry }` signed/encrypted with the same key pair as local licenses.
 *
 * Any failure (network, non-2xx, decrypt/signature failure, `valid !== true`,
 * or missing `expiry`) terminates the process - `server` licenses are not
 * allowed to run offline.
 */
const fetchServerExpiry = async (licenseData: ILicense): Promise<string> => {
    let body: string;

    try {
        const hash = crypto.createHash("sha256").update(JSON.stringify(licenseData)).digest("hex");
        const url = new URL(LICENSE_VALIDATION_URL);

        body = await new Promise<string>((resolve, reject) => {
            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: `${url.pathname}?hash=${hash}`,
                method: "GET",
                timeout: 5000,
                headers: {
                    "Cache-Control": "no-cache",
                    "User-Agent": "Stacks-Server/3.0",
                },
            };

            const req = https.request(options, res => {
                let data = "";
                res.on("data", chunk => {
                    data += chunk;
                });
                res.on("end", () => {
                    if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                        reject(new Error(`License server returned status ${res.statusCode}`));
                        return;
                    }
                    resolve(data);
                });
            });

            req.on("error", error => {
                reject(error);
            });

            req.on("timeout", () => {
                req.destroy();
                reject(new Error("Request timeout"));
            });

            req.end();
        });
    } catch (error) {
        console.error("❌ License server unreachable:", formatError(error));
        process.exit(1);
    }

    let payload: { valid: boolean; expiry: string };
    try {
        payload = verifyAndDecryptRSAPayload<{ valid: boolean; expiry: string }>(body.trim());
    } catch (error) {
        console.error("❌ Failed to decrypt server license response:", formatError(error));
        process.exit(1);
    }

    if (payload.valid !== true) {
        console.error("❌ License server reported license as invalid");
        process.exit(1);
    }

    if (!payload.expiry || typeof payload.expiry !== "string") {
        console.error("❌ License server response missing expiry");
        process.exit(1);
    }

    return payload.expiry;
};

/**
 * Internal function to read and decrypt the license
 */
const readAndDecryptLicense = async (): Promise<ILicense> => {
    try {
        if (!existsSync(LICENSE_PATH)) {
            console.log(`❌ No license file found, exiting at path: ${LICENSE_PATH}`);
            process.exit(1);
        }

        const licenseContent = readFileSync(LICENSE_PATH, "utf8").trim();

        if (!licenseContent) {
            console.warn(`⚠️  License file is empty, exiting at path: ${LICENSE_PATH}`);
            process.exit(1);
        }

        let decryptedLicense: ILicense;

        // Try to detect license format and decrypt accordingly
        try {
            // Check if it's a signed license (v3.0 or v2.0 format)
            if (licenseContent.includes(BEGIN_LICENSE_MARKER) || licenseContent.match(/^[A-Za-z0-9+/]+=*$/)) {
                // Try v3.0 RSA format first
                try {
                    console.log("🔍 Attempting RSA license format (v3.0)");
                    decryptedLicense = verifyAndDecryptRSALicense(licenseContent);
                    console.log("🔍 RSA license format (v3.0) successfully decrypted", JSON.stringify(decryptedLicense, null, 2));
                } catch (rsaError) {
                    // Fallback to v2.0 AES format
                    console.log("🔍 Falling back to signed license format (v2.0)");
                    decryptedLicense = verifyAndDecryptSignedLicense(licenseContent);
                }
            } else {
                console.log("🔍 Detected legacy license format (v1.0)");
                decryptedLicense = decryptLegacyLicense(licenseContent);
            }
        } catch (decryptError) {
            console.error("❌ License decryption failed:", formatError(decryptError));
            process.exit(1);
        }

        // Validate license structure
        if (!decryptedLicense || !decryptedLicense.tenants || !Array.isArray(decryptedLicense.tenants)) {
            console.error("❌ Invalid license structure");
            process.exit(1);
        }

        // Hash is computed against the license as parsed from disk (pre-normalize),
        // so the server can identify it deterministically.
        const preNormalized = decryptedLicense;
        decryptedLicense = normalizeLicenseType(decryptedLicense);

        if (decryptedLicense.type === LICENSETYPE.SERVER) {
            console.log("🌐 Validating license with remote server...");
            const serverExpiry = await fetchServerExpiry(preNormalized);
            decryptedLicense = {
                ...decryptedLicense,
                tenants: decryptedLicense.tenants.map(tenant => ({
                    ...tenant,
                    expiry: serverExpiry,
                })),
            };
            console.log(`🌐 Expiry refreshed from server: ${serverExpiry}`);
        }

        console.log("✅ License successfully loaded and validated");
        return decryptedLicense;
    } catch (error) {
        console.error("❌ Unexpected error reading license:", formatError(error));
        process.exit(1);
    }
};

/**
 * Initialize the license singleton - should be called once at application startup
 */
export const initializeLicense = async (): Promise<void> => {
    if (isLicenseInitialized) {
        return;
    }

    cachedLicense = await readAndDecryptLicense();
    isLicenseInitialized = true;
    console.log(
        `\n🪪 License initialized (type: ${cachedLicense.type}, ${cachedLicense.tenants.length} tenants):\n----------------------`
    );
    cachedLicense.tenants.forEach((tenant, index) => {
        console.log(`Tenant: ${tenant.name}`);
        console.log(`  Expiration: ${tenant.expiry}`);
        console.log(`  Seats: ${tenant.seats}`);
        console.log(`  Admins: ${tenant.admins.length}`);

        for (const admin of tenant.admins) {
            console.log(`    - ${admin.firstName} ${admin.lastName} (${admin.email})`);
        }

        if (index < cachedLicense!.tenants.length - 1) {
            console.log("\n");
        }
    });
    console.log("----------------------\n");
};

/**
 * Get the cached license data (synchronous)
 * Must call initializeLicense() first during application startup
 */
export const getLicense = (): ILicense => {
    if (!isLicenseInitialized) {
        console.error("❌ License not initialized, exiting...");
        process.exit(1);
    }
    if (!cachedLicense) {
        console.error("❌ License not loaded, exiting...");
        process.exit(1);
    }
    return cachedLicense;
};

/**
 * Direct export of the cached license data
 * WARNING: This will be null until initializeLicense() is called
 */
export { cachedLicense as license };

// Test-only helper to inject a license without reading from disk
export const __setLicenseForTests = (license: ILicense): void => {
    cachedLicense = license;
    isLicenseInitialized = true;
};

export const __resetLicenseForTests = (): void => {
    cachedLicense = null;
    isLicenseInitialized = false;
};
