
precision mediump float;
uniform sampler2D u_image0;  // texture rgb
uniform sampler2D u_image1;  // texture coe123
uniform sampler2D u_image2;  // texture coe456
uniform sampler2D u_image3;  // texture normals

uniform float uScales[6];
uniform float uBiases[6];

uniform bool uUseSpecular;

varying vec2 v_texCoord;    // the texCoords passed in from the vertex shader.

uniform vec2 uLightDirection;  // the lighting direction

void main() {

	// Rendering Mode Parameters
	float kd  = 0.4;
	float ks  = 0.7;
	float exp = 75.0;

	//vec3 color = vec3(0.0);
	vec3 color   = texture2D(u_image0, v_texCoord).xyz;

	vec3 coef012 = 255.0 * texture2D(u_image1, v_texCoord).xyz;
	vec3 coef345 = 255.0 * texture2D(u_image2, v_texCoord).xyz;

	float lu = uLightDirection.x;
	float lv = uLightDirection.y;

	float lum = (coef012.x - uBiases[0]) * uScales[0] * lu * lu +
				(coef012.y - uBiases[1]) * uScales[1] * lv * lv  +
				(coef012.z - uBiases[2]) * uScales[2] * lu * lv  +
				(coef345.x - uBiases[3]) * uScales[3] * lu  +
				(coef345.y - uBiases[4]) * uScales[4] * lv  +
				(coef345.z - uBiases[5]) * uScales[5];

	lum = lum / (255.0);

	if (uUseSpecular)  // Specular Mode
	{
	    vec3 normals = 2.0 * (texture2D(u_image3, v_texCoord).xyz - 0.5);
	    vec3 luv = vec3(lu/2.0, lv/2.0, 0.5);
	    luv = normalize(luv);

	    float nh = dot(luv, normals);
	    nh = pow(nh, exp);
	    nh = nh * ks;
	    vec3 nhvec = vec3(nh, nh, nh);

	    color = (color * kd + nhvec) * lum;
	}
	else  // Diffuse Mode
	{
	    color *= lum;
	}

	gl_FragColor = vec4(color, 1.0);

	// Test Texture Loading
	//gl_FragColor = texture2D(u_image3, v_texCoord);
}