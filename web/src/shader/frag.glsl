#version 300 es

precision mediump float;
precision highp int;

// see vert.glsl for description
// in highp uint fragData;
in vec2 fragUV;

out vec4 fragColor;

// uniform sampler2D charTexture;
// uniform vec2 charSize;
// uniform vec3 colors[256];

void main() {
    // vec2 textureSize = vec2(textureSize(charTexture, 0));
    // float alpha = texture(charTexture, vec2(float(fragData & 0xff) / 256.0f + fragUV.x, fragUV.y) * textureSize).r;
    // fragColor = vec4(mix(colors[fragData >> 16 & 0xff], colors[fragData >> 8 & 0xff], alpha), 1.0f);

    fragColor = vec4(fragUV, 1.0f, 1.0f);
}