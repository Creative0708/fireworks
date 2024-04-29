const path = require("path");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const dist = path.resolve(__dirname, "dist");

const isProd = process.env.NODE_ENV === "production";

Object.assign(process.env, {
    CARGO_PROFILE_RELEASE_LTO: "true",
    CARGO_PROFILE_RELEASE_OPT_LEVEL: "z",
    CARGO_PROFILE_RELEASE_PANIC: "abort",
    CARGO_PROFILE_RELEASE_STRIP: "symbols",
});

module.exports = {
    mode: isProd ? "production" : "development",
    entry: {
        index: "./src/index.ts"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.glsl$/,
                use: {
                    loader: "webpack-glsl-minify",
                    options: isProd ? {
                        // https://github.com/leosingleton/webpack-glsl-minify/issues/64
                        nomangle: ["texture"],
                        // https://github.com/leosingleton/webpack-glsl-minify/issues/62
                        preserveUniforms: true,
                    } : {
                        preserveDefines: true,
                        preserveUniforms: true,
                        preserveVariables: true,
                        disableMangle: true,
                    }
                }
            }
        ],
    },
    resolve: {
        extensions: [".js", ".glsl", ".ts"]
    },
    output: {
        path: dist,
        filename: "[name].js",
        clean: true,
    },
    devServer: {
        static: dist,
    },
    plugins: [
        new WasmPackPlugin({
            crateDirectory: path.resolve(__dirname, ".."),
        }),
        new HtmlWebpackPlugin({
            template: "src/index.html",
            minify: {
                collapseBooleanAttributes: true,
                collapseInlineTagWhitespace: true,
                collapseWhitespace: true,
                minifyCSS: true,
                minifyJS: true,
                minifyURLs: true,
                removeComments: true,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                useShortDoctype: true,
            }
        }),
    ],
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_debugger: false,
                    },
                }
            })
        ]
    },
    experiments: {
        asyncWebAssembly: true,
    },
};