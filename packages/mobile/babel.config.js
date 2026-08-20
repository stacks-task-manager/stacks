// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
module.exports = function (api) {
    api.cache(true);
    return {
        presets: [["babel-preset-expo"]],
        plugins: [
            [
                "module-resolver",
                {
                    root: ["./"],
                    alias: {
                        "@": "./src",
                    },
                },
            ],
            "react-native-worklets/plugin",
        ],
    };
};
