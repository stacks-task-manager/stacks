// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            [
                "module-resolver",
                {
                    root: ["./"],
                    alias: {
                        "@": "./src",
                        "tailwind.config": "./tailwind.config.js",
                    },
                },
            ],
            "react-native-worklets/plugin",
        ],
    };
};
