
import { Color, TextGl } from "./gl";
import themes, { Theme } from "./themes";
import { Fireworks, seed_rand } from "../../pkg/index";

const canvas: HTMLCanvasElement = document.getElementById("fireworks") as HTMLCanvasElement;

canvas.removeAttribute("style");

const fireworksCanvas = new TextGl(canvas.getContext("webgl2", {
    preserveDrawingBuffer: true,
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
}));

seed_rand(crypto.getRandomValues(new BigUint64Array(1))[0]);
const fireworks = new Fireworks(fireworksCanvas.numColumns, fireworksCanvas.numRows);

let resizeTimeout: number | null = null;
addEventListener("resize", () => {
    if (resizeTimeout !== null) {
        clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
        resizeTimeout = null;
        fireworksCanvas.handleResize();
        fireworks.handle_resize(fireworksCanvas.numColumns, fireworksCanvas.numRows);
    }, 20);
});
addEventListener("keydown", (e) => {
    if (e.key === "Escape")
        fireworks.handle_key("\x1b");
    else if (e.key.length == 1)
        fireworks.handle_key(e.key);
});

let colorPalette: Color[] = [];

function getColorFromU32(u32: number): Color | undefined {
    // world's least useful switch case
    // TODO add support for other colors (and figure out how ANSI colors are calculated )
    switch (u32 >> 24) {
        case 0:
            return colorPalette[u32];
    }
}

applyTheme(themes["vscode-dark"]);

let lastTime: number | null = null;
function draw(timestamp?: number) {
    timestamp = timestamp ?? performance.now();

    let delta = 0;
    if (lastTime !== null)
        delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    fireworks.update_and_render(delta);

    let raw_data = fireworks.get_renderer_changes();
    for (let i = 0; i < raw_data.length; i += 4) {
        const [coords, bgColor, fgColor, char] = raw_data.subarray(i, i + 4);

        fireworksCanvas.queueCell(
            coords >> 16,
            coords & 0xffff,
            // TODO implement non-ANSI colors
            {
                background: getColorFromU32(bgColor),
                foreground: getColorFromU32(fgColor),
                char,
            }
        );
    }
    fireworksCanvas.flush();

    requestAnimationFrame(draw);
}

function redrawEverything() {
    // TODO 
    // fireworksCanvas.cells.forEach((cell) => {
    //     cell.
    // });
}

fireworksCanvas.init();
fireworks.handle_resize(fireworksCanvas.numColumns, fireworksCanvas.numRows);
requestAnimationFrame(draw);
// setInterval(draw, 1000 / 3);

function applyTheme(theme: Theme) {
    const colorOrder = [
        "black",
        "red",
        "darkRed",
        "green",
        "darkGreen",
        "yellow",
        "darkYellow",
        "blue",
        "darkBlue",
        "magenta",
        "darkMagenta",
        "cyan",
        "darkCyan",
        "grey",
        "darkGrey",
        "white",
    ] as const;

    colorOrder.forEach((color, i) => {
        const hex = parseInt(theme[color].substring(1), 16)
        colorPalette[i] = hex;
    });

    fireworksCanvas.backgroundColor = colorPalette[0];

    redrawEverything();
}