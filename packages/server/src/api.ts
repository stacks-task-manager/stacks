// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Mounts versioned JSON API, static assets, and authenticated route modules on a Hono app.
 */
import { Hono } from "hono";
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

    /**
     * Authenticated /api/* routes.
     *
     * Auth is applied per-router (not as a broad `app.use("/api/*", ...)` prefix
     * middleware) so that requests to unmounted /api/* paths fall through to
     * Hono's default 404 instead of being short-circuited with a misleading
     * "Authentication token missing" 401 from `requireAuth`. Public routes
     * (e.g.`/api/info`) remain mounted above this block.
     */
    const mountAuthenticated = (path: string, router: Hono) => {
        const guarded = new Hono();
        guarded.use("*", requireAuth, withRequestContext);
        guarded.route("/", router);
        app.route(`/api/${path}`, guarded);
    };

    mountAuthenticated("people", people);
    mountAuthenticated("projects", projects);
    mountAuthenticated("companies", companies);
    mountAuthenticated("tasks", tasks);
    mountAuthenticated("documents", documents);
    mountAuthenticated("stacks", stacks);
    mountAuthenticated("events", events);
    mountAuthenticated("bookmarks", bookmarks);
    mountAuthenticated("notifications", notifications);
    mountAuthenticated("reminders", reminders);
    mountAuthenticated("home", home);
    mountAuthenticated("activities", activities);
    mountAuthenticated("tags", tags);
    mountAuthenticated("notepads", notepads);
    mountAuthenticated("preferences", preferences);
    mountAuthenticated("permissions", permissions);
    mountAuthenticated("files", files);
    mountAuthenticated("reports", reports);
    mountAuthenticated("timelogs", timelogs);
    mountAuthenticated("search", search);
    mountAuthenticated("boot", boot);
    mountAuthenticated("roles", roles);
    mountAuthenticated("export", exportRoute);
};
