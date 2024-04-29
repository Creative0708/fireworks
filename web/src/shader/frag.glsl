#version 300 es

precision mediump float;
precision highp int;

// see vert.glsl for description
flat in mediump uint fragData;
in vec2 fragUV;

out vec4 fragColor;

uniform sampler2D charTexture;
uniform vec3 colors[256];

void main() {
    float alpha = texture(charTexture, fragUV).r;
    fragColor = vec4(mix(colors[fragData >> 8], colors[fragData & 0xffu], alpha), 1.0f);
}