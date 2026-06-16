// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const ESLintWebpackPlugin = require("eslint-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const appDir = __dirname;
const srcDir = path.join(appDir, "src");
const publicDir = path.join(appDir, "public");
const buildDir = path.join(appDir, "build");
const typesSrcEntry = path.resolve(appDir, "../types/src/index.ts");
const translationsSrcEntry = path.resolve(appDir, "../translations/src/index.ts");
const typesSrcDir = path.resolve(appDir, "../types/src");
const translationsSrcDir = path.resolve(appDir, "../translations/src");
const dateFnsDir = path.dirname(require.resolve("date-fns/package.json", { paths: [appDir] }));

const isEmojiSupportedSourceMapExclude = /[\\/]node_modules[\\/]is-emoji-supported[\\/]/;

const dartSassSilence = [
    "legacy-js-api",
    "import",
    "global-builtin",
    "color-functions",
    "slash-div",
    "color-4-api",
];

function getStyleLoaders(isProd, { modules = false } = {}) {
    const cssOptions = {
        importLoaders: 3,
        modules: modules
            ? {
                  namedExport: false,
                  localIdentName: isProd ? "[hash:base64:8]" : "[path][name]__[local]--[hash:base64:5]",
              }
            : false,
        sourceMap: true,
    };

    const loaders = [
        isProd
            ? MiniCssExtractPlugin.loader
            : {
                  loader: require.resolve("style-loader"),
                  options: { injectType: "styleTag" },
              },
        {
            loader: require.resolve("css-loader"),
            options: cssOptions,
        },
        {
            loader: require.resolve("postcss-loader"),
            options: {
                postcssOptions: {
                    plugins: [require.resolve("autoprefixer")],
                },
                sourceMap: true,
            },
        },
        {
            loader: require.resolve("resolve-url-loader"),
            options: { sourceMap: true },
        },
        {
            loader: require.resolve("sass-loader"),
            options: {
                sourceMap: true,
                sassOptions: {
                    silenceDeprecations: dartSassSilence,
                },
            },
        },
    ];

    return loaders;
}

