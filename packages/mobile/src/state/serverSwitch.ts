import { normalizeBaseUrl } from "../config/serverUrl";

type ServerSwitchDependencies = {
    clearCredentials: () => Promise<void>;
    clearIdentity: () => void;
    clearCache: () => void;
    persistServerUrl: (url: string) => Promise<void>;
    setServerUrl: (url: string) => void;
    allowInsecureLocal?: boolean;
};

export async function switchServerUrl(
    url: string,
    currentUrl: string | null,
    dependencies: ServerSwitchDependencies
): Promise<boolean> {
    const normalizedUrl = normalizeBaseUrl(url, dependencies.allowInsecureLocal);
    if (normalizedUrl === currentUrl) return false;

    try {
        await dependencies.clearCredentials();
    } catch (error) {
        dependencies.clearIdentity();
        dependencies.clearCache();
        throw error;
    }

    dependencies.clearIdentity();
    dependencies.clearCache();
    await dependencies.persistServerUrl(normalizedUrl);
    dependencies.setServerUrl(normalizedUrl);
    return true;
}
