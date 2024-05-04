
import { Color, TextGl } from "./gl";
import themes, { Theme } from "./themes";
import { Fireworks, seed_rand } from "../../pkg/index";

const canvas: HTMLCanvasElement = document.getElementById("fireworks") as HTMLCanvasElement;

canvas.removeAttribute("style");

const fireworksCanvas = new TextGl(canvas.getContext("webgl2", { preserveDrawingBuffer: true, alpha: false }));

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
addEventListener("keypress", console.log);

applyTheme(themes["vscode-dark"]);

let lastTime: number | null = null;
function draw(timestamp?: number) {
    timestamp = timestamp ?? performance.now();

    let delta = 0;
    if (lastTime !== null)
        delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    fireworks.update_and_render(delta);
    for (const change of fireworks.get_renderer_changes()) {
        const coords = Number(change >> BigInt(32));
        const data = Number(change & BigInt(0xffffffff));
        fireworksCanvas.queueCell(
            coords >> 16,
            coords & 0xffff,
            {
                backgroundIndex: data >> 16,
                foregroundIndex: data >> 8 & 0xff,
                charIndex: data & 0xff,
            }
        );
    }
    fireworksCanvas.flush();

    requestAnimationFrame(draw);
}

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

    const colors: Color[] = [];
    for (const color of colorOrder) {
        const hex = parseInt(theme[color].substring(1), 16)
        colors.push([hex >> 16, hex >> 8 & 0xff, hex & 0xff]);
    }

    fireworksCanvas.setTheme(colors);
    fireworksCanvas.redrawEverything();
}