
declare module "*.glsl" {
    const value: import("webpack-glsl-minify").GlslShader;
    export default value;
}