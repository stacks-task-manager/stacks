// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Script-context encoding (S04): values embedded inside an inline <script> element.
 * JSON serialization keeps the HTML script terminator and the Unicode line separators
 * verbatim, so both must be escaped before the text reaches the document.
 */
import { randomUUID } from "crypto";

export const scriptSafeJson = (value: unknown): string =>
    JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");

/**
 * Per-response nonce for an inline script element, mirrored into the CSP header so a
 * document that is cached or reused cannot re-run a script that was not just generated.
 */
export const createInlineScriptNonce = (): string => randomUUID();
