"use strict";
const SHU = {
  uSkyIdx: {value: -1},
  uSkyOn: {value: 0},
  uEnvDiff: {value: 1},
  uInBox: {value: new THREE.Vector4(0, 0, -1, -1)},
  uInY: {value: new THREE.Vector2(0, 0)},
  uInK: {value: 1},
  uInEnv: {value: 0.4},
  uPLA: {value: Array.from({length: 64}, () => new THREE.Vector4())},
  uPLB: {value: Array.from({length: 64}, () => new THREE.Vector4())},
  uSnow: {value: 0},
  uWet: {value: 0},
  uPud: {value: 0},
  uRainOn: {value: 0},
  uWind: {value: new THREE.Vector3()},
  uTime: {value: 0}
};

const SH_PARS = `uniform float uSkyIdx;
uniform float uSkyOn;
uniform float uEnvDiff;
uniform vec4 uInBox;
uniform vec2 uInY;
uniform float uInK;
uniform float uInEnv;
uniform float uSnow;
uniform float uWet;
uniform float uPud;
uniform float uRainOn;
uniform float uTime;
uniform float uPudK;
uniform float uWave;
float shHash( vec2 p ) {
	vec3 q = fract( vec3( p.xyx ) * 0.1031 );
	q += dot( q, q.yzx + 33.33 );
	return fract( ( q.x + q.y ) * q.z );
}
float shNoise( vec2 p ) {
	vec2 i = floor( p );
	vec2 f = fract( p );
	vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( shHash( i ), shHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( shHash( i + vec2( 0.0, 1.0 ) ), shHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
#if NUM_POINT_LIGHTS > 0
uniform vec4 uPLA[ NUM_POINT_LIGHTS ];
uniform vec4 uPLB[ NUM_POINT_LIGHTS ];
#endif
float shLM( vec4 a, vec4 b, vec3 p, float inside ) {
	if ( b.z < 0.5 ) return 0.0;
	if ( b.z < 1.5 ) return step( a.x, p.x ) * step( p.x, a.z ) * step( a.y, p.z ) * step( p.z, a.w ) * step( b.x, p.y ) * step( p.y, b.y );
	if ( b.z < 2.5 ) return 1.0 - inside;
	return 1.0;
}
`;

