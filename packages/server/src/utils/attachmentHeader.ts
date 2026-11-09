/** Safe ASCII fallback plus the original UTF-8 name for attachment downloads. */
export function attachmentDownloadDisposition(originalName: string): string {
    const safeName =
        originalName
            .replace(/[\/\\\u0000-\u001f\u007f"<>]/g, "-")
            .trim()
            .slice(0, 200) || "download";
    const ascii = safeName.normalize("NFKD").replace(/[^\x20-\x7e]/g, "-");
    const encoded = encodeURIComponent(safeName).replace(
        /[!'()*]/g,
        character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    );
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
