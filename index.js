/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/gl.ts":
/*!*******************!*\
  !*** ./src/gl.ts ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   TextGl: () => (/* binding */ TextGl)\n/* harmony export */ });\n/* harmony import */ var _shader_vert_glsl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./shader/vert.glsl */ \"./src/shader/vert.glsl\");\n/* harmony import */ var _shader_vert_glsl__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_shader_vert_glsl__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _shader_frag_glsl__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./shader/frag.glsl */ \"./src/shader/frag.glsl\");\n/* harmony import */ var _shader_frag_glsl__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_shader_frag_glsl__WEBPACK_IMPORTED_MODULE_1__);\n\n\nconst CELL_BUFFER_MAX_LIMIT = 1024;\nclass TextGl {\n    constructor(gl) {\n        this.numCellsToDraw = 0;\n        this.prevTextWidth = NaN;\n        this.prevTextHeight = NaN;\n        this.cells = [];\n        this.gl = gl;\n        const program = this.program = gl.createProgram();\n        function attachShader(shaderType, source) {\n            const shader = gl.createShader(shaderType);\n            gl.shaderSource(shader, source);\n            gl.compileShader(shader);\n            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {\n                throw Error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);\n            }\n            gl.attachShader(program, shader);\n            return shader;\n        }\n        this.vertShader = attachShader(gl.VERTEX_SHADER, (_shader_vert_glsl__WEBPACK_IMPORTED_MODULE_0___default().sourceCode));\n        this.fragShader = attachShader(gl.FRAGMENT_SHADER, (_shader_frag_glsl__WEBPACK_IMPORTED_MODULE_1___default().sourceCode));\n        gl.linkProgram(program);\n        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {\n            throw Error(`Shader linking error: ${gl.getProgramInfoLog(program)}`);\n        }\n        this.dimensionsUniform = gl.getUniformLocation(program, (_shader_vert_glsl__WEBPACK_IMPORTED_MODULE_0___default().uniforms).dimensions.variableName);\n        this.charsPerRowUniform = gl.getUniformLocation(program, (_shader_vert_glsl__WEBPACK_IMPORTED_MODULE_0___default().uniforms).charsPerRow.variableName);\n        this.cellTextureSizeUniform = gl.getUniformLocation(program, (_shader_vert_glsl__WEBPACK_IMPORTED_MODULE_0___default().uniforms).cellTextureSize.variableName);\n        this.colorsUniform = gl.getUniformLocation(program, (_shader_frag_glsl__WEBPACK_IMPORTED_MODULE_1___default().uniforms).colors.variableName);\n        this.textCtx = new OffscreenCanvas(0, 0).getContext(\"2d\", { alpha: false });\n        const textTexture = this.textTexture = gl.createTexture();\n        gl.bindTexture(gl.TEXTURE_2D, textTexture);\n        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);\n        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);\n        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);\n        this.coordsArrayBuffer = new Uint32Array(CELL_BUFFER_MAX_LIMIT);\n        this.coordsVBO = gl.createBuffer();\n        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsVBO);\n        gl.bufferData(gl.ARRAY_BUFFER, CELL_BUFFER_MAX_LIMIT * 4, gl.DYNAMIC_DRAW);\n        this.vertDataArrayBuffer = new Uint32Array(CELL_BUFFER_MAX_LIMIT);\n        this.vertDataVBO = gl.createBuffer();\n        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertDataVBO);\n        gl.bufferData(gl.ARRAY_BUFFER, CELL_BUFFER_MAX_LIMIT * 4, gl.DYNAMIC_DRAW);\n        this.cornerIndexVBO = gl.createBuffer();\n        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerIndexVBO);\n        gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([0b11, 0b01, 0b10, 0b00]), gl.STATIC_DRAW);\n        gl.useProgram(this.program);\n        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsVBO);\n        gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_INT, 4, 0);\n        gl.bindBuffer(gl.ARRAY_BUFFER, null);\n        gl.vertexAttribDivisor(0, 1);\n        gl.enableVertexAttribArray(0);\n        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertDataVBO);\n        gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_INT, 4, 0);\n        gl.bindBuffer(gl.ARRAY_BUFFER, null);\n        gl.vertexAttribDivisor(1, 1);\n        gl.enableVertexAttribArray(1);\n        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerIndexVBO);\n        gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_BYTE, 0, 0);\n        gl.enableVertexAttribArray(2);\n        this.handleResize();\n    }\n    handleResize() {\n        const MAX_CHAR = 127;\n        const FONT_SIZE = 16;\n        const numChars = MAX_CHAR - 32;\n        // rerender buffer\n        const ctx = this.textCtx, gl = this.gl;\n        const pixelRatio = devicePixelRatio;\n        ctx.font = `${FONT_SIZE}px monospace`;\n        const TEXT_ASPECT_RATIO = 2.2;\n        const textMetrics = ctx.measureText(\"a\");\n        const textWidth = textMetrics.width, textHeight = textWidth * TEXT_ASPECT_RATIO;\n        const textBaseline = textMetrics.fontBoundingBoxDescent;\n        const realTextWidth = textWidth * pixelRatio, realTextHeight = textHeight * pixelRatio;\n        if (realTextWidth !== this.prevTextWidth || realTextHeight !== this.prevTextHeight) {\n            gl.useProgram(this.program);\n            // find optimal power-of-two dimensions\n            let finalTextureWidth = Infinity, finalTextureHeight = Infinity;\n            for (let testTextureWidth = 4096; testTextureWidth > 8; testTextureWidth >>= 1) {\n                let numColumns = Math.floor(testTextureWidth / realTextWidth);\n                let numRows = Math.ceil(numChars / numColumns);\n                if (numColumns === 0 || numRows === 0)\n                    continue;\n                // smallest power of 2 greater than numRows * realTextHeight\n                let testTextureHeight = 1 << 32 - Math.clz32(numRows * realTextHeight - 1);\n                if (testTextureWidth * testTextureHeight < finalTextureWidth * finalTextureHeight) {\n                    finalTextureWidth = testTextureWidth;\n                    finalTextureHeight = testTextureHeight;\n                }\n            }\n            this.textCtx.canvas.width = finalTextureWidth;\n            this.textCtx.canvas.height = finalTextureHeight;\n            ctx.font = `${pixelRatio * FONT_SIZE}px monospace`;\n            const numCharColumns = Math.floor(finalTextureWidth / realTextWidth);\n            const numCharRows = Math.ceil(numChars / numCharColumns);\n            gl.uniform1ui(this.charsPerRowUniform, numCharColumns);\n            ctx.fillStyle = \"#fff\";\n            for (let i = 0; i <= numChars; i++) {\n                const canvasX = i % numCharColumns * realTextWidth, canvasY = Math.floor(i / numCharColumns) * realTextHeight;\n                ctx.save();\n                ctx.beginPath();\n                ctx.rect(canvasX, canvasY, realTextWidth, realTextHeight);\n                ctx.clip();\n                ctx.fillText(String.fromCharCode(32 + i), canvasX, canvasY + realTextHeight - textBaseline * pixelRatio);\n                ctx.restore();\n            }\n            window.openTextCanvas = () => {\n                ctx.canvas.convertToBlob().then(blob => window.open(URL.createObjectURL(blob)));\n            };\n            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, finalTextureWidth, finalTextureHeight, 0, gl.RED, gl.UNSIGNED_BYTE, this.textCtx.canvas);\n            gl.uniform2f(this.cellTextureSizeUniform, realTextWidth / finalTextureWidth, realTextHeight / finalTextureHeight);\n            this.prevTextWidth = realTextWidth;\n            this.prevTextHeight = realTextHeight;\n        }\n        // resize the main canvas\n        const canvas = gl.canvas;\n        const numRows = Math.floor(innerHeight / textHeight);\n        const numColumns = Math.floor(innerWidth / textWidth);\n        const newCanvasWidth = numColumns * textWidth, newCanvasHeight = numRows * textHeight;\n        if (numRows !== this.numRows || numColumns !== this.numColumns) {\n            const cells = this.cells;\n            const prevLength = cells.length;\n            cells.length = numRows * numColumns;\n            if (cells.length > prevLength) {\n                for (let i = prevLength; i < cells.length; i++) {\n                    cells[i] = {\n                        backgroundIndex: 0,\n                        foregroundIndex: 0,\n                        charIndex: 32,\n                    };\n                }\n            }\n            gl.uniform1ui(this.dimensionsUniform, numColumns << 16 | numRows);\n            this.numRows = numRows;\n            this.numColumns = numColumns;\n        }\n        if (innerWidth !== canvas.width || innerHeight !== canvas.height) {\n            canvas.width = innerWidth * pixelRatio;\n            canvas.height = innerHeight * pixelRatio;\n            if (canvas instanceof HTMLCanvasElement) {\n                canvas.style.width = innerWidth + \"px\";\n                canvas.style.height = innerHeight + \"px\";\n            }\n            gl.viewport((innerWidth - newCanvasWidth) * pixelRatio / 2, (innerHeight - newCanvasHeight) * pixelRatio / 2, newCanvasWidth * pixelRatio, newCanvasHeight * pixelRatio);\n            this.redrawEverything();\n        }\n    }\n    queueCell(x, y, cell) {\n        let cellIndex = this.numCellsToDraw;\n        if (cellIndex === CELL_BUFFER_MAX_LIMIT) {\n            this.flush();\n            cellIndex = 0;\n        }\n        const { foregroundIndex, backgroundIndex, charIndex } = cell;\n        this.coordsArrayBuffer[cellIndex] = x << 16 | y;\n        this.vertDataArrayBuffer[cellIndex] = backgroundIndex << 16 | foregroundIndex << 8 | charIndex - 32;\n        this.numCellsToDraw++;\n    }\n    redrawEverything() {\n        for (let i = 0; i < this.cells.length; i++) {\n            this.queueCell(i % this.numColumns, Math.floor(i / this.numColumns), this.cells[i]);\n        }\n        this.flush();\n    }\n    flush() {\n        if (this.numCellsToDraw === 0)\n            return;\n        const gl = this.gl;\n        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsVBO);\n        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.coordsArrayBuffer, 0, this.numCellsToDraw);\n        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertDataVBO);\n        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertDataArrayBuffer, 0, this.numCellsToDraw);\n        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.numCellsToDraw);\n        this.numCellsToDraw = 0;\n    }\n    delete() {\n        const gl = this.gl;\n        gl.deleteShader(this.vertShader);\n        gl.deleteShader(this.fragShader);\n        gl.deleteProgram(this.program);\n        gl.deleteTexture(this.textTexture);\n        gl.deleteBuffer(this.coordsVBO);\n        gl.deleteBuffer(this.vertDataVBO);\n        gl.deleteBuffer(this.cornerIndexVBO);\n    }\n    setTheme(theme) {\n        const arr = new Float32Array(theme.length * 3);\n        for (let i = 0; i < theme.length; i++) {\n            arr[i * 3] = theme[i][0] / 255.0;\n            arr[i * 3 + 1] = theme[i][1] / 255.0;\n            arr[i * 3 + 2] = theme[i][2] / 255.0;\n        }\n        this.gl.uniform3fv(this.colorsUniform, arr, 0, theme.length * 3);\n    }\n}\n\n\n//# sourceURL=webpack://xtermjs-fireworks/./src/gl.ts?");

