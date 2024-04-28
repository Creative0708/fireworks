import vertShader from "./shader/vert.glsl";
import fragShader from "./shader/frag.glsl";

const CELL_BUFFER_MAX_LIMIT = 1024;

export interface Cell {
    backgroundIndex: number;
    foregroundIndex: number;
    charIndex: number;
}

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

    private dimensionsUniform: WebGLUniformLocation;
    private charsPerRowUniform: WebGLUniformLocation;
    private cellTextureSizeUniform: WebGLUniformLocation;

    private cornerIndexVBO: WebGLBuffer;

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

        this.textCtx = new OffscreenCanvas(0, 0).getContext("2d", { alpha: false });
        const textTexture = this.textTexture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, textTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.coordsArrayBuffer = new Uint32Array(CELL_BUFFER_MAX_LIMIT);
        this.coordsVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsVBO);
        gl.bufferData(gl.ARRAY_BUFFER, CELL_BUFFER_MAX_LIMIT, gl.DYNAMIC_DRAW);

        this.vertDataArrayBuffer = new Uint32Array(CELL_BUFFER_MAX_LIMIT);
        this.vertDataVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertDataVBO);
        gl.bufferData(gl.ARRAY_BUFFER, CELL_BUFFER_MAX_LIMIT, gl.DYNAMIC_DRAW);

        this.cornerIndexVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerIndexVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([
            0b00,
            0b01,
            0b10,
            0b11,
        ]), gl.STATIC_DRAW);

        this.handleResize();
    }

    handleResize() {
        // rerender buffer
        const ctx = this.textCtx, gl = this.gl;

        ctx.font = "1em 'Consolas', 'Courier New', Courier, monospace";
        const TEXT_ASPECT_RATIO = 2.0;
        const textWidth = Math.round(ctx.measureText("a").width), textHeight = textWidth * TEXT_ASPECT_RATIO;

        if (textWidth !== this.prevTextWidth || textHeight !== this.prevTextHeight) {

            gl.useProgram(this.program);

            const MAX_CHAR = 127;
            const numChars = MAX_CHAR - 32;
            // find optimal power-of-two dimensions
            let finalTextureWidth = Infinity, finalTextureHeight = Infinity;
            for (let testTextureWidth = 4096; testTextureWidth > 8; testTextureWidth >>= 1) {
                let numColumns = Math.ceil(testTextureWidth / textWidth);
                let numRows = Math.ceil(numChars / numColumns);
                if (numColumns === 0 || numRows === 0)
                    continue;

                let testTextureHeight = 1 << 31 - Math.clz32(numRows * textHeight - 1);
                if (testTextureWidth * testTextureHeight < finalTextureWidth * finalTextureHeight) {
                    finalTextureWidth = testTextureWidth; finalTextureHeight = testTextureHeight;
                }
            }

            this.textCtx.canvas.width = finalTextureWidth; this.textCtx.canvas.height = finalTextureHeight;
            const numCharColumns = Math.ceil(finalTextureWidth / textWidth);
            const numCharRows = Math.ceil(numChars / numCharColumns);

            gl.uniform1ui(this.charsPerRowUniform, numCharColumns);

            ctx.fillStyle = "#fff";
            for (let i = 0; i <= MAX_CHAR; i++) {
                ctx.fillText(String.fromCharCode(32 + i), i % numCharColumns * textWidth, Math.floor(i / numCharColumns) * textHeight);
            }

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, finalTextureWidth, finalTextureHeight, 0, gl.RED, gl.UNSIGNED_BYTE, this.textCtx.canvas);

            this.prevTextWidth = textWidth; this.prevTextHeight = textHeight;

            // resize the main canvas
            const canvas = gl.canvas;
            const numRows = this.numRows = Math.floor(innerWidth / textWidth);
            const numColumns = this.numColumns = Math.floor(innerHeight / textHeight);
            const newCanvasWidth = numRows * textWidth, newCanvasHeight = numColumns * textHeight;

            gl.uniform1ui(this.dimensionsUniform, numColumns << 16 | numRows);

            const cells = this.cells;
            const prevLength = cells.length;
            cells.length = numRows * numColumns;
            if (cells.length > prevLength) {
                for (let i = prevLength; i < cells.length; i++) {
                    cells[i] = {
                        backgroundIndex: 0,
                        foregroundIndex: 0,
                        charIndex: 0,
                    };
                }
            }

            if (newCanvasWidth !== canvas.width || newCanvasHeight !== canvas.height) {
                canvas.width = newCanvasWidth; canvas.height = newCanvasHeight;
                gl.uniform2f(this.cellTextureSizeUniform, textWidth / newCanvasHeight, textHeight / newCanvasHeight);

                this.redrawEverything();
            }

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
        this.vertDataArrayBuffer[cellIndex] = foregroundIndex << 16 | backgroundIndex << 8 | charIndex;

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
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsVBO);
        gl.bufferData(gl.ARRAY_BUFFER, this.coordsArrayBuffer, gl.DYNAMIC_DRAW);
        gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_INT, 4, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.vertexAttribDivisor(0, 1);
        gl.enableVertexAttribArray(0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertDataVBO);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertDataArrayBuffer, gl.DYNAMIC_DRAW);
        gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_INT, 4, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerIndexVBO);
        gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_BYTE, 1, 0);
        gl.enableVertexAttribArray(2);


        console.log(this.coordsArrayBuffer.slice(0, this.numCellsToDraw));
        console.log(this.vertDataArrayBuffer.slice(0, this.numCellsToDraw));
        console.log(this.numCellsToDraw);


        // gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 6, this.numCellsToDraw);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 1);

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
}
