#version 300 es

precision mediump float;
precision highp int;

// dimensions; top 16 bits are width, lower 16 bits are height
uniform uint dimensions;
uniform mediump uint charsPerRow;
// How big each character is on the atlas.
uniform vec2 cellTextureSize;

// vertex coordinates; top 16 bits are x, lower 16 bits are y
layout(location = 0) in uint coords;

// combined character index, background color, and foreground color
// which indicates what corner of the character this vertex is.
// 8 bits unused, 8-bit background color, 8-bit foreground color, 8-bit char index
layout(location = 1) in uint vertData;

// 2 bits indicating which corner of the cell it's in.
layout(location = 2) in lowp uint cornerIndex;

// background and foreground colors.
// 8-bit background color, then an 8-bit foreground color.
flat out mediump uint fragData;
out vec2 fragUV;

void main() {

    uint width = dimensions >> 16, height = dimensions & 0xffffu;
    uint x = (coords >> 16) + (cornerIndex & 1u), y = (coords & 0xffffu) + (cornerIndex >> 1);
    gl_Position = vec4(float(x) / float(width) * 2.0f - 1.0f, 1.0f - float(y) / float(height) * 2.0f, 0.0f, 1.0f);

    fragData = vertData >> 8;
    uint charIndex = vertData & 0xffu;
    fragUV = vec2(charIndex % charsPerRow + (cornerIndex & 1u), charIndex / charsPerRow + (cornerIndex >> 1)) * cellTextureSize;
}
