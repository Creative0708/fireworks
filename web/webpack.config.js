const path = require("path");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const dist = path.resolve(__dirname, "dist");

const isProd = process.env.NODE_ENV === "production";

module.exports = {
    mode: isProd ? "development" : "production",
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
                    options: isProd ? {} : {
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
        // new WasmPackPlugin({
        //     crateDirectory: path.resolve(__dirname, ".."),
        // }),
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
                    }
                }
            })
        ]
    },
    experiments: {
        asyncWebAssembly: true,
    },
};