
// can't be bothered to hardcode hex digits
export type HexColor = `#${string}`;

export interface Theme {
    "black": HexColor;
    "red": HexColor;
    "darkRed": HexColor;
    "green": HexColor;
    "darkGreen": HexColor;
    "yellow": HexColor;
    "darkYellow": HexColor;
    "blue": HexColor;
    "darkBlue": HexColor;
    "magenta": HexColor;
    "darkMagenta": HexColor;
    "cyan": HexColor;
    "darkCyan": HexColor;
    "darkGrey": HexColor;
    "grey": HexColor;
    "white": HexColor;
}

export default {
    "vscode-dark": {
        "black": "#151515",
        "darkGrey": "#505050",
        "blue": "#6A9FB5",
        "cyan": "#75B5AA",
        "green": "#90A959",
        "magenta": "#AA759F",
        "red": "#AC4142",
        "white": "#F5F5F5",
        "yellow": "#F4BF75",
        "darkBlue": "#6A9FB5",
        "darkCyan": "#75B5AA",
        "darkGreen": "#90A959",
        "darkMagenta": "#AA759F",
        "darkRed": "#AC4142",
        "grey": "#D0D0D0",
        "darkYellow": "#F4BF75"
    }
} satisfies { [key: string]: Theme };