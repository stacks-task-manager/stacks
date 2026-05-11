const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Configuration
const BUNDLE_PATH = path.join(__dirname, "../releases/server.js");
const HASH_FILE = path.join(__dirname, "../releases/server.hash");
const SIGNATURE_FILE = path.join(__dirname, "../releases/server.sig");
const PRIVATE_KEY_PATH = path.join(__dirname, "license_keys/private.pem");
const PUBLIC_KEY_PATH = path.join(__dirname, "license_keys/public.pem");

/**
 * Generate SHA-256 hash of the bundle
 */
function generateHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Sign the hash with private key
 */
function signHash(hash, privateKeyPath) {
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(hash);
    return sign.sign(
        {
            key: privateKey,
            passphrase:
                "a&X$8**VNuvckCZJf9zes2&@q887-FZdvTDKF#Y&spPVeU395XmfMnPZAsKEJsaqU%mMw4NUzV_#wbK!5UWX2UFGqM9d9aLDaZemBMGR%wA8r=n$srj8@!#G%__@Q6t8",
        },
        "hex"
    );
}

/**
 * Verify signature with public key
 */
function verifySignature(hash, signature, publicKeyPath) {
    const publicKey = fs.readFileSync(publicKeyPath, "utf8");
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(hash);
    return verify.verify(publicKey, signature, "hex");
}

/**
 * Main signing process
 */
function signBundle() {
    try {
        // Check if bundle exists
        if (!fs.existsSync(BUNDLE_PATH)) {
            console.error("❌ Bundle file not found:", BUNDLE_PATH);
            process.exit(1);
        }

        // Generate hash
        console.log("📝 Generating hash for bundle...");
        const hash = generateHash(BUNDLE_PATH);
        console.log("✅ Hash generated:", hash);

        // Sign the hash
        console.log("🔐 Signing bundle...");
        const signature = signHash(hash, PRIVATE_KEY_PATH);
        console.log("✅ Bundle signed successfully");

        // Save hash and signature
        fs.writeFileSync(HASH_FILE, hash);
        fs.writeFileSync(SIGNATURE_FILE, signature);
        console.log("💾 Hash and signature saved");

        // Verify the signature
        console.log("🔍 Verifying signature...");
        const isValid = verifySignature(hash, signature, PUBLIC_KEY_PATH);

        if (isValid) {
            console.log("✅ Bundle signature verification successful!");
            console.log("🎉 Bundle is ready for distribution");
        } else {
            console.error("❌ Signature verification failed!");
            process.exit(1);
        }

        // Generate integrity check code
        generateIntegrityCheck(hash);
    } catch (error) {
        console.error("❌ Error during signing process:", error.message);
        process.exit(1);
    }
}

/**
 * Generate integrity check code to embed in the application
 */
function generateIntegrityCheck(expectedHash) {
    const integrityCode = `
// Auto-generated integrity check - DO NOT MODIFY
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function verifyIntegrity() {
    try {
        const bundlePath = path.join(__dirname, 'server.js');
        const hashPath = path.join(__dirname, 'server.hash');
        const sigPath = path.join(__dirname, 'server.sig');
        const publicKeyPath = path.join(__dirname, 'public.pem');
        
        // Check if all required files exist
        if (!fs.existsSync(hashPath) || !fs.existsSync(sigPath) || !fs.existsSync(publicKeyPath)) {
            console.error('🚨 Security files missing - application may be tampered with');
            process.exit(1);
        }
        
        // Read stored hash and signature
        const storedHash = fs.readFileSync(hashPath, 'utf8');
        const signature = fs.readFileSync(sigPath, 'utf8');
        const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        
        // Generate current hash
        const currentHash = crypto.createHash('sha256')
            .update(fs.readFileSync(bundlePath))
            .digest('hex');
        
        // Verify hash matches
        if (currentHash !== storedHash) {
            console.error('🚨 File integrity check failed - bundle has been modified');
            process.exit(1);
        }
        
        // Verify signature
        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(storedHash);
        const isValid = verify.verify(publicKey, signature, 'hex');
        
        if (!isValid) {
            console.error('🚨 Signature verification failed - bundle may be tampered with');
            process.exit(1);
        }
        
        console.log('✅ Bundle integrity verified');
    } catch (error) {
        console.error('🚨 Integrity verification error:', error.message);
        process.exit(1);
    }
}

// Run integrity check on startup
verifyIntegrity();
`;

    const integrityPath = path.join(__dirname, "../releases/integrity-check.js");
    fs.writeFileSync(integrityPath, integrityCode);
    console.log("🛡️  Integrity check code generated:", integrityPath);
}

// Run the signing process
if (require.main === module) {
    signBundle();
}

module.exports = {
    generateHash,
    signHash,
    verifySignature,
    signBundle,
};
