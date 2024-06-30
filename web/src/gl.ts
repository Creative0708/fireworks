import vertShader from "./shader/vert.glsl";
import fragShader from "./shader/frag.glsl";

const CELL_BUFFER_MAX_LIMIT = 1024;

export type Color = number;

export interface Cell {
    background: number;
    foreground: number;
    char: number,
}

export class TextGl {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram;
    private vertShader: WebGLShader;
    private fragShader: WebGLShader;
    private textCtx: OffscreenCanvasRenderingContext2D;
    private textTexture: WebGLTexture;

    private coordsVBO: WebGLBuffer;
    private vertDataVBO: WebGLBuffer;
    private vertDataArrayBuffer: Uint32Array;
    private cornerIndexVBO: WebGLBuffer;

    private dimensionsUniform: WebGLUniformLocation;
    private charsPerRowUniform: WebGLUniformLocation;
    private cellTextureSizeUniform: WebGLUniformLocation;
    private charTextureUniform: WebGLUniformLocation;

    private numCellsToDraw: number = 0;
    private prevTextWidth: number = NaN;
    private prevTextHeight: number = NaN;

    // these shouldn't be modifiable by other classes but there's no way to make
    // "public-readonly but private-writable" fields: https://github.com/microsoft/TypeScript/issues/37487
    // there are workarounds like adding getters and setters but those come at a runtime cost.
    // :(
    public numColumns: number = 0;
    public numRows: number = 0;

    public cells: Cell[] = [];

    private chars: string = "";
    private charMap: Map<number, number> = new Map();

    public backgroundColor: Color = 0;

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

        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            throw Error(`Shader linking error: ${gl.getProgramInfoLog(program)}`);

        gl.useProgram(this.program);

        this.dimensionsUniform = gl.getUniformLocation(program, vertShader.uniforms.dimensions.variableName);
        this.charsPerRowUniform = gl.getUniformLocation(program, vertShader.uniforms.charsPerRow.variableName);
        this.cellTextureSizeUniform = gl.getUniformLocation(program, vertShader.uniforms.cellTextureSize.variableName);
        this.charTextureUniform = gl.getUniformLocation(program, fragShader.uniforms.charTexture.variableName);

