// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Sentinels live ONLY in the EMBEDDED_* constant declarations in src/embedded-integrity.ts.
// They are intentionally distinct from the canonical placeholders the runtime normalizer
// (`computeNormalizedBundleHash`) uses (`__BUNDLE_HASH__`, `__BUNDLE_SIGNATURE__`,
// `__PUBLIC_KEY__`) so this plugin can replace the constants without touching the
// normalizer's literals — keeping both the constants and the normalizer correct.
const SENTINEL_HASH = '__INTEGRITY_EMBED_HASH__';
const SENTINEL_SIG  = '__INTEGRITY_EMBED_SIG__';
const SENTINEL_PUB  = '__INTEGRITY_EMBED_PUB__';

// Canonical placeholders matched by the runtime normalizer.
const CANONICAL_HASH = '__BUNDLE_HASH__';
const CANONICAL_SIG  = '__BUNDLE_SIGNATURE__';
const CANONICAL_PUB  = '__PUBLIC_KEY__';

function replaceAll(haystack, needle, replacement) {
  return haystack.split(needle).join(replacement);
}

/**
 * ESBuild plugin that embeds a SHA-256 hash + RSA signature of the bundle into
 * the EMBEDDED_HASH/EMBEDDED_SIGNATURE/EMBEDDED_PUBLIC_KEY sentinels declared in
 * `src/embedded-integrity.ts`. The hash is computed over the bundle in its
 * "canonical" form (sentinels rewritten back to the runtime normalizer's
 * canonical placeholders) so the runtime can recompute the same hash by
 * normalizing the on-disk bundle.
 */
function integrityPlugin() {
  return {
    name: 'integrity-plugin',
    setup(build) {
      build.onEnd(async (result) => {
        if (result.errors.length > 0) {
          return; // Don't process if there were build errors
        }

        try {
          const outputFile = build.initialOptions.outfile;
          if (!outputFile || !fs.existsSync(outputFile)) {
            console.warn('⚠️  Output file not found, skipping integrity embedding');
            return;
          }

          console.log('🔐 Embedding integrity data into bundle...');

          let bundleContent = fs.readFileSync(outputFile, 'utf8');

          // Sanity check: each sentinel MUST appear at least once in the bundle.
          // If not, esbuild's minifier inlined / folded them away (e.g. due to
          // dead-code elimination) and the plugin can't embed anything.
          for (const [name, sentinel] of [
            ['EMBEDDED_HASH', SENTINEL_HASH],
            ['EMBEDDED_SIGNATURE', SENTINEL_SIG],
            ['EMBEDDED_PUBLIC_KEY', SENTINEL_PUB],
          ]) {
            if (!bundleContent.includes(sentinel)) {
              throw new Error(
                `Sentinel ${sentinel} for ${name} not found in ${outputFile}. ` +
                `Esbuild may have dead-code-eliminated the EMBEDDED_* constants — ` +
                `verify keepNames is true and the constants are referenced.`
              );
            }
          }

          const privateKeyPath = path.join(__dirname, '../../scripts/release-signing/private.pem');
          const publicKeyPath = path.join(__dirname, '../../scripts/release-signing/public.pem');

          if (!fs.existsSync(privateKeyPath)) {
            console.error('🚨 Release-signing private key not found:', privateKeyPath);
            console.error('🚨 Run scripts/release-signing/generate-keys.sh to create one.');
            return;
          }

          if (!fs.existsSync(publicKeyPath)) {
            console.error('🚨 Release-signing public key not found:', publicKeyPath);
            console.error('🚨 Run scripts/release-signing/generate-keys.sh to create one.');
            return;
          }

          const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
          const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

          // Honour RELEASE_SIGNING_PASSPHRASE for encrypted keys. If unset, the key
          // is assumed to be unencrypted and `sign.sign(privateKey, ...)` runs as before.
          const signingPassphrase = process.env.RELEASE_SIGNING_PASSPHRASE;
          const signingKey = signingPassphrase
            ? { key: privateKey, passphrase: signingPassphrase }
            : privateKey;

          // The PEM has real newlines. The sentinel sits inside a JS string literal
          // (`var xa="__INTEGRITY_EMBED_PUB__"`), so the substitution must be valid JS.
          // JSON.stringify gives us a properly escaped, double-quoted JS literal; strip the
          // surrounding quotes since the bundle already provides them.
          const escapedPublicKey = JSON.stringify(publicKey).slice(1, -1);

          // Embed the (escaped) public key into the bundle right away. From here on,
          // `bundleContent` reflects the FINAL on-disk shape except for hash/sig.
          bundleContent = replaceAll(bundleContent, SENTINEL_PUB, escapedPublicKey);

          // cleanContent must equal what the runtime's `computeNormalizedBundleHash` will
          // produce for the on-disk bundle, so the two hashes match.
          //
          // At runtime, normalization replaces:
          //   - actual hash → CANONICAL_HASH
          //   - actual signature → CANONICAL_SIG
          //   - in-memory EMBEDDED_PUBLIC_KEY (parsed PEM, real newlines) → CANONICAL_PUB
          //     This last replace is effectively a no-op because the on-disk bundle holds
          //     the JS-escaped form (\\n etc.), which never matches the parsed string.
          //
          // To stay aligned, the build's cleanContent ALSO leaves the (escaped) public key
          // in place and only canonicalizes the hash/signature sentinels.
          let cleanContent = replaceAll(bundleContent, SENTINEL_HASH, CANONICAL_HASH);
          cleanContent = replaceAll(cleanContent, SENTINEL_SIG, CANONICAL_SIG);

          const bundleHash = crypto.createHash('sha256').update(Buffer.from(cleanContent)).digest('hex');

          const sign = crypto.createSign('RSA-SHA256');
          sign.update(bundleHash);
          const signature = sign.sign(signingKey, 'hex');

          // Embed actual hash/signature into the bundle (replace-all is defensive against
          // esbuild ever emitting more than one occurrence of a sentinel).
          bundleContent = replaceAll(bundleContent, SENTINEL_HASH, bundleHash);
          bundleContent = replaceAll(bundleContent, SENTINEL_SIG, signature);

          fs.writeFileSync(outputFile, bundleContent);

          console.log('✅ Integrity data successfully embedded into bundle');
          console.log(`📊 Bundle hash: ${bundleHash}`);
          console.log(`🔏 Signature: ${signature.substring(0, 32)}...`);

          const distDir = path.dirname(outputFile);
          fs.writeFileSync(path.join(distDir, 'server.embedded.hash'), bundleHash);
          fs.writeFileSync(path.join(distDir, 'server.embedded.sig'), signature);

          console.log('📁 Integrity reference files saved to dist/');

        } catch (error) {
          console.error('🚨 Failed to embed integrity data:', error.message);
          process.exit(1);
        }
      });
    }
  };
}

module.exports = { integrityPlugin };
