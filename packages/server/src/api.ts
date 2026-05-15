// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Mounts versioned JSON API, static assets, and authenticated route modules on a Hono app.
 */
import type { Hono } from "hono";
import { proxy } from "hono/proxy";
import { serveStatic } from "@hono/node-server/serve-static";

import { requireAuth, requireAuthSession } from "./middleware/auth";
import { withRequestContext } from "./middleware/requestContext";
import type { User } from "./types";
import activities from "./routes/activities";
import bookmarks from "./routes/bookmarks";
import companies from "./routes/companies";
import documents from "./routes/documents";
import events from "./routes/events";
import files from "./routes/files";
import home from "./routes/home";
import notifications from "./routes/notifications";
import people from "./routes/people";
import projects from "./routes/projects";
import stacks from "./routes/stacks";
import tags from "./routes/tags";
import tasks from "./routes/tasks";
import preferences from "./routes/preferences";
import notepads from "./routes/notepads";
import permissions from "./routes/permissions";
import timelogs from "./routes/timelogs";
import reports from "./routes/reports";
import search from "./routes/search";
import googleAuth from "./routes/googleAuth";
import boot from "./routes/boot";
import reminders from "./routes/reminders";
import roles from "./routes/roles";
import exportRoute from "./routes/export";
import info from "./routes/info";

/**
 * Register API routes with conditional static file serving
 *
 * In development (NODE_ENV=development):
 * - Proxies /app/* and /static/* requests to React dev server at localhost:3001
 *
 * In production (NODE_ENV=production or any other value):
 * - Serves static files from ../app/build directory
 * - Handles SPA routing by falling back to index.html for /app/* routes
 * - /app/* uses JWT-only auth (no per-request DB load for each asset); /api/* loads full user + role
 */
export const registerApiRoutes = (app: Hono) => {
    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment) {
        // Development: Proxy to React dev server
        app.all("/app/*", requireAuthSession, c => {
            const user = c.get("user") as User;
            if (!user) {
                return c.redirect("/login");
            }
            return proxy(`http://localhost:3001${c.req.path}`, {
                headers: {
                    ...c.req.header(),
                    cookie: c.req.header("cookie") || "",
                },
            });
        });

        app.all("/static/*", c => {
            return proxy(`http://localhost:3001${c.req.path}`, {
                headers: {
                    ...c.req.header(),
                    cookie: c.req.header("cookie") || "",
                },
            });
        });

        app.all("/manifest.json", () => {
            return proxy(`http://localhost:3001/manifest.json`);
        });
    } else {
        // Serve other static files by extension (CSS, JS, images, etc.)
        app.use("*", async (c, next) => {
            return serveStatic({
                root: "./app",
            })(c, next);
        });

        // Serve app files automatically from static folder
        app.use(
            "/app/*",
            requireAuthSession,
            serveStatic({
                root: "./app",
                rewriteRequestPath: (path: string) => path.replace(/^\/app/, ""),
            })
        );
    }

    // Google OAuth routes (no auth required for some endpoints)
    app.route("/api/google", googleAuth);

    // Public license / source disclosure (AGPL §13). Mounted before requireAuth so
    // remote users — including unauthenticated ones — can discover the source URL.
    app.route("/api/info", info);

    app.use("/api/*", requireAuth); // all routes below this will require authentication
    app.use("/api/*", withRequestContext); // set up request context for authenticated routes
    app.route("/api/people", people);
    app.route("/api/projects", projects);
    app.route("/api/companies", companies);
    app.route("/api/tasks", tasks);
    app.route("/api/documents", documents);
    app.route("/api/stacks", stacks);
    app.route("/api/events", events);
    app.route("/api/bookmarks", bookmarks);
    app.route("/api/notifications", notifications);
    app.route("/api/reminders", reminders);
    app.route("/api/home", home);
    app.route("/api/activities", activities);
    app.route("/api/tags", tags);
    app.route("/api/notepads", notepads);
    app.route("/api/preferences", preferences);
    app.route("/api/permissions", permissions);
    app.route("/api/files", files);
    app.route("/api/reports", reports);
    app.route("/api/timelogs", timelogs);
    app.route("/api/search", search);
    app.route("/api/boot", boot);
    app.route("/api/roles", roles);
    app.route("/api/export", exportRoute);
};
