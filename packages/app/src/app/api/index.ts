// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Re-exports domain API clients and a legacy no-op default loader.
 */
export * from "./activities";
export * from "./bookmarks";
export * from "./companies";
export * from "./documents";
export * from "./events";
export * from "./files";
export * from "./home";
export * from "./boot";
export * from "./calendarIntegrations";
export * from "./notepads";
export * from "./notifications";
export * from "./people";
export * from "./permissions";
export * from "./preferences";
export * from "./projects";
export * from "./reminders";
export * from "./reports";
export * from "./search";
export * from "./stacks";
export * from "./statuses";
export * from "./tags";
export * from "./tasks";
export * from "./website";
export * from "./roles";
export * from "./export";

/** @deprecated Debug stub; prefer explicit `*API` imports. */
export default function (slug: string, ...args: Array<unknown>) {
    console.warn("SHOULD LOAD API", slug, args);

    return Promise.resolve();
}
