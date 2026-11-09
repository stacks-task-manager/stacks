import Storage, { setStorageTenant } from "../storage";

describe("tenant storage namespace", () => {
    beforeEach(() => {
        window.localStorage.clear();
        setStorageTenant("authenticated-tenant");
    });

    it("uses the tenant ID supplied by authenticated bootstrap rather than a browser cookie", () => {
        document.cookie = "tenant=attacker-controlled-tenant; path=/";

        Storage.set("selected-project", "project-1");

        expect(window.localStorage.getItem("authenticated-tenant/selected-project")).toBe("project-1");
        expect(window.localStorage.getItem("attacker-controlled-tenant/selected-project")).toBeNull();
    });

    it("rejects an empty tenant namespace", () => {
        expect(() => setStorageTenant("  ")).toThrow("Storage tenant ID is required");
    });
});
