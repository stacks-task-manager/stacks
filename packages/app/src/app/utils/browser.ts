// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * BCP 47 locale the browser reports (e.g. `navigator.language`), suitable for `Intl` formatters.
 * Falls back to `en-US` when not in a browser or when empty.
 */
export function getBrowserLocale(): string {
    if (typeof navigator === "undefined") {
        return "en-US";
    }
    const lang = navigator.language || navigator.languages?.[0];
    return typeof lang === "string" && lang.length > 0 ? lang : "en-US";
}

export function openInNewTab(url: string) {
    window.open(url, '_blank');
}

export async function setClipboard(text: string) {
    const type = "text/plain";
    const clipboardItemData = {
        [type]: text,
    };
    const clipboardItem = new ClipboardItem(clipboardItemData);
    await navigator.clipboard.write([clipboardItem]);
}