const SH_MAIN = `vec3 shWP = ( vec4( - vViewPosition - viewMatrix[ 3 ].xyz, 0.0 ) * viewMatrix ).xyz;
float shIn = step( uInBox.x, shWP.x ) * step( shWP.x, uInBox.z ) * step( uInBox.y, shWP.z ) * step( shWP.z, uInBox.w ) * step( uInY.x, shWP.y ) * step( shWP.y, uInY.y );
float shAmb = mix( 1.0, uInK, shIn );
if ( uWave > 0.5 ) {
	vec2 shQ = shWP.xz * 1.8;
	float shT = uTime * 0.5 + 3.0;
	float shE = 0.03;
	float shH0 = shNoise( shQ + shT ) + 0.5 * shNoise( shQ * 2.7 - shT * 1.4 );
	float shHX = shNoise( shQ + vec2( shE, 0.0 ) + shT ) + 0.5 * shNoise( ( shQ + vec2( shE, 0.0 ) ) * 2.7 - shT * 1.4 );
	float shHZ = shNoise( shQ + vec2( 0.0, shE ) + shT ) + 0.5 * shNoise( ( shQ + vec2( 0.0, shE ) ) * 2.7 - shT * 1.4 );
	vec3 shWv = normalize( vec3( ( shH0 - shHX ) / shE * 0.06, 1.0, ( shH0 - shHZ ) / shE * 0.06 ) );
	normal = normalize( ( viewMatrix * vec4( shWv, 0.0 ) ).xyz );
}
if ( uSnow + uWet + uPud > 0.001 && shIn < 0.5 ) {
	vec3 shWN = normalize( ( vec4( geometryNormal, 0.0 ) * viewMatrix ).xyz );
	float shNz = shNoise( shWP.xz * 1.7 ) * 0.6 + shNoise( shWP.xz * 6.3 ) * 0.4;
	float shCov = 0.0;
	if ( uSnow > 0.001 ) {
		shCov = smoothstep( 0.42, 0.7, shWN.y ) * smoothstep( shNz * 0.7, shNz * 0.7 + 0.22, uSnow );
		diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.88, 0.91, 0.95 ) * ( 0.95 + 0.05 * shNz ), shCov );
		roughnessFactor = mix( roughnessFactor, 0.7, shCov );
		metalnessFactor = mix( metalnessFactor, 0.0, shCov );
		normal = normalize( mix( normal, geometryNormal, shCov ) );
	}
	if ( uWet > 0.001 ) {
		float shW = uWet * ( 1.0 - shCov ) * ( 0.5 + 0.5 * smoothstep( -0.2, 0.8, shWN.y ) );
		diffuseColor.rgb *= 1.0 - shW * ( 0.2 + 0.32 * roughnessFactor );
		roughnessFactor = mix( roughnessFactor, roughnessFactor * 0.3 + 0.05, shW );
	}
	if ( uPud > 0.001 ) {
		float shPn = shNoise( shWP.xz * 0.33 + 17.0 ) * 0.65 + shNoise( shWP.xz * 1.25 ) * 0.35;
		float shP = smoothstep( 0.93, 0.985, shWN.y ) * smoothstep( 1.0 - uPud * 0.36 * uPudK, 1.02 - uPud * 0.36 * uPudK, shPn ) * ( 1.0 - shCov ) * step( shWP.y, 1.2 );
		if ( shP > 0.001 ) {
			vec3 shRn = vec3( 0.0, 1.0, 0.0 );
			if ( uRainOn > 0.0 ) {
				vec2 shCp = shWP.xz * 3.5;
				vec2 shCi = floor( shCp );
				vec2 shCf = fract( shCp ) - 0.5 - ( vec2( shHash( shCi ), shHash( shCi + 5.3 ) ) - 0.5 ) * 0.5;
				float shPh = fract( uTime * 0.9 * uRainOn + shHash( shCi + 9.1 ) );
				float shR = length( shCf );
				float shRing = sin( ( shR - shPh * 0.45 ) * 55.0 ) * smoothstep( 0.08, 0.0, abs( shR - shPh * 0.45 ) ) * ( 1.0 - shPh );
				vec2 shG = shR > 0.001 ? shCf / shR * shRing * 0.35 : vec2( 0.0 );
				shRn = normalize( vec3( shG.x, 1.0, shG.y ) );
			}
			diffuseColor.rgb *= mix( 1.0, 0.4, shP );
			roughnessFactor = mix( roughnessFactor, 0.03, shP );
			metalnessFactor = mix( metalnessFactor, 0.0, shP );
			normal = normalize( mix( normal, ( viewMatrix * vec4( shRn, 0.0 ) ).xyz, shP ) );
		}
	}
}
`;

const SH_WIND = `#include <begin_vertex>
{
	vec4 shV = modelMatrix * vec4( transformed, 1.0 );
	float shI = step( uInBox.x, shV.x ) * step( shV.x, uInBox.z ) * step( uInBox.y, shV.z ) * step( shV.z, uInBox.w );
	float shH = max( 0.0, shV.y - 0.3 );
	float shS = uWind.y;
	float shSw = 0.55 + 0.45 * sin( uTime * ( 0.9 + 0.05 * shS ) + shV.x * 0.13 + shV.z * 0.11 ) + 0.18 * sin( uTime * 2.7 + shV.x * 1.3 + shV.y * 0.7 );
	vec3 shO = vec3( uWind.x, 0.0, uWind.z ) * shSw * shH * shH * 0.00045;
	shO.y = -length( shO ) * 0.15;
	shO += vec3( sin( uTime * 6.0 + shV.y * 3.0 + shV.x * 5.0 ), 0.0, cos( uTime * 5.3 + shV.z * 4.0 ) ) * 0.004 * shS * min( 1.0, shH );
	transformed += ( vec4( shO * ( 1.0 - shI ), 0.0 ) * modelMatrix ).xyz / max( dot( modelMatrix[ 0 ].xyz, modelMatrix[ 0 ].xyz ), 1e-6 );
}
`;