/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _gl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./gl */ \"./src/gl.ts\");\n/* harmony import */ var _themes__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./themes */ \"./src/themes.ts\");\n/* harmony import */ var _pkg_index__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../pkg/index */ \"../pkg/index.js\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_pkg_index__WEBPACK_IMPORTED_MODULE_2__]);\n_pkg_index__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\nconst canvas = document.getElementById(\"fireworks\");\ncanvas.removeAttribute(\"style\");\nconst fireworksCanvas = new _gl__WEBPACK_IMPORTED_MODULE_0__.TextGl(canvas.getContext(\"webgl2\", { preserveDrawingBuffer: true, alpha: false }));\n(0,_pkg_index__WEBPACK_IMPORTED_MODULE_2__.seed_rand)(crypto.getRandomValues(new BigUint64Array(1))[0]);\nconst fireworks = new _pkg_index__WEBPACK_IMPORTED_MODULE_2__.Fireworks(fireworksCanvas.numColumns, fireworksCanvas.numRows);\nlet resizeTimeout = null;\naddEventListener(\"resize\", () => {\n    if (resizeTimeout !== null) {\n        clearTimeout(resizeTimeout);\n    }\n    resizeTimeout = window.setTimeout(() => {\n        resizeTimeout = null;\n        fireworksCanvas.handleResize();\n        fireworks.handle_resize(fireworksCanvas.numColumns, fireworksCanvas.numRows);\n    }, 20);\n});\naddEventListener(\"keypress\", console.log);\napplyTheme(_themes__WEBPACK_IMPORTED_MODULE_1__[\"default\"][\"vscode-dark\"]);\nlet lastTime = null;\nfunction draw(timestamp) {\n    timestamp = timestamp !== null && timestamp !== void 0 ? timestamp : performance.now();\n    let delta = 0;\n    if (lastTime !== null)\n        delta = (timestamp - lastTime) / 1000;\n    lastTime = timestamp;\n    fireworks.update_and_render(delta);\n    for (const change of fireworks.get_renderer_changes()) {\n        const coords = Number(change >> BigInt(32));\n        const data = Number(change & BigInt(0xffffffff));\n        fireworksCanvas.queueCell(coords >> 16, coords & 0xffff, {\n            backgroundIndex: data >> 16,\n            foregroundIndex: data >> 8 & 0xff,\n            charIndex: data & 0xff,\n        });\n    }\n    fireworksCanvas.flush();\n    requestAnimationFrame(draw);\n}\nrequestAnimationFrame(draw);\n// setInterval(draw, 1000 / 3);\nfunction applyTheme(theme) {\n    const colorOrder = [\n        \"black\",\n        \"red\",\n        \"darkRed\",\n        \"green\",\n        \"darkGreen\",\n        \"yellow\",\n        \"darkYellow\",\n        \"blue\",\n        \"darkBlue\",\n        \"magenta\",\n        \"darkMagenta\",\n        \"cyan\",\n        \"darkCyan\",\n        \"grey\",\n        \"darkGrey\",\n        \"white\",\n    ];\n    const colors = [];\n    for (const color of colorOrder) {\n        const hex = parseInt(theme[color].substring(1), 16);\n        colors.push([hex >> 16, hex >> 8 & 0xff, hex & 0xff]);\n    }\n    fireworksCanvas.setTheme(colors);\n    fireworksCanvas.redrawEverything();\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });\n\n//# sourceURL=webpack://xtermjs-fireworks/./src/index.ts?");

