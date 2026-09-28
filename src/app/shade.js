"use strict";
const SHU = {
  uSkyIdx: {value: -1},
  uEnvDiff: {value: 1},
  uInBox: {value: new THREE.Vector4(0, 0, -1, -1)},
  uInY: {value: new THREE.Vector2(0, 0)},
  uInK: {value: 1},
  uPLA: {value: Array.from({length: 64}, () => new THREE.Vector4())},
  uPLB: {value: Array.from({length: 64}, () => new THREE.Vector4())}
};

const SH_PARS = `uniform float uSkyIdx;
uniform float uEnvDiff;
uniform vec4 uInBox;
uniform vec2 uInY;
uniform float uInK;
#if NUM_POINT_LIGHTS > 0
uniform vec4 uPLA[ NUM_POINT_LIGHTS ];
uniform vec4 uPLB[ NUM_POINT_LIGHTS ];
#endif
float shLM( vec4 a, vec4 b, vec3 p, float inside ) {
	if ( b.z < 0.5 ) return 1.0;
	if ( b.z < 1.5 ) return step( a.x, p.x ) * step( p.x, a.z ) * step( a.y, p.z ) * step( p.z, a.w ) * step( b.x, p.y ) * step( p.y, b.y );
	return 1.0 - inside;
}
`;

const SH_MAIN = `vec3 shWP = ( vec4( - vViewPosition - viewMatrix[ 3 ].xyz, 0.0 ) * viewMatrix ).xyz;
float shIn = step( uInBox.x, shWP.x ) * step( shWP.x, uInBox.z ) * step( uInBox.y, shWP.z ) * step( shWP.z, uInBox.w ) * step( uInY.x, shWP.y ) * step( shWP.y, uInY.y );
float shAmb = mix( 1.0, uInK, shIn );
`;

const SH_CHUNKS = (() => {
  const C = THREE.ShaderChunk;
  const beg = C.lights_fragment_begin;
  const at = beg.indexOf("#if ( NUM_DIR_LIGHTS > 0 )");
  const call = "RE_Direct( directLight, geometry, material, reflectedLight );";
  const dir = beg.slice(at).replace(call, `{
			vec3 shSpec = reflectedLight.directSpecular;
			${call}
			if ( abs( float( UNROLLED_LOOP_INDEX ) - uSkyIdx ) < 0.5 ) reflectedLight.directSpecular = shSpec;
		}`).replace("irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );", "irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry ) * shAmb;");
  const pcall = "getPointDirectLightIrradiance( pointLight, geometry, directLight );";
  const pre = beg.slice(0, at).replace(pcall, pcall + "\n\t\tdirectLight.color *= shLM( uPLA[ i ], uPLB[ i ], shWP, shIn );").replace(`		RE_Direct( directLight, geometry, material, reflectedLight );
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
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 )`);
  if (pre.indexOf("shB") < 0) throw new Error("point light patch");
  const fall = C.bsdfs.replace(`	if( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
		return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );
	}
	return 1.0;`, `	float distanceFalloff = 1.0 / ( lightDistance * lightDistance + 0.08 );
	if( cutoffDistance > 0.0 ) distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	return distanceFalloff;`);
  const maps = C.lights_fragment_maps
    .replace("iblIrradiance += getLightProbeIndirectIrradiance( geometry, maxMipLevel );", "iblIrradiance += getLightProbeIndirectIrradiance( geometry, maxMipLevel ) * uEnvDiff * shAmb;")
    .replace("radiance += getLightProbeIndirectRadiance( geometry.viewDir, geometry.normal, material.specularRoughness, maxMipLevel );", "radiance += getLightProbeIndirectRadiance( geometry.viewDir, geometry.normal, material.specularRoughness, maxMipLevel ) * mix( 1.0, shAmb, 0.85 );");
  const nrm = C.normal_fragment_maps.replace("vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;", `vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	float shNL = clamp( length( mapN ), 0.05, 1.0 );
	roughnessFactor = min( 1.0, sqrt( roughnessFactor * roughnessFactor + 1.5 * ( 1.0 - shNL ) / shNL ) );`);
  const phys = C.lights_physical_fragment.replace("vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );", "vec3 dxy = max( max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) ), 0.5 * max( abs( dFdx( normal ) ), abs( dFdy( normal ) ) ) );");
  return {begin: pre + dir, maps, nrm, phys, fall};
})();

function shadePatch(sh) {
  Object.assign(sh.uniforms, SHU);
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
