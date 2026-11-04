// Terreno 3D: relevo real (data/terrain.bin), cores por bioma/região, orla suave (máscara fina no shader), areia e água rasa.
import * as THREE from 'three';
import { clamp, smoothstep, lerp, fbm, vnoise } from './util.js';

export const HEIGHT_PER_M = 0.00005, WATER_Y = -0.02;
const hex = h => new THREE.Color(h);
const mix = (a, b, t) => a.clone().lerp(b, clamp(t));
const PAL = [[0, '#dcc590'], [0.18, '#d6c47e'], [0.34, '#c4c872'], [0.5, '#a6cc66'], [0.62, '#86bd58'], [0.74, '#5fa24a'], [0.88, '#3b8a42'], [1, '#2a7a3c']].map(([t, c]) => [t, hex(c)]);
const ramp = m => { for (let i = 1; i < PAL.length; i++) if (m <= PAL[i][0]) return mix(PAL[i - 1][1], PAL[i][1], (m - PAL[i - 1][0]) / (PAL[i][0] - PAL[i - 1][0])); return PAL.at(-1)[1].clone(); };
const ROCK = hex('#8f8b83'), SNOW = hex('#f3f6f8'), RED = hex('#d8a468'), LAWN_G = hex('#86bf5e'), CONIF = hex('#2a6b3a'), FIELD_A = hex('#b9d86c'), FIELD_B = hex('#7fb84f'), SHALLOW = hex('#c8f0ee'), DEEP = hex('#aedcf1');
export const SAND_COLOR = hex('#ead9a6');

function moisture(lon, lat) {                                          // 0 deserto … 1 floresta densa (mapa de umidade feito à mão)
  const g = (cx, cy, sx, sy, a) => a * Math.exp(-(((lon - cx) / sx) ** 2 + ((lat - cy) / sy) ** 2));
  let m = 0.12 + 0.5 * smoothstep(-105, -92, lon);
  m += g(-123.2, 46.5, 2.5, 3.5, 0.85) + g(-122.5, 40.5, 1.6, 2.2, 0.3) + g(-121, 37, 2, 3.2, 0.3) + g(-73, 43.5, 4, 3, 0.3) + g(-84, 33.5, 6, 3.5, 0.28)
     + g(-90, 30.5, 4, 1.8, 0.3) + g(-81.5, 27.8, 2, 2.5, 0.3) + g(-88, 45, 5, 2.5, 0.2);
  m -= g(-113, 35, 6, 3.5, 0.55) + g(-110, 40.5, 5, 3, 0.3) + g(-118.5, 36.5, 2.5, 2.5, 0.4) + g(-101, 34, 3.5, 2.5, 0.2);
  return clamp(m, 0, 1);
}

