
import { TextGl } from "./gl";

const canvas: HTMLCanvasElement = document.getElementById("fireworks") as HTMLCanvasElement;

const fireworks = new TextGl(canvas.getContext("webgl2"));

canvas.removeAttribute("style");