
/** @type { import("../../pkg/index.js").Fireworks | null } */
let fireworksInstance = null;

const testCharEl = document.getElementById("test-char");
let charWidth, charHeight;
function recalculateCharDimensions() {
    const boundingBox = testCharEl.getBoundingClientRect();
    charWidth = boundingBox.width; charHeight = boundingBox.height;
}

let gridWidth = 0, gridHeight = 0;
let dimensionsChanged = false;
function calculateGridDimensions() {
    recalculateCharDimensions();

    const newWidth = Math.floor(innerWidth / charWidth), newHeight = Math.floor(innerHeight / charHeight);

    if (newWidth === gridWidth && newHeight === gridHeight)
        return;
    dimensionsChanged = true;

    gridWidth = newWidth; gridHeight = newHeight;
}

/** @type {HTMLCanvasElement} */
const canvasEl = document.getElementById("fireworks");
const ctx = canvasEl.getContext("2d", { alpha: false });
ctx.font = "'Consolas', 'Courier New', Courier, monospace";

/** @type { HTMLElement[] } */
let textElements = [];

function updateAndDrawGrid(delta) {
    if (dimensionsChanged) {
        canvasEl.width = gridWidth * charWidth + "px";
        canvasEl.height = gridHeight * charHeight + "px";
    }
    fireworksInstance.update_and_draw(delta);
    const rendererChanges = fireworksInstance.get_renderer_changes();
    for (const change of rendererChanges) {
        const index = change.index;
        const x = (index / gridHeight) | 0;
        const y = index % gridHeight;

        ctx.fillStyle = terminalColors[change.bg];
        ctx.fillRect(x * charWidth, y * charHeight, charWidth, charHeight);
        ctx.fillStyle = terminalColors[change.fg];
        ctx.fillText(change.char, x * charWidth, y * charHeight);

        change.free();
    }
}

let prevTime = null;
function draw(time) {
    if (prevTime === null)
        prevTime = time;

    updateAndDrawGrid((time - prevTime) / 1000);
    prevTime = time;

    requestAnimationFrame(draw);
}

import("../../pkg/index.js").then((fireworks) => {
    fireworks.seed_rand(crypto.getRandomValues(new BigUint64Array(1))[0]);
    fireworksInstance = new fireworks.Fireworks();

    fireworksGridEl.removeAttribute("style");

    requestAnimationFrame(draw);
    calculateGridDimensions();
    addEventListener("resize", calculateGridDimensions);
}).catch(console.error);

let terminalThemes = null;
let terminalColors = [];

function setTheme(themeName) {
    const theme = terminalThemes[themeName];
    const rootStyle = document.documentElement.style;
    terminalColors[0] = theme.red;
    terminalColors[1] = theme.darkRed ?? theme.red;
    terminalColors[2] = theme.green;
    terminalColors[3] = theme.darkGreen ?? theme.green;
    terminalColors[4] = theme.yellow;
    terminalColors[5] = theme.darkYellow ?? theme.yellow;
    terminalColors[6] = theme.blue;
    terminalColors[7] = theme.darkBlue ?? theme.blue;
    terminalColors[8] = theme.magenta;
    terminalColors[9] = theme.darkMagenta ?? theme.magenta;
    terminalColors[10] = theme.cyan;
    terminalColors[11] = theme.darkCyan ?? theme.cyan;
    terminalColors[12] = theme.white;
    terminalColors[13] = theme.grey;
    terminalColors[14] = theme.darkGrey ?? theme.grey;
    terminalColors[15] = theme.black;
}

import("./themes.json").then((themes) => {
    terminalThemes = themes;
    setTheme("vscode-dark");
}).catch(console.error);