"use strict";
const SHU = {
  uSkyIdx: {value: -1},
  uEnvDiff: {value: 1},
  uInBox: {value: new THREE.Vector4(0, 0, -1, -1)},
  uInY: {value: new THREE.Vector2(0, 0)},
  uInK: {value: 1}
};

const SH_PARS = `uniform float uSkyIdx;
uniform float uEnvDiff;
uniform vec4 uInBox;
uniform vec2 uInY;
uniform float uInK;
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
  const maps = C.lights_fragment_maps
    .replace("iblIrradiance += getLightProbeIndirectIrradiance( geometry, maxMipLevel );", "iblIrradiance += getLightProbeIndirectIrradiance( geometry, maxMipLevel ) * uEnvDiff * shAmb;")
    .replace("radiance += getLightProbeIndirectRadiance( geometry.viewDir, geometry.normal, material.specularRoughness, maxMipLevel );", "radiance += getLightProbeIndirectRadiance( geometry.viewDir, geometry.normal, material.specularRoughness, maxMipLevel ) * mix( 1.0, shAmb, 0.85 );");
  const nrm = C.normal_fragment_maps.replace("vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;", `vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	float shNL = clamp( length( mapN ), 0.05, 1.0 );
	roughnessFactor = min( 1.0, sqrt( roughnessFactor * roughnessFactor + 1.5 * ( 1.0 - shNL ) / shNL ) );`);
  const phys = C.lights_physical_fragment.replace("vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );", "vec3 dxy = max( max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) ), 0.5 * max( abs( dFdx( normal ) ), abs( dFdy( normal ) ) ) );");
  return {begin: beg.slice(0, at) + dir, maps, nrm, phys};
})();

function shadePatch(sh) {
  Object.assign(sh.uniforms, SHU);
  sh.fragmentShader = SH_PARS + sh.fragmentShader
    .replace("#include <normal_fragment_maps>", SH_CHUNKS.nrm)
    .replace("#include <lights_physical_fragment>", SH_MAIN + SH_CHUNKS.phys)
    .replace("#include <lights_fragment_begin>", SH_CHUNKS.begin)
    .replace("#include <lights_fragment_maps>", SH_CHUNKS.maps);
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