module.exports = (env, argv) => {
    const mode = argv.mode || process.env.NODE_ENV || "development";
    process.env.NODE_ENV = mode;
    process.env.BABEL_ENV = process.env.BABEL_ENV || mode;
    const isProd = mode === "production";
    const publicUrl = (process.env.PUBLIC_URL || "/app").replace(/\/$/, "");

    const htmlTemplate = fs
        .readFileSync(path.join(publicDir, "index.html"), "utf8")
        .replace(/%PUBLIC_URL%/g, publicUrl);

    return {
        mode,
        context: appDir,
        bail: isProd,
        target: isProd ? "browserslist" : "web",
        devtool: isProd ? "source-map" : "eval-cheap-module-source-map",
        entry: path.join(srcDir, "index.tsx"),
        output: {
            path: buildDir,
            filename: isProd ? "static/js/[name].[contenthash:8].js" : "static/js/bundle.js",
            chunkFilename: isProd ? "static/js/[name].[contenthash:8].chunk.js" : "static/js/[name].chunk.js",
            assetModuleFilename: "static/media/[name].[hash][ext]",
            publicPath: `${publicUrl}/`,
            clean: isProd,
        },
        resolve: {
            symlinks: !isProd,
            modules: [srcDir, "node_modules"],
            extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
            extensionAlias: {
                ".js": [".ts", ".tsx", ".js"],
            },
            alias: {
                "@stacks/types": typesSrcEntry,
                "@stacks/translations": translationsSrcEntry,
                "date-fns/locale": path.join(dateFnsDir, "locale"),
                lodash: "lodash-es",
            },
        },
        module: {
            strictExportPresence: true,
            rules: [
                isProd && {
                    enforce: "pre",
                    exclude: [/@babel(?:\/|\\{1,2})runtime/, isEmojiSupportedSourceMapExclude],
                    test: /\.(js|mjs|jsx|ts|tsx|css)$/,
                    loader: require.resolve("source-map-loader"),
                },
                {
                    oneOf: [
                        {
                            test: [/\.avif$/],
                            type: "asset",
                            mimetype: "image/avif",
                            parser: { dataUrlCondition: { maxSize: 10_000 } },
                        },
                        {
                            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                            type: "asset",
                            parser: { dataUrlCondition: { maxSize: 10_000 } },
                        },
                        {
                            test: /\.svg$/i,
                            issuer: { and: [/\.(ts|tsx|js|jsx|md|mdx)$/] },
                            use: [
                                {
                                    loader: require.resolve("@svgr/webpack"),
                                    options: {
                                        prettier: false,
                                        svgo: false,
                                        svgoConfig: { plugins: [{ removeViewBox: false }] },
                                        titleProp: true,
                                        ref: true,
                                    },
                                },
                                {
                                    loader: require.resolve("file-loader"),
                                    options: { name: "static/media/[name].[hash].[ext]" },
                                },
                            ],
                        },
                        {
                            test: /\.(js|mjs|jsx|ts|tsx)$/,
                            include: [srcDir, typesSrcDir, translationsSrcDir],
                            loader: require.resolve("babel-loader"),
                            options: {
                                cacheDirectory: true,
                                cacheCompression: false,
                                compact: isProd,
                                babelrc: true,
                                configFile: path.join(appDir, "babel.config.cjs"),
                                plugins: [!isProd && require.resolve("react-refresh/babel")].filter(Boolean),
                            },
                        },
                        {
                            test: /\.(js|mjs)$/,
                            exclude: /@babel(?:\/|\\{1,2})runtime/,
                            loader: require.resolve("babel-loader"),
                            options: {
                                babelrc: false,
                                configFile: false,
                                compact: false,
                                cacheDirectory: true,
                                cacheCompression: false,
                                presets: [
                                    [
                                        require.resolve("babel-preset-react-app/dependencies"),
                                        { helpers: true },
                                    ],
                                ],
                                sourceMaps: isProd,
                                inputSourceMap: isProd,
                            },
                        },
                        {
                            test: /\.module\.(scss|sass)$/,
                            use: getStyleLoaders(isProd, { modules: true }),
                        },
                        {
                            test: /\.(scss|sass)$/,
                            exclude: /\.module\.(scss|sass)$/,
                            use: getStyleLoaders(isProd, { modules: false }),
                        },
                        {
                            test: /\.css$/,
                            exclude: /\.module\.css$/,
                            use: [
                                isProd
                                    ? MiniCssExtractPlugin.loader
                                    : {
                                          loader: require.resolve("style-loader"),
                                          options: { injectType: "styleTag" },
                                      },
                                {
                                    loader: require.resolve("css-loader"),
                                    options: { importLoaders: 1, sourceMap: true },
                                },
                                {
                                    loader: require.resolve("postcss-loader"),
                                    options: {
                                        postcssOptions: { plugins: [require.resolve("autoprefixer")] },
                                        sourceMap: true,
                                    },
                                },
                            ],
                        },
                        {
                            test: /\.module\.css$/,
                            use: [
                                isProd
                                    ? MiniCssExtractPlugin.loader
                                    : {
                                          loader: require.resolve("style-loader"),
                                          options: { injectType: "styleTag" },
                                      },
                                {
                                    loader: require.resolve("css-loader"),
                                    options: {
                                        importLoaders: 1,
                                        sourceMap: true,
                                        modules: {
                                            namedExport: false,
                                            localIdentName: isProd
                                                ? "[hash:base64:8]"
                                                : "[path][name]__[local]--[hash:base64:5]",
                                        },
                                    },
                                },
                                {
                                    loader: require.resolve("postcss-loader"),
                                    options: {
                                        postcssOptions: { plugins: [require.resolve("autoprefixer")] },
                                        sourceMap: true,
                                    },
                                },
                            ],
                        },
                        {
                            test: /\.(woff|woff2|eot|ttf|otf)$/i,
                            type: "asset/resource",
                        },
                        {
                            exclude: [/^$/, /\.(js|mjs|jsx|ts|tsx|html|json)$/],
                            type: "asset/resource",
                        },
                    ].filter(Boolean),
                },
            ].filter(Boolean),
        },
        plugins: [
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify(mode),
                "process.env.PUBLIC_URL": JSON.stringify(publicUrl),
            }),
            new HtmlWebpackPlugin({
                templateContent: htmlTemplate,
                inject: true,
                minify: isProd
                    ? {
                          removeComments: true,
                          collapseWhitespace: true,
                          removeRedundantAttributes: true,
                          useShortDoctype: true,
                          minifyJS: true,
                          minifyCSS: true,
                      }
                    : false,
            }),
            new webpack.ContextReplacementPlugin(/date-fns[\\/]locale$/, /^\.\/en-US$/),
            new webpack.IgnorePlugin({ resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/ }),
            isProd &&
                new MiniCssExtractPlugin({
                    filename: "static/css/[name].[contenthash:8].css",
                    chunkFilename: "static/css/[name].[contenthash:8].chunk.css",
                    ignoreOrder: true,
                }),
            !isProd &&
                new ReactRefreshWebpackPlugin({
                    overlay: false,
                }),
            new ForkTsCheckerWebpackPlugin({
                async: !isProd,
                typescript: {
                    configOverwrite: { compilerOptions: { skipLibCheck: true } },
                },
            }),
            new ESLintWebpackPlugin({
                extensions: ["js", "mjs", "jsx", "ts", "tsx"],
                context: srcDir,
                cwd: appDir,
                cache: true,
                cacheLocation: path.join(appDir, "node_modules/.cache/eslint-webpack-plugin"),
                emitWarning: !isProd ? false : true,
                failOnError: isProd,
            }),
            isProd &&
                new CopyWebpackPlugin({
                    patterns: [{ from: publicDir, to: buildDir, globOptions: { ignore: ["**/index.html"] } }],
                }),
        ].filter(Boolean),
        optimization: {
            minimize: isProd,
            minimizer: isProd
                ? [
                      new TerserPlugin({ parallel: true }),
                      new CssMinimizerPlugin({
                          minimizerOptions: {
                              preset: [
                                  "default",
                                  {
                                      calc: false,
                                  },
                              ],
                          },
                      }),
                  ]
                : [],
            ...(isProd && {
                usedExports: true,
                splitChunks: {
                    chunks: "all",
                    cacheGroups: {
                        vendor: {
                            test: /[\\/]node_modules[\\/]/,
                            name: "vendors",
                            chunks: "all",
                        },
                        blueprintjs: {
                            test: /[\\/]node_modules[\\/]@blueprintjs[\\/]/,
                            name: "blueprintjs",
                            chunks: "all",
                            priority: 10,
                        },
                        recharts: {
                            test: /[\\/]node_modules[\\/]recharts[\\/]/,
                            name: "recharts",
                            chunks: "all",
                            priority: 10,
                        },
                        tiptap: {
                            test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
                            name: "tiptap",
                            chunks: "all",
                            priority: 10,
                        },
                    },
                },
            }),
        },
        performance: false,
        devServer: !isProd
            ? {
                  hot: true,
                  historyApiFallback: { disableDotRule: true, index: `${publicUrl}/` },
                  static: { directory: publicDir, publicPath: `${publicUrl}/` },
                  compress: true,
                  port: process.env.PORT ? Number(process.env.PORT) : 3001,
                  host: process.env.HOST || "0.0.0.0",
                  client: { overlay: { errors: true, warnings: false } },
              }
            : undefined,
    };
};
