#version 300 es

precision mediump float;
precision highp int;

// dimensions; top 16 bits are width, lower 16 bits are height
uniform uint dimensions;
uniform mediump uint charsPerRow;
// How big each character is on the atlas.
uniform vec2 cellTextureSize;

// combined vertex coordinates, character index, background color, and foreground color
// 32-bit coordinates, 8-bit char index + 24-bit background color, 24-bit foreground color,
// coordinates: top 16 bits are x, lower 16 bits are y
// char index is packed into the top 8 bits of the background color
layout(location = 0) in uvec3 vertData;

// 2 bits indicating which corner of the cell it's in.
layout(location = 1) in lowp uint cornerIndex;

// background and foreground colors.
// 24-bit background color, then a 24-bit foreground color.
flat out uvec2 fragColors;
out vec2 fragUV;

void main() {
    uint width = dimensions >> 16, height = dimensions & 0xffffu;
    uint x = (vertData.x >> 16) + (cornerIndex & 1u), y = (vertData.x & 0xffffu) + (cornerIndex >> 1);
    gl_Position = vec4(float(x) / float(width) * 2.0f - 1.0f, 1.0f - float(y) / float(height) * 2.0f, 0.0f, 1.0f);

    // top 8 bits are ignored anyway so this is fine
    fragColors = vertData.yz;
    uint charIndex = vertData.y >> 24;
    fragUV = vec2(charIndex % charsPerRow + (cornerIndex & 1u), charIndex / charsPerRow + (cornerIndex >> 1)) * cellTextureSize;
}