/***/ }),

/***/ "./src/themes.ts":
/*!***********************!*\
  !*** ./src/themes.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({\n    \"vscode-dark\": {\n        \"black\": \"#151515\",\n        \"darkGrey\": \"#505050\",\n        \"blue\": \"#6A9FB5\",\n        \"cyan\": \"#75B5AA\",\n        \"green\": \"#90A959\",\n        \"magenta\": \"#AA759F\",\n        \"red\": \"#AC4142\",\n        \"white\": \"#F5F5F5\",\n        \"yellow\": \"#F4BF75\",\n        \"darkBlue\": \"#6A9FB5\",\n        \"darkCyan\": \"#75B5AA\",\n        \"darkGreen\": \"#90A959\",\n        \"darkMagenta\": \"#AA759F\",\n        \"darkRed\": \"#AC4142\",\n        \"grey\": \"#D0D0D0\",\n        \"darkYellow\": \"#F4BF75\"\n    }\n});\n\n\n//# sourceURL=webpack://xtermjs-fireworks/./src/themes.ts?");

/***/ }),

/***/ "./src/shader/frag.glsl":
/*!******************************!*\
  !*** ./src/shader/frag.glsl ***!
  \******************************/
/***/ ((module) => {

eval("module.exports = {sourceCode:\"#version 300 es\\nprecision mediump float;precision highp int;flat in mediump uint fragData;in vec2 fragUV;out vec4 fragColor;uniform sampler2D charTexture;uniform vec3 colors[256];void main(){float alpha=texture(charTexture,fragUV).r;fragColor=vec4(mix(colors[fragData>>8],colors[fragData&0xffu],alpha),1.0f);}\",uniforms:{charTexture:{variableType:\"sampler2D\",variableName:\"charTexture\"},colors:{variableType:\"vec3\",variableName:\"colors\"}},consts:{}}\n\n//# sourceURL=webpack://xtermjs-fireworks/./src/shader/frag.glsl?");

/***/ }),

