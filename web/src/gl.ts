import vertShader from "./shader/vert.glsl";
import fragShader from "./shader/frag.glsl";

const CELL_BUFFER_MAX_LIMIT = 1024;

export interface Cell {
    backgroundIndex: number;
    foregroundIndex: number;
    charIndex: number;
}

export type Color = [number, number, number];

export class TextGl {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram;
    private vertShader: WebGLShader;
    private fragShader: WebGLShader;
    private textCtx: OffscreenCanvasRenderingContext2D;
    private textTexture: WebGLTexture;

    private coordsVBO: WebGLBuffer;
    private coordsArrayBuffer: Uint32Array;
    private vertDataVBO: WebGLBuffer;
    private vertDataArrayBuffer: Uint32Array;
    private cornerIndexVBO: WebGLBuffer;

    private dimensionsUniform: WebGLUniformLocation;
    private charsPerRowUniform: WebGLUniformLocation;
    private cellTextureSizeUniform: WebGLUniformLocation;
    private colorsUniform: WebGLUniformLocation;

    private numCellsToDraw: number = 0;
    private prevTextWidth: number = NaN;
    private prevTextHeight: number = NaN;

    // these shouldn't be modifiable by other classes but there's no way to make
    // "public-readonly but private-writable" fields: https://github.com/microsoft/TypeScript/issues/37487
    // there are workarounds like adding getters and setters but those come at a runtime cost.
    // :(
    public numColumns: number;
    public numRows: number;

    private cells: Cell[] = [];

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;

        const program = this.program = gl.createProgram();

