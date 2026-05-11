// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
"use strict";

/**
 * Empty stub that replaces `react-dom` in the mobile bundle.
 *
 * Gluestack v3 (`@gluestack-ui/core`) transitively depends on `react-dom`
 * via `react-aria` / `@react-aria/*`. On React Native none of those code
 * paths are reachable, but yarn still installs `react-dom@18` under
 * `packages/mobile/node_modules/react-dom`, and metro happily bundles it.
 * The first thing react-dom@18 does at import time is
 *     var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
 * which blows up on React 19 because `__SECRET_INTERNALS_…` was renamed.
 *
 * Replacing the module with this empty file prevents the eager crash and
 * the dead DOM-only call sites never execute at runtime.
 */

const noop = () => undefined;

module.exports = {
    createPortal: noop,
    findDOMNode: noop,
    flushSync: (fn) => (typeof fn === "function" ? fn() : undefined),
    hydrate: noop,
    render: noop,
    unmountComponentAtNode: noop,
    unstable_batchedUpdates: (fn, arg) =>
        typeof fn === "function" ? fn(arg) : undefined,
    version: "shim",
};
module.exports.default = module.exports;
