import type { MiddlewareHandler } from "hono";

/** Keep personalized API responses out of browser and shared HTTP caches. */
export const privateResponse: MiddlewareHandler = async (c, next) => {
    await next();
    c.header("Cache-Control", "private, no-store");
};
