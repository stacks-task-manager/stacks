export function normalizeBaseUrl(
    raw: string,
    allowInsecureLocal = typeof __DEV__ !== "undefined" && __DEV__
): string {
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        throw new Error("Server URL must be a valid HTTPS URL");
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Server URL must use HTTPS");
    }
    if (url.username || url.password || url.search || url.hash) {
        throw new Error("Server URL cannot include credentials, a query string, or a fragment");
    }

    const hostname = url.hostname.toLowerCase();
    const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    if (url.protocol === "http:" && (!allowInsecureLocal || !loopback)) {
        throw new Error("Server URL must use HTTPS except for loopback during development");
    }

    return url.toString().replace(/\/+$/, "");
}