/***/ "./src/shader/vert.glsl":
/*!******************************!*\
  !*** ./src/shader/vert.glsl ***!
  \******************************/
/***/ ((module) => {

eval("module.exports = {sourceCode:\"#version 300 es\\nprecision mediump float;precision highp int;uniform uint dimensions;uniform mediump uint charsPerRow;uniform vec2 cellTextureSize;layout(location=0)in uint A;layout(location=1)in uint B;layout(location=2)in lowp uint C;flat out mediump uint fragData;out vec2 fragUV;void main(){uint width=dimensions>>16,height=dimensions&0xffffu;uint x=(A>>16)+(C&1u),y=(A&0xffffu)+(C>>1);gl_Position=vec4(float(x)/float(width)*2.0f-1.0f,1.0f-float(y)/float(height)*2.0f,0.0f,1.0f);fragData=B>>8;uint charIndex=B&0xffu;fragUV=vec2(charIndex%charsPerRow+(C&1u),charIndex/charsPerRow+(C>>1))*cellTextureSize;}\",uniforms:{dimensions:{variableType:\"uint\",variableName:\"dimensions\"},charsPerRow:{variableType:\"uint\",variableName:\"charsPerRow\"},cellTextureSize:{variableType:\"vec2\",variableName:\"cellTextureSize\"}},consts:{}}\n\n//# sourceURL=webpack://xtermjs-fireworks/./src/shader/vert.glsl?");

/***/ }),

