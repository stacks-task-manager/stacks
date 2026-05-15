#!/usr/bin/env bash
# Generate a fresh release-signing keypair for the @stacks/server bundle.
# See README.md in this folder for what these keys are for and when you need them.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRIVATE_KEY="$SCRIPT_DIR/private.pem"
PUBLIC_KEY="$SCRIPT_DIR/public.pem"

if [[ -f "$PRIVATE_KEY" || -f "$PUBLIC_KEY" ]]; then
    echo "❌ Refusing to overwrite existing keys at $SCRIPT_DIR" >&2
    echo "   Move or delete private.pem / public.pem first if you really want to rotate." >&2
    exit 1
fi

# Passphrase: env var if set, otherwise prompt twice.
if [[ -n "${RELEASE_SIGNING_PASSPHRASE:-}" ]]; then
    PASSPHRASE="$RELEASE_SIGNING_PASSPHRASE"
    echo "ℹ️  Using passphrase from RELEASE_SIGNING_PASSPHRASE"
else
    read -rsp "Enter passphrase for the new private key: " PASSPHRASE
    echo
    read -rsp "Confirm passphrase: " CONFIRM
    echo
    if [[ "$PASSPHRASE" != "$CONFIRM" ]]; then
        echo "❌ Passphrases do not match." >&2
        exit 1
    fi
    if [[ ${#PASSPHRASE} -lt 16 ]]; then
        echo "❌ Use at least 16 characters." >&2
        exit 1
    fi
fi

echo "🔑 Generating 2048-bit RSA private key (AES-256 encrypted)..."
openssl genpkey \
    -algorithm RSA \
    -pkeyopt rsa_keygen_bits:2048 \
    -aes-256-cbc \
    -pass "pass:$PASSPHRASE" \
    -out "$PRIVATE_KEY"

echo "🔓 Extracting matching public key..."
openssl rsa \
    -in "$PRIVATE_KEY" \
    -passin "pass:$PASSPHRASE" \
    -pubout \
    -out "$PUBLIC_KEY" 2>/dev/null

chmod 600 "$PRIVATE_KEY"
chmod 644 "$PUBLIC_KEY"

echo "✅ Wrote $PRIVATE_KEY (mode 600)"
echo "✅ Wrote $PUBLIC_KEY (mode 644)"
echo
echo "Next steps:"
echo "  1. Export the passphrase before any release build:"
echo "       export RELEASE_SIGNING_PASSPHRASE='<your passphrase>'"
echo "  2. Run yarn build:server (or yarn release) and confirm the bundle signs cleanly."
echo "  3. Store the passphrase in your password manager — losing it means losing the key."