        function attachShader(shaderType: number, source: string): WebGLShader {
            const shader = gl.createShader(shaderType);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw Error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);
            }
            gl.attachShader(program, shader);
            return shader;
        }

        this.vertShader = attachShader(gl.VERTEX_SHADER, vertShader.sourceCode);
        this.fragShader = attachShader(gl.FRAGMENT_SHADER, fragShader.sourceCode);

        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw Error(`Shader linking error: ${gl.getProgramInfoLog(program)}`);
        }

        this.dimensionsUniform = gl.getUniformLocation(program, vertShader.uniforms.dimensions.variableName);
        this.charsPerRowUniform = gl.getUniformLocation(program, vertShader.uniforms.charsPerRow.variableName);
        this.cellTextureSizeUniform = gl.getUniformLocation(program, vertShader.uniforms.cellTextureSize.variableName);
        this.colorsUniform = gl.getUniformLocation(program, fragShader.uniforms.colors.variableName);

        this.textCtx = new OffscreenCanvas(0, 0).getContext("2d", { alpha: false });
        const textTexture = this.textTexture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, textTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.coordsArrayBuffer = new Uint32Array(CELL_BUFFER_MAX_LIMIT);
        this.coordsVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsVBO);
        gl.bufferData(gl.ARRAY_BUFFER, CELL_BUFFER_MAX_LIMIT * 4, gl.DYNAMIC_DRAW);

        this.vertDataArrayBuffer = new Uint32Array(CELL_BUFFER_MAX_LIMIT);
        this.vertDataVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertDataVBO);
        gl.bufferData(gl.ARRAY_BUFFER, CELL_BUFFER_MAX_LIMIT * 4, gl.DYNAMIC_DRAW);

        this.cornerIndexVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerIndexVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([0b11, 0b01, 0b10, 0b00]), gl.STATIC_DRAW);

        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsVBO);
        gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_INT, 4, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.vertexAttribDivisor(0, 1);
        gl.enableVertexAttribArray(0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertDataVBO);
        gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_INT, 4, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerIndexVBO);
        gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_BYTE, 0, 0);
        gl.enableVertexAttribArray(2);

        this.handleResize();
    }

    handleResize() {
        const MAX_CHAR = 127;
        const FONT_SIZE = 24;
        const numChars = MAX_CHAR - 32;

        // rerender buffer
        const ctx = this.textCtx, gl = this.gl;

        const pixelRatio = devicePixelRatio;

        ctx.font = `${FONT_SIZE}px monospace`;
        const TEXT_ASPECT_RATIO = 2.2;
        const textMetrics = ctx.measureText("a");
        const textWidth = textMetrics.width, textHeight = textWidth * TEXT_ASPECT_RATIO;
        const textBaseline = textMetrics.fontBoundingBoxDescent

        const realTextWidth = textWidth * pixelRatio, realTextHeight = textHeight * pixelRatio;

        if (realTextWidth !== this.prevTextWidth || realTextHeight !== this.prevTextHeight) {

            gl.useProgram(this.program);

            // find optimal power-of-two dimensions
            let finalTextureWidth = Infinity, finalTextureHeight = Infinity;
            for (let testTextureWidth = 4096; testTextureWidth > 8; testTextureWidth >>= 1) {
                let numColumns = Math.floor(testTextureWidth / realTextWidth);
                let numRows = Math.ceil(numChars / numColumns);
                if (numColumns === 0 || numRows === 0)
                    continue;

                // smallest power of 2 greater than numRows * realTextHeight
                let testTextureHeight = 1 << 32 - Math.clz32(numRows * realTextHeight - 1);
                if (testTextureWidth * testTextureHeight < finalTextureWidth * finalTextureHeight) {
                    finalTextureWidth = testTextureWidth; finalTextureHeight = testTextureHeight;
                }
            }

            this.textCtx.canvas.width = finalTextureWidth; this.textCtx.canvas.height = finalTextureHeight;
            ctx.font = `${pixelRatio * FONT_SIZE}px monospace`;
            const numCharColumns = Math.floor(finalTextureWidth / realTextWidth);
            const numCharRows = Math.ceil(numChars / numCharColumns);

            gl.uniform1ui(this.charsPerRowUniform, numCharColumns);

            ctx.fillStyle = "#fff";
            for (let i = 0; i <= numChars; i++) {
                const canvasX = i % numCharColumns * realTextWidth, canvasY = Math.floor(i / numCharColumns) * realTextHeight;
                ctx.save();
                ctx.beginPath();
                ctx.rect(canvasX, canvasY, realTextWidth, realTextHeight);
                ctx.clip();

                ctx.fillText(String.fromCharCode(32 + i), canvasX, canvasY + realTextHeight - textBaseline * pixelRatio);
                ctx.restore();
            }

            (window as any).openTextCanvas = () => {
                ctx.canvas.convertToBlob().then(blob => window.open(URL.createObjectURL(blob)));
            };

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, finalTextureWidth, finalTextureHeight, 0, gl.RED, gl.UNSIGNED_BYTE, this.textCtx.canvas);
            gl.uniform2f(this.cellTextureSizeUniform, realTextWidth / finalTextureWidth, realTextHeight / finalTextureHeight);

            this.prevTextWidth = realTextWidth; this.prevTextHeight = realTextHeight;

        }

        // resize the main canvas
        const canvas = gl.canvas;
        const numRows = Math.floor(innerHeight / textHeight);
        const numColumns = Math.floor(innerWidth / textWidth);
        const newCanvasWidth = numColumns * textWidth, newCanvasHeight = numRows * textHeight;

        if (numRows !== this.numRows || numColumns !== this.numColumns) {
            const cells = this.cells;
            const prevLength = cells.length;
            cells.length = numRows * numColumns;
            if (cells.length > prevLength) {
                for (let i = prevLength; i < cells.length; i++) {
                    cells[i] = {
                        backgroundIndex: 0,
                        foregroundIndex: 0,
                        charIndex: 32,
                    };
                }
            }

            gl.uniform1ui(this.dimensionsUniform, numColumns << 16 | numRows);

            this.numRows = numRows;
            this.numColumns = numColumns;
        }

        if (innerWidth !== canvas.width || innerHeight !== canvas.height) {
            canvas.width = innerWidth * pixelRatio; canvas.height = innerHeight * pixelRatio;
            if (canvas instanceof HTMLCanvasElement) {
                canvas.style.width = innerWidth + "px";
                canvas.style.height = innerHeight + "px";
            }
            gl.viewport(
                (innerWidth - newCanvasWidth) * pixelRatio / 2,
                (innerHeight - newCanvasHeight) * pixelRatio / 2,
                newCanvasWidth * pixelRatio,
                newCanvasHeight * pixelRatio);

            this.redrawEverything();
        }

    }

    queueCell(x: number, y: number, cell: Cell) {
        let cellIndex = this.numCellsToDraw;
        if (cellIndex === CELL_BUFFER_MAX_LIMIT) {
            this.flush();
            cellIndex = 0;
        }

        const { foregroundIndex, backgroundIndex, charIndex } = cell;

        this.coordsArrayBuffer[cellIndex] = x << 16 | y;
        this.vertDataArrayBuffer[cellIndex] = backgroundIndex << 16 | foregroundIndex << 8 | charIndex - 32;

        this.numCellsToDraw++;
    }

    redrawEverything() {
        for (let i = 0; i < this.cells.length; i++) {
            this.queueCell(i % this.numColumns, Math.floor(i / this.numColumns), this.cells[i]);
        }
        this.flush();
    }

    flush() {
        if (this.numCellsToDraw === 0)
            return;

        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsVBO);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.coordsArrayBuffer, 0, this.numCellsToDraw);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertDataVBO);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertDataArrayBuffer, 0, this.numCellsToDraw);

        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.numCellsToDraw);

        this.numCellsToDraw = 0;
    }

    delete() {
        const gl = this.gl;
        gl.deleteShader(this.vertShader);
        gl.deleteShader(this.fragShader);
        gl.deleteProgram(this.program);
        gl.deleteTexture(this.textTexture);
        gl.deleteBuffer(this.coordsVBO);
        gl.deleteBuffer(this.vertDataVBO);
        gl.deleteBuffer(this.cornerIndexVBO);
    }

    setTheme(theme: Color[]) {
        const arr = new Float32Array(theme.length * 3);
        for (let i = 0; i < theme.length; i++) {
            arr[i * 3] = theme[i][0] / 255.0;
            arr[i * 3 + 1] = theme[i][1] / 255.0;
            arr[i * 3 + 2] = theme[i][2] / 255.0;
        }
        this.gl.uniform3fv(this.colorsUniform, arr, 0, theme.length * 3);
    }
}