        this.textCtx = new OffscreenCanvas(0, 0).getContext("2d", { alpha: false });
        const textTexture = this.textTexture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, textTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textTexture);
        gl.uniform1i(this.charTextureUniform, 0);

        this.vertDataArrayBuffer = new Uint32Array(CELL_BUFFER_MAX_LIMIT * 3);
        this.vertDataVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertDataVBO);
        gl.bufferData(gl.ARRAY_BUFFER, CELL_BUFFER_MAX_LIMIT * 12, gl.DYNAMIC_DRAW);
        gl.vertexAttribIPointer(0, 3, gl.UNSIGNED_INT, 12, 0);
        gl.vertexAttribDivisor(0, 1);
        gl.enableVertexAttribArray(0);

        this.cornerIndexVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerIndexVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([0b11, 0b01, 0b10, 0b00]), gl.STATIC_DRAW);
        gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_BYTE, 0, 0);
        gl.enableVertexAttribArray(1);

        this.setChars(
            " !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~" +
            "═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬" +
            "�"
        );
    }

    init() {
        this.handleResize(false);

        const gl = this.gl;
        const backgroundColor = this.backgroundColor;
        gl.clearColor((backgroundColor >> 16 & 0xff) / 255, (backgroundColor >> 8 & 0xff) / 255, (backgroundColor & 0xff) / 255, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i] = {
                foreground: backgroundColor,
                background: backgroundColor,
                char: 0,
            };
        }
    }

    setChars(chars: string) {
        this.chars = chars;
        this.charMap.clear();
        for (let i = 0; i < chars.length; i++) {
            this.charMap.set(chars.charCodeAt(i), i);
        }
    }

    handleResize(redraw: boolean = true) {
        const BASE_FONT_SIZE = 16;

        // rerender buffer
        const ctx = this.textCtx, gl = this.gl;

        const pixelRatio = devicePixelRatio;

        // limit font size to not allocate a huge text atlas when zoomed in too much 
        const fontSize = Math.min(BASE_FONT_SIZE * pixelRatio, 64) / pixelRatio;

        ctx.font = `${fontSize}px monospace`;
        const TEXT_ASPECT_RATIO = 2.2;
        const textMetrics = ctx.measureText("a");
        const textWidth = textMetrics.width, textHeight = textWidth * TEXT_ASPECT_RATIO;
        const textBaseline = textMetrics.fontBoundingBoxDescent

        const realTextWidth = textWidth * pixelRatio, realTextHeight = textHeight * pixelRatio;

        if (realTextWidth !== this.prevTextWidth || realTextHeight !== this.prevTextHeight) {

            gl.useProgram(this.program);

            // find optimal power-of-two dimensions
            let finalTextureWidth = Infinity, finalTextureHeight = Infinity;
            for (let testTextureWidth = 65536; testTextureWidth > 4; testTextureWidth >>= 1) {
                let numColumns = Math.floor(testTextureWidth / realTextWidth);
                let numRows = Math.ceil(this.chars.length / numColumns);
                if (numColumns === 0 || numRows === 0)
                    continue;

                // smallest power of 2 greater than numRows * realTextHeight
                let testTextureHeight = 1 << 32 - Math.clz32(numRows * realTextHeight - 1);
                if (testTextureWidth * testTextureHeight < finalTextureWidth * finalTextureHeight) {
                    finalTextureWidth = testTextureWidth; finalTextureHeight = testTextureHeight;
                }
            }
            if (finalTextureWidth === Infinity || finalTextureHeight === Infinity) {
                // give up
                return;
            }

            this.textCtx.canvas.width = finalTextureWidth; this.textCtx.canvas.height = finalTextureHeight;
            ctx.font = `${pixelRatio * fontSize}px monospace`;
            const numCharColumns = Math.floor(finalTextureWidth / realTextWidth);

            gl.uniform1ui(this.charsPerRowUniform, numCharColumns);

            ctx.fillStyle = "#f00";
            for (let i = 0; i < this.chars.length; i++) {
                const canvasX = i % numCharColumns * realTextWidth, canvasY = Math.floor(i / numCharColumns) * realTextHeight;
                ctx.save();
                ctx.beginPath();
                ctx.rect(canvasX, canvasY, realTextWidth, realTextHeight);
                ctx.clip();

                ctx.fillText(this.chars[i], canvasX, canvasY + realTextHeight - textBaseline * pixelRatio);
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
            const newCells = Array(numRows * numColumns);
            for (let x = 0; x < numColumns; x++) {
                for (let y = 0; y < numRows; y++) {
                    newCells[y * numColumns + x] = x >= this.numColumns || y >= this.numRows ? {
                        background: this.backgroundColor,
                        foreground: this.backgroundColor,
                        char: 32,
                    } : cells[y * this.numColumns + x];
                }
            }

            gl.uniform1ui(this.dimensionsUniform, numColumns << 16 | numRows);

            this.cells = newCells;
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

            if (redraw)
                this.redrawEverything();
        }

    }

    queueCell(x: number, y: number, cell: Cell) {
        let cellIndex = this.numCellsToDraw;
        if (cellIndex === CELL_BUFFER_MAX_LIMIT) {
            this.flush();
            cellIndex = 0;
        }

        const { foreground, background, char } = cell;

        if (foreground == null || background == null || char == null) {
            console.error("Invalid cell:", cell);
            throw Error("Invalid cell");
        }

        let charIndex = this.charMap.get(char);
        if (charIndex === undefined) {
            charIndex = this.charMap.get(0xfffd); // � (replacement character)
            if (charIndex === undefined) {
                console.warn("replacement character doesn't exist??");
                return;
            }
        }
        this.vertDataArrayBuffer[cellIndex * 3] = x << 16 | y;
        this.vertDataArrayBuffer[cellIndex * 3 + 1] = charIndex << 24 | background;
        this.vertDataArrayBuffer[cellIndex * 3 + 2] = foreground;

        this.cells[y * this.numColumns + x] = cell;

        this.numCellsToDraw = cellIndex + 1;
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

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertDataVBO);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertDataArrayBuffer, 0, this.numCellsToDraw * 3);

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
}
