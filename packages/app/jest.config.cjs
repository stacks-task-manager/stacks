// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
process.env.BABEL_ENV = "test";
process.env.NODE_ENV = "test";

/** @type {import('jest').Config} */
module.exports = {
    globalSetup: "<rootDir>/jest-global-setup.cjs",
    testEnvironment: "jsdom",
    roots: ["<rootDir>/src"],
    testMatch: ["**/__tests__/**/*.spec.[jt]s?(x)"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    moduleNameMapper: {
        "\\.(css|scss|sass)$": "identity-obj-proxy",
        // Compiled output: @stacks/types/translations use `.js` specifiers in source; Jest resolves those via dist.
        "^@stacks/types$": "<rootDir>/../types/dist/index.js",
        "^@stacks/translations$": "<rootDir>/../translations/dist/index.js",
    },
    modulePaths: ["<rootDir>/src"],
    setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
    transform: {
        "^.+\\.(js|jsx|mjs|ts|tsx)$": "babel-jest",
    },
};