// mask = { data: Uint8Array(0/1), NX, NZ, CS, minx, minz }  (terra/mar em alta resolução, usada no shader para a costa)
export const gridU = { value: 0 };   // 0..1: visibilidade da grade (controlada pelo zoom)
export async function buildTerrain(meta, mask) {
  const [tj, buf] = await Promise.all([fetch('data/terrain.json').then(r => r.json()), fetch('data/terrain.bin').then(r => r.arrayBuffer())]);
  const { minx, minz, cell, nx, nz } = tj, N = nx * nz;
  const elev = new Int16Array(buf, 0, N), frac = new Uint8Array(buf, N * 2, N), stId = new Uint8Array(buf, N * 3, N), sd = new Int8Array(buf, N * 4, N);
  const R = Math.PI / 180, p1 = 29.5 * R, p2 = 45.5 * R, p0 = 38.7 * R, l0 = -96.6 * R, n = (Math.sin(p1) + Math.sin(p2)) / 2, Cc = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1), rho0 = Math.sqrt(Cc - 2 * n * Math.sin(p0)) / n;
  const inv = (x, z) => { const X = x / meta.K + meta.cx, Zr = z / meta.K + meta.cz, th = Math.atan2(X, Zr + rho0), rho = Math.hypot(X, Zr + rho0); const s = (Cc - (rho * n) ** 2) / (2 * n); return [(l0 + th / n) / R, Math.asin(clamp(s, -1, 1)) / R]; };

  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), wat = new Float32Array(N * 3), sandA = new Float32Array(N), uv = new Float32Array(N * 2), hy = new Float32Array(N), forest = new Float32Array(N), conif = new Uint8Array(N);
  const c = new THREE.Color();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, x = minx + i * cell, z = minz + j * cell, f = frac[k] / 255, s = smoothstep(0.3, 0.7, f), e = elev[k];
    const land = 0.012 + e * HEIGHT_PER_M, y = lerp(WATER_Y, land, s); hy[k] = y; pos.set([x, y, z], k * 3); uv.set([x / 8, z / 8], k * 2);
    const dist = Math.max(0, -sd[k]) * cell; c.copy(mix(SHALLOW, DEEP, (dist - 0.05) / 1.6)); wat.set([c.r, c.g, c.b], k * 3);
    sandA[k] = 1 - smoothstep(40, 120, e);
    const [lon, lat] = inv(x, z), nv = fbm(x * 0.9 + 11, z * 0.9 + 7), nv2 = fbm(x * 0.25, z * 0.25);
    let m = moisture(lon, lat) + (nv - 0.5) * 0.4; if (lon > -92) m += clamp((e - 250) / 700, 0, 0.25); if (e > 1200) m += clamp((e - 1200) / 1500, 0, 0.5); m = clamp(m, 0, 1);
    c.copy(ramp(m)); if (m < 0.3 && lat < 38 && lon < -103) c.lerp(RED, 0.5 * (1 - m / 0.3));
    if (lon > -104 && lon < -80 && lat > 33 && lat < 47 && e < 500 && m > 0.45 && m < 0.85) c.lerp(vnoise(x * 3.1, z * 3.1) > 0.5 ? FIELD_A : FIELD_B, 0.5 * smoothstep(0.35, 0.6, nv2));   // lavouras
    const isConif = (lat > 43 && lon < -108) || lat > 44.5 || e > 1500; conif[k] = isConif ? 1 : 0;
    if (isConif && m > 0.6) c.lerp(CONIF, 0.45 * smoothstep(0.6, 0.9, m));
    c.lerp(ROCK, smoothstep(2200, 3200, e + (nv2 - 0.5) * 500) * 0.85); c.lerp(SNOW, smoothstep(3100, 3800, e + (nv2 - 0.5) * 400));
    c.lerp(LAWN_G, 0.62 * (1 - smoothstep(2200, 3000, e)));   // gramado unificado: o mapa lê como um só
    c.multiplyScalar(0.94 + 0.12 * nv2); col.set([c.r, c.g, c.b], k * 3);
    forest[k] = s < 0.5 ? 0 : smoothstep(0.5, 0.82, m) * (1 - smoothstep(2300, 3000, e));
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, d = a + nx, e = d + 1;
    if ((i + j) & 1) idx.set([a, d, b, b, d, e], q); else idx.set([a, d, e, a, e, b], q); q += 6; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aWater', new THREE.BufferAttribute(wat, 3));
  g.setAttribute('aSand', new THREE.BufferAttribute(sandA, 1)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();

  const dc = document.createElement('canvas'); dc.width = dc.height = 256; const dg = dc.getContext('2d'), im = dg.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const v = 205 + fbm(x / 20, y / 20) * 50 + (Math.random() - 0.5) * 12; im.data.set([v, v, v, 255], (y * 256 + x) * 4); } dg.putImageData(im, 0, 0);
  const tex = new THREE.CanvasTexture(dc); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  const md = new Uint8Array(mask.NX * mask.NZ); for (let k = 0; k < md.length; k++) md[k] = mask.data[k] ? 255 : 0;
  const mtex = new THREE.DataTexture(md, mask.NX, mask.NZ, THREE.RedFormat, THREE.UnsignedByteType); mtex.magFilter = mtex.minFilter = THREE.LinearFilter; mtex.generateMipmaps = false; mtex.needsUpdate = true;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex });
  mat.onBeforeCompile = sh => {                                        // costa nítida: terra x água decididos pela máscara fina, não pelo vértice
    sh.uniforms.uMask = { value: mtex }; sh.uniforms.uMO = { value: new THREE.Vector4(mask.minx, mask.minz, mask.NX * mask.CS, mask.NZ * mask.CS) }; sh.uniforms.uSand = { value: SAND_COLOR }; sh.uniforms.uGrid = gridU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aWater; attribute float aSand; varying vec3 vWater; varying float vSand; varying vec2 vWXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWater = aWater; vSand = aSand; vWXZ = position.xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uMask; uniform vec4 uMO; uniform vec3 uSand; uniform float uGrid; varying vec3 vWater; varying float vSand; varying vec2 vWXZ;\nfloat lmask(vec2 p){ return texture2D(uMask, (p - uMO.xy) / uMO.zw).r; }')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float lm = lmask(vWXZ); float Lc = smoothstep(0.42, 0.58, lm);
        float ar = (lmask(vWXZ + vec2(0.13, 0.)) + lmask(vWXZ - vec2(0.13, 0.)) + lmask(vWXZ + vec2(0., 0.13)) + lmask(vWXZ - vec2(0., 0.13))) * 0.25;
        float sandK = Lc * (1.0 - smoothstep(0.55, 0.97, ar)) * vSand;
        vec3 landC = mix(diffuseColor.rgb, uSand * 1.0, sandK * 0.92);
        diffuseColor.rgb = mix(vWater, landC, Lc);
        vec2 gd = abs(fract(vWXZ - 0.5) - 0.5) / (fwidth(vWXZ) * 1.3); float gln = 1.0 - min(min(gd.x, gd.y), 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), gln * 0.30 * Lc * uGrid);`);
  };
  const mesh = new THREE.Mesh(g, mat);
  const bil = (arr, x, z) => { const fx = clamp((x - minx) / cell, 0, nx - 1.001), fz = clamp((z - minz) / cell, 0, nz - 1.001), i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, k = j * nx + i;
    return arr[k] * (1 - tx) * (1 - tz) + arr[k + 1] * tx * (1 - tz) + arr[k + nx] * (1 - tx) * tz + arr[k + nx + 1] * tx * tz; };
  const near = (arr, x, z) => arr[clamp(Math.round((z - minz) / cell), 0, nz - 1) * nx + clamp(Math.round((x - minx) / cell), 0, nx - 1)];
  return { mesh, heightAt: (x, z) => Math.max(0.012, bil(hy, x, z)), forestAt: (x, z) => bil(forest, x, z), conifAt: (x, z) => near(conif, x, z), stateAt: (x, z) => near(stId, x, z) };
}