/***/ "../pkg/index.js":
/*!***********************!*\
  !*** ../pkg/index.js ***!
  \***********************/
/***/ ((__webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(__webpack_module__, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   Fireworks: () => (/* reexport safe */ _index_bg_js__WEBPACK_IMPORTED_MODULE_0__.Fireworks),\n/* harmony export */   __wbg_error_f851667af71bcfc6: () => (/* reexport safe */ _index_bg_js__WEBPACK_IMPORTED_MODULE_0__.__wbg_error_f851667af71bcfc6),\n/* harmony export */   __wbg_new_abda76e883ba8a5f: () => (/* reexport safe */ _index_bg_js__WEBPACK_IMPORTED_MODULE_0__.__wbg_new_abda76e883ba8a5f),\n/* harmony export */   __wbg_set_wasm: () => (/* reexport safe */ _index_bg_js__WEBPACK_IMPORTED_MODULE_0__.__wbg_set_wasm),\n/* harmony export */   __wbg_stack_658279fe44541cf6: () => (/* reexport safe */ _index_bg_js__WEBPACK_IMPORTED_MODULE_0__.__wbg_stack_658279fe44541cf6),\n/* harmony export */   __wbindgen_object_drop_ref: () => (/* reexport safe */ _index_bg_js__WEBPACK_IMPORTED_MODULE_0__.__wbindgen_object_drop_ref),\n/* harmony export */   __wbindgen_throw: () => (/* reexport safe */ _index_bg_js__WEBPACK_IMPORTED_MODULE_0__.__wbindgen_throw),\n/* harmony export */   seed_rand: () => (/* reexport safe */ _index_bg_js__WEBPACK_IMPORTED_MODULE_0__.seed_rand),\n/* harmony export */   start: () => (/* reexport safe */ _index_bg_js__WEBPACK_IMPORTED_MODULE_0__.start)\n/* harmony export */ });\n/* harmony import */ var _index_bg_wasm__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./index_bg.wasm */ \"../pkg/index_bg.wasm\");\n/* harmony import */ var _index_bg_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./index_bg.js */ \"../pkg/index_bg.js\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_index_bg_wasm__WEBPACK_IMPORTED_MODULE_1__]);\n_index_bg_wasm__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n(0,_index_bg_js__WEBPACK_IMPORTED_MODULE_0__.__wbg_set_wasm)(_index_bg_wasm__WEBPACK_IMPORTED_MODULE_1__);\n\n\n_index_bg_wasm__WEBPACK_IMPORTED_MODULE_1__.__wbindgen_start();\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });\n\n//# sourceURL=webpack://xtermjs-fireworks/../pkg/index.js?");

/***/ }),

