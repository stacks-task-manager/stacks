// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(monorepoRoot, "node_modules"),
];

/**
 * Force every package in the monorepo (including sibling workspaces like
 * `@stacks/types`) to resolve the React runtime to the *single* copy
 * installed under `packages/mobile/node_modules`. Without this, metro can
 * walk up from a workspace dep and pick the web app's React 18 copy at the
 * monorepo root, producing the classic
 *   "Cannot read property 'ReactCurrentDispatcher' of undefined"
 * crash when two React runtimes fight over hooks.
 */
const DEDUPE_MODULES = [
    "react",
    "react-native",
    "scheduler",
    "react-native-gesture-handler",
    "react-native-reanimated",
    "react-native-safe-area-context",
    "react-native-screens",
];

const dedupeRoots = Object.fromEntries(
    DEDUPE_MODULES.map(name => [name, path.resolve(projectRoot, "node_modules", name)])
);

/**
 * `@gluestack-ui/core` (v3) transitively imports `react-dom` via
 * `react-aria` / `@react-aria/*`. On React Native those code paths are
 * never exercised, but metro still bundles `react-dom@18`, which at import
 * time does `var x = ReactSharedInternals.ReactCurrentDispatcher;` — and
 * React 19 removed that internals key, so the module crashes before the
 * bundle finishes loading. We redirect the entire `react-dom` specifier to
 * a local stub file that exposes no-op versions of the DOM APIs. The real
 * DOM code paths are unreachable on RN, so the stub is safe.
 */
const reactDomStub = path.resolve(projectRoot, "stubs", "react-dom.js");

config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules ?? {}),
    ...dedupeRoots,
    "react-dom": reactDomStub,
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "react-dom" || moduleName.startsWith("react-dom/")) {
        return {
            type: "sourceFile",
            filePath: reactDomStub,
        };
    }
    for (const name of DEDUPE_MODULES) {
        if (moduleName === name || moduleName.startsWith(`${name}/`)) {
            const rest = moduleName.slice(name.length);
            return context.resolveRequest(
                context,
                path.join(dedupeRoots[name], rest),
                platform
            );
        }
    }
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
