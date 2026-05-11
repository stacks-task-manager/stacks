// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Main server entry point for the Stacks Hono application
 *
 * This file sets up the Hono web server with middleware, database connection,
 * API routes, and WebSocket support for real-time features.
 */
// Initialize embedded integrity check FIRST - before any other imports
import { initializeEmbeddedIntegrityCheck } from "./embedded-integrity";
// Skip integrity checks while running tests
if (process.env.NODE_ENV !== "test") {
    initializeEmbeddedIntegrityCheck(true); // Enforce integrity, exit if tampered
}

import { assertProductionSecretsAtStartup } from "./config/secrets";
import "./i18n/preload";
if (process.env.NODE_ENV !== "test") {
    assertProductionSecretsAtStartup();
}

import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

/** Builds strict CORS when `CORS_ORIGINS` is set; otherwise Hono default `cors()`. */
function createCorsMiddleware() {
    const raw = process.env.CORS_ORIGINS?.trim();
    const origins = raw
        ? raw
              .split(",")
              .map(s => s.trim())
              .filter(Boolean)
        : [];
    if (origins.length > 0) {
        return cors({
            origin: origins,
            allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
            credentials: true,
        });
    }
    return cors();
}
import { prettyJSON } from "hono/pretty-json";
import { compress } from "hono/compress";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

import auth from "./routes/auth";
import { connectDb } from "@stacks/db";
import { registerResponseHelpers } from "./services/response";
import { errorHandler } from "./utils/errorHandler";
import { registerApiRoutes } from "./api";
import ping from "./routes/ping";
import login from "./routes/login";
import register from "./routes/register";
import { registerAiChatWebSocketHandlers } from "./ai/wsBridge";
import { registerSocket } from "./routes/socket";
import { seedDatabase } from "./seed/index.js";
import { initializeLicense as initLicense } from "@stacks/license";
import { translations } from "./middleware/translations";
import { appPackageVersion, serverPackageVersion } from "./packageVersions";

// Initialize Hono application
const app = new Hono();

// Register custom response helpers for standardized API responses
registerResponseHelpers(app);

app.onError((err, c) => errorHandler(err, c));

// Global middleware configuration
app.use("*", logger()); // Request logging
app.use("*", createCorsMiddleware());
app.use("*", prettyJSON()); // JSON response formatting
app.use("*", secureHeaders()); // Security headers
app.use("*", timing()); // Request timing
app.use("*", translations);
// Route registration
app.route("/auth", auth);
app.route("/ping", ping);
app.route("/login", login);
app.route("/register", register);

// server all static files from ../static
app.use("/static/*", serveStatic({ root: "./" }));

// Root endpoint — landing hub (Handlebars template in static/landing.html)
app.get("/", c => {
    return c.replyHtml("landing", {
        versionServer: serverPackageVersion,
        versionApp: appPackageVersion,
    });
});

// Health check endpoint
app.get("/health", c => {
    return c.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: serverPackageVersion,
    });
});

// Gzip/deflate JSON API responses only (skips static assets and SPA files)
app.use("/api/*", compress());

// Register all API routes
registerApiRoutes(app);

registerAiChatWebSocketHandlers();

// Setup WebSocket support
const injectWebSocket = registerSocket(app);

const port = Number(process.env.APP_PORT ?? 3000);

/**
 * Boots the server.
 *
 * Awaits platform services (database, license) before opening the HTTP port so
 * the first request cannot hit an uninitialized DB or license cache. Skipped
 * during tests — `test/globalSetup.ts` takes care of setup there.
 */
async function bootstrap() {
    if (process.env.NODE_ENV !== "test") {
        await connectDb();
        // License must be initialized before seed — seed/tenants.ts & seed/users.ts
        // call getLicense() synchronously, which hard-exits if the cache is empty.
        await initLicense();
        await seedDatabase();
    }

    console.log(`🚀 Stacks server is running on port: ${port}`);

    const server = serve({
        fetch: app.fetch,
        port,
    });

    injectWebSocket(server);
}

if (require.main === module) {
    bootstrap().catch(error => {
        console.error("Server failed to start:", error);
        process.exit(1);
    });
}

export default app;
export type AppServer = typeof serve;
