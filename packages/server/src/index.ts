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

import { getTrustedOrigins } from "./config/origins";
import { assertOriginConfiguration } from "./config/origins";
import { assertProductionSecretsAtStartup } from "./config/secrets";
import "./i18n/preload";
if (process.env.NODE_ENV !== "test") {
    assertProductionSecretsAtStartup();
    assertOriginConfiguration();
}

import { Hono } from "hono";
import { cors } from "hono/cors";

/**
 * CORS for the exact browser origins the deployment trusts. There is no wildcard
 * fallback: a credentialed response must name one origin, and Hono reflects only
 * a matching `Origin` and marks the response `Vary: Origin` for it.
 */
function createTrustedCorsMiddleware() {
    return cors({
        origin: [...getTrustedOrigins()],
        allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
        credentials: true,
    });
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
import { seedTenants } from "./seed/tenants.js";
import { initializeLicense as initLicense } from "@stacks/license";

const LICENSE_EXPIRY_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
import { translations } from "./middleware/translations";
import { appPackageVersion, serverPackageVersion } from "./packageVersions";
import { isPasswordRecoveryEnabled, isRegistrationEnabled } from "./config/features";
import { unauthenticatedApiRateLimit } from "./utils/authRateLimit";
import { startRateLimitCounterCleanup } from "./utils/rateLimit";
import { requestBodyLimit } from "./middleware/requestBodyLimit";
import { loggingMiddleware } from "./utils/logger";

// Initialize Hono application
const app = new Hono();

// Register custom response helpers for standardized API responses
registerResponseHelpers(app);

app.onError((err, c) => errorHandler(err, c));

// Global middleware configuration
app.use("*", requestBodyLimit);
app.use("*", loggingMiddleware()); // Request logging with credential-safe paths
app.use("*", createTrustedCorsMiddleware());
app.use("*", prettyJSON()); // JSON response formatting
app.use("*", secureHeaders()); // Security headers
app.use("*", timing()); // Request timing
app.use("*", translations);
// Route registration
app.use("/auth/*", unauthenticatedApiRateLimit);
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
        registrationEnabled: isRegistrationEnabled(),
        passwordRecoveryEnabled: isPasswordRecoveryEnabled(),
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
        startRateLimitCounterCleanup();
        // License must be initialized before seed — seed/tenants.ts & seed/users.ts
        // call getLicense() synchronously, which hard-exits if the cache is empty.
        await initLicense();
        await seedDatabase();

        // Long-running processes would otherwise never re-check the cached
        // expiry; sweep tenants every 24h so naturally-expired licenses get
        // disabled without a restart.
        setInterval(() => {
            seedTenants().catch(error => {
                console.error("❌ Scheduled license expiry sweep failed:", error);
            });
        }, LICENSE_EXPIRY_CHECK_INTERVAL_MS).unref();
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
