const path = require("path");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const dist = path.resolve(__dirname, "dist");

module.exports = {
    mode: "production",
    entry: {
        index: "./src/index.js"
    },
    output: {
        path: dist,
        filename: "[name].js"
    },
    devServer: {
        static: dist,
    },
    plugins: [
        new WasmPackPlugin({
            crateDirectory: path.resolve(__dirname, ".."),
        }),
        new HtmlWebpackPlugin({
            template: "src/index.html"
        }),
    ],
    experiments: {
        asyncWebAssembly: true,
    }
};