const SH_CHUNKS = (() => {
  const C = THREE.ShaderChunk;
  const beg = C.lights_fragment_begin;
  const at = beg.indexOf("#if ( NUM_DIR_LIGHTS > 0 )");
  const call = "RE_Direct( directLight, geometry, material, reflectedLight );";
  const dcall = "directionalLight = directionalLights[ i ];";
  const dir = beg.slice(at).replace(dcall, `if ( uSkyOn > 0.5 || abs( float( UNROLLED_LOOP_INDEX ) - uSkyIdx ) > 0.5 ) {
		${dcall}`).replace(call, `{
			vec3 shSpec = reflectedLight.directSpecular;
			${call}
			if ( abs( float( UNROLLED_LOOP_INDEX ) - uSkyIdx ) < 0.5 ) reflectedLight.directSpecular = shSpec;
		}
		}`).replace("irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );", "irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry ) * shAmb;");
  const pline = "pointLight = pointLights[ i ];";
  const pre = beg.slice(0, at).replace(pline, `if ( shLM( uPLA[ i ], uPLB[ i ], shWP, shIn ) > 0.5 ) {
		${pline}`).replace(`		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 )`, `		{
			float shR = material.specularRoughness;
			float shB = 0.3 / ( 1.0 + length( pointLight.position - geometry.position ) );
			material.specularRoughness = min( 1.0, shR + shB );
			#ifdef CLEARCOAT
				float shCR = material.clearcoatRoughness;
				material.clearcoatRoughness = min( 1.0, shCR + shB );
			#endif
			RE_Direct( directLight, geometry, material, reflectedLight );
			material.specularRoughness = shR;
			#ifdef CLEARCOAT
				material.clearcoatRoughness = shCR;
			#endif
		}
		}
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 )`);
  if (pre.indexOf("shB") < 0 || pre.indexOf("shLM") < 0 || dir.indexOf("uSkyOn") < 0 || dir.indexOf("shSpec") < 0) throw new Error("light loop patch");
  const fall = C.bsdfs.replace(`	if( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
		return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );
	}
	return 1.0;`, `	float distanceFalloff = 1.0 / ( lightDistance * lightDistance + 0.08 );
	if( cutoffDistance > 0.0 ) distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	return distanceFalloff;`);
  const maps = C.lights_fragment_maps
    .replace("iblIrradiance += getLightProbeIndirectIrradiance( geometry, maxMipLevel );", "iblIrradiance += getLightProbeIndirectIrradiance( geometry, maxMipLevel ) * mix( uEnvDiff, min( uEnvDiff, uInEnv ), shIn ) * shAmb;")
    .replace("radiance += getLightProbeIndirectRadiance( geometry.viewDir, geometry.normal, material.specularRoughness, maxMipLevel );", "radiance += getLightProbeIndirectRadiance( geometry.viewDir, geometry.normal, material.specularRoughness, maxMipLevel ) * mix( 1.0, shAmb, 0.85 );");
  const nrm = C.normal_fragment_maps.replace("vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;", `vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	float shNL = clamp( length( mapN ), 0.05, 1.0 );
	roughnessFactor = min( 1.0, sqrt( roughnessFactor * roughnessFactor + 1.5 * ( 1.0 - shNL ) / shNL ) );`);
  const phys = C.lights_physical_fragment.replace("vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );", "vec3 dxy = max( max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) ), 0.5 * max( abs( dFdx( normal ) ), abs( dFdy( normal ) ) ) );");
  return {begin: pre + dir, maps, nrm, phys, fall};
})();

function shadePatch(sh, wind, pudK, wave) {
  Object.assign(sh.uniforms, SHU);
  sh.uniforms.uPudK = {value: pudK === undefined ? 0.6 : pudK};
  sh.uniforms.uWave = {value: wave || 0};
  if (wind) sh.vertexShader = "uniform float uTime;\nuniform vec3 uWind;\nuniform vec4 uInBox;\n" + sh.vertexShader.replace("#include <begin_vertex>", SH_WIND);
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <bsdfs>", SH_CHUNKS.fall)
    .replace("#include <normal_fragment_maps>", SH_CHUNKS.nrm)
    .replace("#include <lights_physical_fragment>", SH_MAIN + SH_CHUNKS.phys)
    .replace("#include <lights_fragment_begin>", SH_CHUNKS.begin)
    .replace("#include <lights_fragment_maps>", SH_CHUNKS.maps)
    .replace("#include <lights_pars_begin>", "#include <lights_pars_begin>\n" + SH_PARS);
}

function shadeInterior(box, y0, y1, k) {
  if (!box) {
    SHU.uInBox.value.set(0, 0, -1, -1);
    return;
  }
  SHU.uInBox.value.set(box.x0, box.z0, box.x1, box.z1);
  SHU.uInY.value.set(y0, y1);
  SHU.uInK.value = k;
}
