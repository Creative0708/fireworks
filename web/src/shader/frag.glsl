#version 300 es

precision mediump float;
precision highp int;

// see vert.glsl for description
in vec2 fragUV;

out vec4 fragColor;

uniform sampler2D charTexture;
// uniform vec3 colors[256];

void main() {
    float alpha = texture(charTexture, fragUV).r;
    // fragColor = vec4(mix(colors[fragData >> 16 & 0xff], colors[fragData >> 8 & 0xff], alpha), 1.0f);

    fragColor = vec4(alpha, alpha, alpha, 1.0f);
    // fragColor = vec4(fragUV, 0.0f, 1.0f);
}