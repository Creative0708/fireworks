#version 300 es

precision mediump float;
precision highp int;

flat in uvec2 fragColors;
in vec2 fragUV;

out vec4 fragColor;

uniform sampler2D charTexture;

vec3 getColor(uint i) {
    return vec3(i >> 16 & 255u, i >> 8 & 255u, i & 255u) / 255.0f;
}

void main() {
    float alpha = texture(charTexture, fragUV).r;
    fragColor = vec4(mix(getColor(fragColors.x), getColor(fragColors.y), alpha), 1.0f);
}