/***/ "../pkg/index_bg.js":
/*!**************************!*\
  !*** ../pkg/index_bg.js ***!
  \**************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   Fireworks: () => (/* binding */ Fireworks),\n/* harmony export */   __wbg_error_f851667af71bcfc6: () => (/* binding */ __wbg_error_f851667af71bcfc6),\n/* harmony export */   __wbg_new_abda76e883ba8a5f: () => (/* binding */ __wbg_new_abda76e883ba8a5f),\n/* harmony export */   __wbg_set_wasm: () => (/* binding */ __wbg_set_wasm),\n/* harmony export */   __wbg_stack_658279fe44541cf6: () => (/* binding */ __wbg_stack_658279fe44541cf6),\n/* harmony export */   __wbindgen_object_drop_ref: () => (/* binding */ __wbindgen_object_drop_ref),\n/* harmony export */   __wbindgen_throw: () => (/* binding */ __wbindgen_throw),\n/* harmony export */   seed_rand: () => (/* binding */ seed_rand),\n/* harmony export */   start: () => (/* binding */ start)\n/* harmony export */ });\nlet wasm;\nfunction __wbg_set_wasm(val) {\n    wasm = val;\n}\n\n\nconst heap = new Array(128).fill(undefined);\n\nheap.push(undefined, null, true, false);\n\nfunction getObject(idx) { return heap[idx]; }\n\nlet heap_next = heap.length;\n\nfunction dropObject(idx) {\n    if (idx < 132) return;\n    heap[idx] = heap_next;\n    heap_next = idx;\n}\n\nfunction takeObject(idx) {\n    const ret = getObject(idx);\n    dropObject(idx);\n    return ret;\n}\n\nconst lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;\n\nlet cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });\n\ncachedTextDecoder.decode();\n\nlet cachedUint8Memory0 = null;\n\nfunction getUint8Memory0() {\n    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {\n        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);\n    }\n    return cachedUint8Memory0;\n}\n\nfunction getStringFromWasm0(ptr, len) {\n    ptr = ptr >>> 0;\n    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));\n}\n\nfunction _assertBigInt(n) {\n    if (typeof(n) !== 'bigint') throw new Error(`expected a bigint argument, found ${typeof(n)}`);\n}\n/**\n* @param {bigint} seed\n*/\nfunction seed_rand(seed) {\n    _assertBigInt(seed);\n    wasm.seed_rand(seed);\n}\n\nfunction _assertNum(n) {\n    if (typeof(n) !== 'number') throw new Error(`expected a number argument, found ${typeof(n)}`);\n}\n\nlet cachedInt32Memory0 = null;\n\nfunction getInt32Memory0() {\n    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {\n        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);\n    }\n    return cachedInt32Memory0;\n}\n\nlet cachedBigUint64Memory0 = null;\n\nfunction getBigUint64Memory0() {\n    if (cachedBigUint64Memory0 === null || cachedBigUint64Memory0.byteLength === 0) {\n        cachedBigUint64Memory0 = new BigUint64Array(wasm.memory.buffer);\n    }\n    return cachedBigUint64Memory0;\n}\n\nfunction getArrayU64FromWasm0(ptr, len) {\n    ptr = ptr >>> 0;\n    return getBigUint64Memory0().subarray(ptr / 8, ptr / 8 + len);\n}\n\nfunction _assertChar(c) {\n    if (typeof(c) === 'number' && (c >= 0x110000 || (c >= 0xD800 && c < 0xE000))) throw new Error(`expected a valid Unicode scalar value, found ${c}`);\n}\n/**\n*/\nfunction start() {\n    wasm.start();\n}\n\nfunction logError(f, args) {\n    try {\n        return f.apply(this, args);\n    } catch (e) {\n        let error = (function () {\n            try {\n                return e instanceof Error ? `${e.message}\\n\\nStack:\\n${e.stack}` : e.toString();\n            } catch(_) {\n                return \"<failed to stringify thrown value>\";\n            }\n        }());\n        console.error(\"wasm-bindgen: imported JS function that was not marked as `catch` threw an error:\", error);\n        throw e;\n    }\n}\n\nfunction addHeapObject(obj) {\n    if (heap_next === heap.length) heap.push(heap.length + 1);\n    const idx = heap_next;\n    heap_next = heap[idx];\n\n    if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');\n\n    heap[idx] = obj;\n    return idx;\n}\n\nlet WASM_VECTOR_LEN = 0;\n\nconst lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;\n\nlet cachedTextEncoder = new lTextEncoder('utf-8');\n\nconst encodeString = (typeof cachedTextEncoder.encodeInto === 'function'\n    ? function (arg, view) {\n    return cachedTextEncoder.encodeInto(arg, view);\n}\n    : function (arg, view) {\n    const buf = cachedTextEncoder.encode(arg);\n    view.set(buf);\n    return {\n        read: arg.length,\n        written: buf.length\n    };\n});\n\nfunction passStringToWasm0(arg, malloc, realloc) {\n\n    if (typeof(arg) !== 'string') throw new Error(`expected a string argument, found ${typeof(arg)}`);\n\n    if (realloc === undefined) {\n        const buf = cachedTextEncoder.encode(arg);\n        const ptr = malloc(buf.length, 1) >>> 0;\n        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);\n        WASM_VECTOR_LEN = buf.length;\n        return ptr;\n    }\n\n    let len = arg.length;\n    let ptr = malloc(len, 1) >>> 0;\n\n    const mem = getUint8Memory0();\n\n    let offset = 0;\n\n    for (; offset < len; offset++) {\n        const code = arg.charCodeAt(offset);\n        if (code > 0x7F) break;\n        mem[ptr + offset] = code;\n    }\n\n    if (offset !== len) {\n        if (offset !== 0) {\n            arg = arg.slice(offset);\n        }\n        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;\n        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);\n        const ret = encodeString(arg, view);\n        if (ret.read !== arg.length) throw new Error('failed to pass whole string');\n        offset += ret.written;\n        ptr = realloc(ptr, len, offset, 1) >>> 0;\n    }\n\n    WASM_VECTOR_LEN = offset;\n    return ptr;\n}\n\nconst FireworksFinalization = (typeof FinalizationRegistry === 'undefined')\n    ? { register: () => {}, unregister: () => {} }\n    : new FinalizationRegistry(ptr => wasm.__wbg_fireworks_free(ptr >>> 0));\n/**\n*/\nclass Fireworks {\n\n    __destroy_into_raw() {\n        const ptr = this.__wbg_ptr;\n        this.__wbg_ptr = 0;\n        FireworksFinalization.unregister(this);\n        return ptr;\n    }\n\n    free() {\n        const ptr = this.__destroy_into_raw();\n        wasm.__wbg_fireworks_free(ptr);\n    }\n    /**\n    * @param {number} width\n    * @param {number} height\n    */\n    constructor(width, height) {\n        _assertNum(width);\n        _assertNum(height);\n        const ret = wasm.fireworks_new(width, height);\n        this.__wbg_ptr = ret >>> 0;\n        return this;\n    }\n    /**\n    * @param {number} frame_time\n    */\n    update_and_render(frame_time) {\n        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');\n        _assertNum(this.__wbg_ptr);\n        wasm.fireworks_update_and_render(this.__wbg_ptr, frame_time);\n    }\n    /**\n    * @returns {BigUint64Array}\n    */\n    get_renderer_changes() {\n        try {\n            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');\n            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);\n            _assertNum(this.__wbg_ptr);\n            wasm.fireworks_get_renderer_changes(retptr, this.__wbg_ptr);\n            var r0 = getInt32Memory0()[retptr / 4 + 0];\n            var r1 = getInt32Memory0()[retptr / 4 + 1];\n            var v1 = getArrayU64FromWasm0(r0, r1).slice();\n            wasm.__wbindgen_free(r0, r1 * 8, 8);\n            return v1;\n        } finally {\n            wasm.__wbindgen_add_to_stack_pointer(16);\n        }\n    }\n    /**\n    * @param {number} width\n    * @param {number} height\n    */\n    handle_resize(width, height) {\n        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');\n        _assertNum(this.__wbg_ptr);\n        _assertNum(width);\n        _assertNum(height);\n        wasm.fireworks_handle_resize(this.__wbg_ptr, width, height);\n    }\n    /**\n    * @param {string} key\n    */\n    handle_key(key) {\n        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');\n        _assertNum(this.__wbg_ptr);\n        const char0 = key.codePointAt(0);\n        _assertChar(char0);\n        wasm.fireworks_handle_key(this.__wbg_ptr, char0);\n    }\n}\n\nfunction __wbg_error_f851667af71bcfc6() { return logError(function (arg0, arg1) {\n    let deferred0_0;\n    let deferred0_1;\n    try {\n        deferred0_0 = arg0;\n        deferred0_1 = arg1;\n        console.error(getStringFromWasm0(arg0, arg1));\n    } finally {\n        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);\n    }\n}, arguments) };\n\nfunction __wbg_new_abda76e883ba8a5f() { return logError(function () {\n    const ret = new Error();\n    return addHeapObject(ret);\n}, arguments) };\n\nfunction __wbg_stack_658279fe44541cf6() { return logError(function (arg0, arg1) {\n    const ret = getObject(arg1).stack;\n    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);\n    const len1 = WASM_VECTOR_LEN;\n    getInt32Memory0()[arg0 / 4 + 1] = len1;\n    getInt32Memory0()[arg0 / 4 + 0] = ptr1;\n}, arguments) };\n\nfunction __wbindgen_object_drop_ref(arg0) {\n    takeObject(arg0);\n};\n\nfunction __wbindgen_throw(arg0, arg1) {\n    throw new Error(getStringFromWasm0(arg0, arg1));\n};\n\n\n\n//# sourceURL=webpack://xtermjs-fireworks/../pkg/index_bg.js?");

/***/ }),

/***/ "../pkg/index_bg.wasm":
/*!****************************!*\
  !*** ../pkg/index_bg.wasm ***!
  \****************************/
/***/ ((module, exports, __webpack_require__) => {

"use strict";
eval("/* harmony import */ var WEBPACK_IMPORTED_MODULE_0 = __webpack_require__(/*! ./index_bg.js */ \"../pkg/index_bg.js\");\nmodule.exports = __webpack_require__.v(exports, module.id, \"a9399888e8d26c5cbad5\", {\n\t\"./index_bg.js\": {\n\t\t\"__wbg_error_f851667af71bcfc6\": WEBPACK_IMPORTED_MODULE_0.__wbg_error_f851667af71bcfc6,\n\t\t\"__wbg_new_abda76e883ba8a5f\": WEBPACK_IMPORTED_MODULE_0.__wbg_new_abda76e883ba8a5f,\n\t\t\"__wbg_stack_658279fe44541cf6\": WEBPACK_IMPORTED_MODULE_0.__wbg_stack_658279fe44541cf6,\n\t\t\"__wbindgen_object_drop_ref\": WEBPACK_IMPORTED_MODULE_0.__wbindgen_object_drop_ref,\n\t\t\"__wbindgen_throw\": WEBPACK_IMPORTED_MODULE_0.__wbindgen_throw\n\t}\n});\n\n//# sourceURL=webpack://xtermjs-fireworks/../pkg/index_bg.wasm?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/async module */
/******/ 	(() => {
/******/ 		var webpackQueues = typeof Symbol === "function" ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 		var webpackExports = typeof Symbol === "function" ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 		var webpackError = typeof Symbol === "function" ? Symbol("webpack error") : "__webpack_error__";
/******/ 		var resolveQueue = (queue) => {
/******/ 			if(queue && queue.d < 1) {
/******/ 				queue.d = 1;
/******/ 				queue.forEach((fn) => (fn.r--));
/******/ 				queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 			}
/******/ 		}
/******/ 		var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 				if(dep[webpackQueues]) return dep;
/******/ 				if(dep.then) {
/******/ 					var queue = [];
/******/ 					queue.d = 0;
/******/ 					dep.then((r) => {
/******/ 						obj[webpackExports] = r;
/******/ 						resolveQueue(queue);
/******/ 					}, (e) => {
/******/ 						obj[webpackError] = e;
/******/ 						resolveQueue(queue);
/******/ 					});
/******/ 					var obj = {};
/******/ 					obj[webpackQueues] = (fn) => (fn(queue));
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			var ret = {};
/******/ 			ret[webpackQueues] = x => {};
/******/ 			ret[webpackExports] = dep;
/******/ 			return ret;
/******/ 		}));
/******/ 		__webpack_require__.a = (module, body, hasAwait) => {
/******/ 			var queue;
/******/ 			hasAwait && ((queue = []).d = -1);
/******/ 			var depQueues = new Set();
/******/ 			var exports = module.exports;
/******/ 			var currentDeps;
/******/ 			var outerResolve;
/******/ 			var reject;
/******/ 			var promise = new Promise((resolve, rej) => {
/******/ 				reject = rej;
/******/ 				outerResolve = resolve;
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 			module.exports = promise;
/******/ 			body((deps) => {
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				var fn;
/******/ 				var getResult = () => (currentDeps.map((d) => {
/******/ 					if(d[webpackError]) throw d[webpackError];
/******/ 					return d[webpackExports];
/******/ 				}))
/******/ 				var promise = new Promise((resolve) => {
/******/ 					fn = () => (resolve(getResult));
/******/ 					fn.r = 0;
/******/ 					var fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 					currentDeps.map((dep) => (dep[webpackQueues](fnQueue)));
/******/ 				});
/******/ 				return fn.r ? promise : getResult();
/******/ 			}, (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue)));
/******/ 			queue && queue.d < 0 && (queue.d = 0);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/wasm loading */
/******/ 	(() => {
/******/ 		__webpack_require__.v = (exports, wasmModuleId, wasmModuleHash, importsObj) => {
/******/ 			var req = fetch(__webpack_require__.p + "" + wasmModuleHash + ".module.wasm");
/******/ 			var fallback = () => (req
/******/ 				.then((x) => (x.arrayBuffer()))
/******/ 				.then((bytes) => (WebAssembly.instantiate(bytes, importsObj)))
/******/ 				.then((res) => (Object.assign(exports, res.instance.exports))));
/******/ 			return req.then((res) => {
/******/ 				if (typeof WebAssembly.instantiateStreaming === "function") {
/******/ 					return WebAssembly.instantiateStreaming(res, importsObj)
/******/ 						.then(
/******/ 							(res) => (Object.assign(exports, res.instance.exports)),
/******/ 							(e) => {
/******/ 								if(res.headers.get("Content-Type") !== "application/wasm") {
/******/ 									console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
/******/ 									return fallback();
/******/ 								}
/******/ 								throw e;
/******/ 							}
/******/ 						);
/******/ 				}
/******/ 				return fallback();
/******/ 			});
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.ts");
/******/ 	
/******/ })()
;