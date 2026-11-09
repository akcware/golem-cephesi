#version 140

// Birim parçaları: renk tonu (tint) + vurulunca beyaz parlama (flash.x: 0..1)
in mediump vec2 var_texcoord0;

out vec4 out_fragColor;

uniform mediump sampler2D texture_sampler;
uniform fs_uniforms
{
    mediump vec4 tint;
    mediump vec4 flash;
};

void main()
{
    mediump vec4 tint_pm = vec4(tint.xyz * tint.w, tint.w);
    mediump vec4 c = texture(texture_sampler, var_texcoord0.xy) * tint_pm;
    c.rgb = mix(c.rgb, vec3(c.a), flash.x);
    out_fragColor = c;
}
