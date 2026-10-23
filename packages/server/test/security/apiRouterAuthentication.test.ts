import { afterAll } from "vitest";
import { RateLimitCounterEntity } from "@stacks/db";
import { Op } from "sequelize";
import app from "../../src/index";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";

const probeAddresses: string[] = [];
let nextProbeAddress = 1;

function probeRequestContext() {
    const ip = `198.51.${Math.floor((nextProbeAddress - 1) / 254)}.${((nextProbeAddress - 1) % 254) + 1}`;
    nextProbeAddress += 1;
    probeAddresses.push(ip);
    return { incoming: { socket: { remoteAddress: ip } } };
}

const registeredApiRoutes = (app as any).routes
    .filter(
        (route: { method: string; path: string }) =>
            route.path.startsWith("/api/") &&
            route.path !== "/api/info" &&
            route.method !== "ALL" &&
            route.method !== "HEAD" &&
            route.method !== "OPTIONS"
    )
    .map((route: { method: string; path: string }) => ({
        method: route.method,
        path: route.path.replace(/:([^/]+)/g, "11111111-1111-4111-8111-111111111111").replace(/\*/g, "probe"),
    }));

const registeredApiRouteCases = registeredApiRoutes.map(({ method, path }) => [
    `${method} ${path}`,
    method,
    path,
]);

afterAll(async () => {
    const keyHashes = [...new Set(probeAddresses)].map(ip => rateLimitKeyHash("unauthenticated-api-ip", ip));
    if (keyHashes.length) {
        await RateLimitCounterEntity.destroy({ where: { keyHash: { [Op.in]: keyHashes } } });
        await expect(
            RateLimitCounterEntity.count({ where: { keyHash: { [Op.in]: keyHashes } } })
        ).resolves.toBe(0);
    }
});

const authenticatedRouters = [
    "people",
    "projects",
    "companies",
    "tasks",
    "documents",
    "stacks",
    "events",
    "bookmarks",
    "notifications",
    "reminders",
    "home",
    "activities",
    "tags",
    "notepads",
    "preferences",
    "permissions",
    "files",
    "reports",
    "timelogs",
    "search",
    "boot",
    "roles",
    "export",
    "mcp",
    "calendars",
];

describe("API router authentication boundary", () => {
    test.each(authenticatedRouters)("rejects unauthenticated requests to /api/%s", async router => {
        const response = await app.request(`/api/${router}`, {}, probeRequestContext());

        expect(response.status).toBe(401);
    });

    test.each(registeredApiRouteCases)("rejects unauthenticated %s", async (_label, method, path) => {
        const response = await app.request(path, { method }, probeRequestContext());

        expect(response.status).toBe(401);
    });

    test("keeps the documented info endpoint public", async () => {
        const response = await app.request("/api/info", {}, probeRequestContext());

        expect(response.status).toBe(200);
    });

    test.each(["/api/google", "/api/integrations/google"])(
        "requires authentication for Google OAuth routes mounted at %s",
        async prefix => {
            const response = await app.request(`${prefix}/auth-url`, {}, probeRequestContext());

            expect(response.status).toBe(401);
        }
    );

    test("does not turn an unmounted API path into an authenticated route", async () => {
        const response = await app.request("/api/not-a-mounted-router", {}, probeRequestContext());

        expect(response.status).toBe(404);
    });
});
