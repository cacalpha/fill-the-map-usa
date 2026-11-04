import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeToWorld } from './proj.js';
import { SITE } from './site.config.js';
import { buildTerrain, WATER_Y, gridU } from './terrain.js';
import { buildMask } from './landmask.js';
import { makeGeoms, makeDecor, BUILD_ORDER, G0 } from './buildings.js';
import { makeBizModels } from './bizmodels.js';
import { makeWonders } from './landmarks.js';
import { P, K, LANDMARKS, layoutTown, yawFor, ringFor, isHamlet } from './town.js';
import * as GAME from './game.js';
import { clamp, smooth, smoothstep, mulberry, hashStr } from './util.js';
import { initUI } from './ui.js';
import { phaseOf, balanceOf } from './econ.js';

const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);
const mobile = innerWidth < 700;
const T0 = performance.now(), mark = n => { if (q.has('perf')) console.log('MARK', n, Math.round(performance.now() - T0)); };

// ---------- dados ----------
const dataFile = /^[\w.-]+\.json$/.test(q.get('data') ?? '') ? q.get('data') : 'houses.json';
const getJ = (f, d) => fetch(f, { cache: 'no-cache' }).then(r => r.ok ? r.json() : d).catch(() => d);
const [geo, states0, openCities0, hd, bizData, storyData, mandData, INS, LED] = await Promise.all([getJ('data/us.json'), getJ('data/states.json'), getJ('data/open_cities.json', []), getJ('data/' + dataFile, { h: [] }), getJ('data/businesses.json', { b: [] }), getJ('data/stories.json', { s: [] }), getJ('data/mandates.json', { m: [] }), getJ('data/insets.json', { polys: [], states: [], cities: [], proj: {} }), getJ('data/ledger_public.json', { base: {}, bought: {}, spent: {}, salary: {}, bonus: {}, holders: {}, elections: {}, elected: null })]);
const states = [...states0, ...INS.states], openCities = [...openCities0, ...INS.cities];
geo.polys = [...geo.polys, ...INS.polys];
mark('dados');
const toWorld0 = makeToWorld(geo.meta), UPD = 111.2 * 0.0218, insetXZ = (lon, lat, st) => { const p = INS.proj[st], lo = lon > 0 ? lon - 360 : lon; return [p.cx + (lo - p.lon0) * Math.cos(p.lat0 * Math.PI / 180) * UPD * p.k, p.cz - (lat - p.lat0) * UPD * p.k]; };
const toWorld = (lon, lat, st) => (st === 'AK' || st === 'HI') && INS.proj[st] ? insetXZ(lon, lat, st) : toWorld0(lon, lat);
const NOW = Date.now(), launch = Date.parse((hd.launch ?? SITE.launch) + 'T00:00:00Z'), wkStartMs = +GAME.mandateStart(launch);
const weekStale = !!hd.h?.length && (hd.wkStart ? Date.parse(hd.wkStart) < wkStartMs : false);   // dados de uma semana que já fechou: pontos da semana zerados até a próxima atualização
const houses = (hd.h ?? []).map(([h, lat, lon, city, st, n, ts, br, prov, wk, bz], i) => { const [x, z] = toWorld(lon, lat, st); const b8 = [...(br ?? [10, 5, 0, 0, 0, 0, 0]), 0, 0, 0, 0, 0, 0, 0, 0].slice(0, 8); return { h, city, st, n, w: weekStale ? 0 : (wk ?? n), ts, x, z, y: 0, key: `${city}|${st}`, i, br: b8, bz: bz ?? [], prov: !!prov, level: 0, role: 7, cell: -1, stories: 0, hotUntil: 0 }; });
const byHandle = new Map(houses.map(o => [o.h.toLowerCase(), o]));
// stories (+30 e casa em alta 24h) e bônus manuais (pts ≠ 30 ou h:'*' = todo mundo; sem fogo)
for (const e of storyData.s ?? []) { const bonus = e.pts != null || e.h === '*', pts = e.pts ?? GAME.POINTS.story, list = e.h === '*' ? houses : [byHandle.get(String(e.h).toLowerCase())].filter(Boolean);
  for (const o of list) { o.n += pts; o.br[5] += pts; if (e.ts * 1000 >= wkStartMs) o.w += pts; if (!bonus) { o.stories++; o.hotUntil = Math.max(o.hotUntil, e.ts * 1000 + GAME.HOT_MS); } } }
const CREDITS = await fetch('api/game?a=credits').then(r => r.ok ? r.json() : { c: {} }).then(j => j.c || {}).catch(() => ({}));
const LAYOUTS = await fetch('api/game?a=layouts').then(r => r.ok ? r.json() : { l: [] }).then(j => Object.fromEntries((j.l || []).map(x => [x.handle, x]))).catch(() => ({}));
for (const o of houses) { o.level = phaseOf(o.h, LED); o.bal = balanceOf(o, LED, NOW) + (CREDITS[o.h] ?? 0); o.look = LAYOUTS[o.h] ?? null; o.hot = o.hotUntil > NOW; }
const hotHouses = houses.filter(o => o.hot).sort((a, b) => b.hotUntil - a.hotUntil);
const office = GAME.computeOffices(houses, LED.elected);
const cityFounder = new Map(); for (const o of houses) { const f = cityFounder.get(o.key); if (!f || o.ts < f.ts) cityFounder.set(o.key, o); }
for (const o of houses) o.founder = cityFounder.get(o.key) === o;
const stateByCode = new Map(states.map(s => [s.st, s]));
const paidBiz = await fetch('api/game?a=businesses').then(r => r.ok ? r.json() : { b: [] }).catch(() => ({ b: [] })); bizData.b = [...(bizData.b ?? []), ...(paidBiz.b ?? [])];
const businesses = (bizData.b ?? []).filter(b => b.name && b.city && b.st && (!b.end || Date.parse(b.end) > NOW));
const normCity = s => s.replace(/, D\.C\.$/, '').toLowerCase();
const popOf = new Map(openCities.map(c => [`${normCity(c.n)}|${c.st}`, c.pop]));
const FALLBACK = { 'portland|ME': { pop: 68000, lat: 43.6591, lon: -70.2553 } };

// ---------- cena ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xcdeaf7, 1, 100);
scene.background = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#7fc1ee'); gr.addColorStop(0.45, '#b9e0f6'); gr.addColorStop(1, '#e6f5fb'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 3000);
scene.add(new THREE.HemisphereLight(0xffffff, 0x9fc080, 1.55));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.002; scene.add(sun, sun.target);
const SUN_DIR = new THREE.Vector3(-0.5, 1.0, 0.65).normalize();
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xaedcf1 })); ocean.position.y = WATER_Y - 0.04; scene.add(ocean);
const mask = buildMask(geo.polys); mark('mascara');
// ilhas fictícias (pedidos do público): um disco de terra no mar
const ISLANDS = [{ name: 'Ellis Land', lat: 31.2, lon: -78.6, r: 0.8 }].map(d => { const [x, z] = toWorld(d.lon, d.lat); return { ...d, x, z }; });
const isIsl = (x, z) => ISLANDS.some(d => Math.hypot(x - d.x, z - d.z) < d.r), isLand = (x, z) => mask.isLand(x, z) || isIsl(x, z);
const TER = await buildTerrain(geo.meta, mask); TER.mesh.receiveShadow = true; scene.add(TER.mesh); const inInset = (x, z) => z > 25.5 && x < 2 && mask.isLand(x, z), hAt = (x, z) => isIsl(x, z) ? WATER_Y + 0.06 : inInset(x, z) ? 0.03 : TER.heightAt(x, z); mark('terreno');
{ const pos = [], idx = []; let n = 0;
  for (const r of geo.rivers) { const p = r.pts, h = r.w * 0.7;
    for (let i = 0; i < p.length; i++) { const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const y = hAt(p[i][0], p[i][1]) + 0.012;
      pos.push(p[i][0] - dz * h, y, p[i][1] + dx * h, p[i][0] + dz * h, y, p[i][1] - dx * h); if (i) idx.push(n - 2, n - 1, n, n - 1, n + 1, n); n += 2; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8fd0f2, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }))); }
for (const poly of INS.polys) { const ring = poly[0], mk = (sc, y, col) => { let cx = 0, cz = 0; for (const [x, z] of ring) { cx += x; cz += z; } cx /= ring.length; cz /= ring.length; const sh = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(cx + (x - cx) * sc, -(cz + (z - cz) * sc)))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col })); m.position.y = y; m.receiveShadow = true; scene.add(m); }; mk(1.025, 0.004, 0xf1e2b0); mk(1.0, 0.02, 0x86bf5e); }
for (const d of ISLANDS) { const top = WATER_Y + 0.06; const sand = new THREE.Mesh(new THREE.CylinderGeometry(d.r * 1.04, d.r * 1.12, 0.4, 40), new THREE.MeshLambertMaterial({ color: 0xf1e2b0 })); sand.position.set(d.x, top - 0.2 - 0.012, d.z); const grass = new THREE.Mesh(new THREE.CylinderGeometry(d.r * 0.97, d.r * 1.0, 0.4, 40), new THREE.MeshLambertMaterial({ color: 0x78a84f })); grass.position.set(d.x, top - 0.2, d.z); sand.receiveShadow = grass.receiveShadow = true; scene.add(sand, grass); }
for (const l of geo.borders) { const a = new Float32Array(l.length * 3); l.forEach(([x, z], i) => a.set([x, hAt(x, z) + 0.02, z], i * 3)); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.3, gapSize: 0.18, transparent: true, opacity: 0.85 })); line.computeLineDistances(); scene.add(line); }
mark('rios');
const NC = 22, clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.93, fog: false, depthWrite: false }), NC * 5); clouds.frustumCulled = false; scene.add(clouds);
const cl = Array.from({ length: NC }, (_, i) => { const r = mulberry(100 + i); return { x: -70 + r() * 140, z: -45 + r() * 90, y: 3.2 + r() * 3, s: 0.9 + r() * 1.6, v: 0.02 + r() * 0.03, b: Array.from({ length: 5 }, () => [(r() - 0.5) * 2.4, (r() - 0.5) * 0.3, (r() - 0.5) * 1.4, 0.55 + r() * 0.6]) }; });
const cm = new THREE.Object3D();
const updateClouds = t => { let k = 0; for (const c of cl) { const x = ((c.x + t * c.v + 80) % 160) - 80; for (const b of c.b) { cm.position.set(x + b[0] * c.s, c.y + b[1] * c.s, c.z + b[2] * c.s); cm.scale.set(c.s * b[3] * 1.3, c.s * b[3] * 0.42, c.s * b[3] * 0.9); cm.updateMatrix(); clouds.setMatrixAt(k++, cm.matrix); } } clouds.instanceMatrix.needsUpdate = true; };

// ---------- cidades ----------
const towns = [], GC = 0.5, SM = 1.2, small = new Map(), bigT = [], MARGIN = 0.05;
const gkey = (gx, gz) => (gx + 800) * 4000 + (gz + 800);
const register = t => { if (t.r > SM) bigT.push(t); else { const k = gkey(Math.floor(t.x / GC), Math.floor(t.z / GC)); (small.get(k) ?? small.set(k, []).get(k)).push(t); } };
function firstOverlap(x, z, r) {
  for (const t of bigT) if (Math.hypot(t.x - x, t.z - z) < t.r + r + MARGIN) return t;
  const gx = Math.floor(x / GC), gz = Math.floor(z / GC), rg = Math.ceil((r + SM + MARGIN) / GC);
  for (let a = -rg; a <= rg; a++) for (let b = -rg; b <= rg; b++) { const l = small.get(gkey(gx + a, gz + b)); if (l) for (const t of l) if (Math.hypot(t.x - x, t.z - z) < t.r + r + MARGIN) return t; }
  return null;
}
function settle(x0, z0, r) {
  let x = x0, z = z0;
  for (let it = 0; it < 120; it++) { const b = firstOverlap(x, z, r);
    if (!b) { if (isLand(x, z)) return [x, z]; const a = it * 2.39996, rr = 0.2 * Math.sqrt(it + 1); x = x0 + rr * Math.cos(a); z = z0 + rr * Math.sin(a); continue; }
    let dx = x - b.x, dz = z - b.z; const d = Math.hypot(dx, dz); if (d < 1e-6) { dx = Math.cos(it); dz = Math.sin(it); } else { dx /= d; dz /= d; }
    x = b.x + dx * (b.r + r + MARGIN * 1.2); z = b.z + dz * (b.r + r + MARGIN * 1.2); }
  for (let k = 0; k < 2500; k++) { const rr = 0.12 * Math.sqrt(k), a = k * 2.39996, xx = x0 + rr * Math.cos(a), zz = z0 + rr * Math.sin(a); if (isLand(xx, zz) && !firstOverlap(xx, zz, r)) return [xx, zz]; }
  return null;
}
const C = { x: [], z: [], y: [], k: [], v: [], h: [], b: [], t: [], i: [], j: [], w: [], l: [] };   // células de TODAS as cidades
const townByKey = new Map();
function makeTown(t) {     // posiciona + gera células
  t.palace = t.key === 'Washington|DC';
  const ham = isHamlet(t), need = t.houses.length + t.biz.length + (ham ? 0 : 5), R = t.open && !t.biz.length ? 2 : ringFor(need, ham), r = (R + 1.25) * P * 1.12; t.r = r;
  const pos = settle(t.x, t.z, r); if (!pos) return false; t.x = pos[0]; t.z = pos[1];
  const lay = layoutTown(t, (i, j) => isLand(t.x + i * P, t.z + j * P)); t.maxRing = lay.maxRing; t.r = (lay.maxRing + 1.6) * P * 1.12;
  t.y = hAt(t.x, t.z); const hy = (x, z) => Math.max(hAt(x, z), hAt(x + P * 0.5, z + P * 0.5), hAt(x - P * 0.5, z - P * 0.5), hAt(x + P * 0.5, z - P * 0.5), hAt(x - P * 0.5, z + P * 0.5));
  t.c0 = C.x.length;
  for (const c of lay.cells) { const idx = C.x.length; const cx = t.x + c.i * P, cz = t.z + c.j * P, cyy = hy(cx, cz); C.x.push(cx); C.z.push(cz); C.y.push(cyy); C.k.push(c.k); C.v.push(c.v); C.h.push(c.h >= 0 ? t.houses[c.h].i : -1); C.b.push(c.b); C.t.push(towns.length); C.i.push(c.i); C.j.push(c.j); C.w.push(c.wonder ? 1 : 0); C.l.push(c.lm ? c.lm.n : 0);
    if (c.h >= 0) { const o = t.houses[c.h]; o.cell = idx; o.x = C.x[idx]; o.z = C.z[idx]; o.y = cyy; } }
  for (const o of t.houses) if (o.cell < 0) { o.x = t.x; o.z = t.z; o.y = t.y; }   // sem lote (cidade em beira de mar)
  t.c1 = C.x.length; register(t); townByKey.set(t.key, t); towns.push(t); return true;
}
{ // cidades reais
  const groups = new Map(); for (const o of houses) (groups.get(o.key) ?? groups.set(o.key, []).get(o.key)).push(o);
  const bizBy = new Map(); for (const b of businesses) (bizBy.get(`${b.city}|${b.st}`) ?? bizBy.set(`${b.city}|${b.st}`, []).get(`${b.city}|${b.st}`)).push(b);
  const capKeys = new Set(openCities.filter(c => c.cap).map(c => `${c.n.replace(', D.C.', '')}|${c.st}`));
  const real = [...groups.entries()].map(([key, l]) => ({ key, cap: capKeys.has(key), name: l[0].city, st: l[0].st, x: l[0].x, z: l[0].z, ox: l[0].x, oz: l[0].z, houses: l.sort((a, b) => a.ts - b.ts || (a.h < b.h ? -1 : 1)), biz: bizBy.get(key) ?? [], open: false, wonder: null, pop: popOf.get(`${normCity(l[0].city)}|${l[0].st}`) ?? 0 })).sort((a, b) => b.houses.length - a.houses.length);
  const wonderOf = new Map(GAME.WONDERS.map(w => [`${w.city}|${w.st}`, w]));
  // Cidades sem espaço no mapa (subúrbios colados em metrópoles) entram como bairro da cidade colocada mais próxima: ninguém fica sem casa.
  const aliasKeys = new Map(); let pool = real.slice();
  for (let iter = 0; iter < 8; iter++) {
    bigT.length = 0; small.clear(); const failed = [];
    for (const t of pool) { const ham = isHamlet(t), R = ringFor(t.houses.length + t.biz.length + (ham ? 0 : 5), ham), r = (R + 1.25) * P * 1.12; t.r = r; const pos = settle(t.ox, t.oz, r); if (!pos) { failed.push(t); continue; } t.x = pos[0]; t.z = pos[1]; register(t); }
    if (!failed.length) break;
    const placed = pool.filter(t => !failed.includes(t));
    for (const f of failed) { let best = null, bd = 1e9; for (const t of placed) { const d = Math.hypot(t.ox - f.ox, t.oz - f.oz); if (d < bd) { bd = d; best = t; } } if (!best) continue;
      for (const o of f.houses) o.metro = best.name; best.houses.push(...f.houses); best.biz.push(...f.biz); (best.also ??= []).push(f.name); for (const k of [f.key, ...(f.alsoKeys ?? [])]) aliasKeys.set(k, best); if (f.also) best.also.push(...f.also); for (const o of f.houses) o.metro = best.name; }
    for (const t of placed) t.houses.sort((a, b) => a.ts - b.ts || (a.h < b.h ? -1 : 1)); pool = placed.sort((a, b) => b.houses.length - a.houses.length);
  }
  bigT.length = 0; small.clear();
  for (const t of pool) { const w = wonderOf.get(t.key); if (w) { const target = GAME.wonderTarget(t.pop || FALLBACK[`${normCity(t.name)}|${t.st}`]?.pop); t.wonder = { ...w, target, unlocked: t.houses.length >= target, progress: Math.min(1, t.houses.length / target) }; } }
  for (const t of pool) t.n = t.houses.length;
  for (const t of pool) makeTown(t);
  for (const [k, h] of aliasKeys) townByKey.set(k, h);
  mark('layout-real');
  for (const oc of openCities) {   // vagas abertas
    const key = `${oc.n.replace(', D.C.', '')}|${oc.st}`; if (townByKey.has(key)) continue; const [x, z] = toWorld(oc.lon, oc.lat, oc.st), w = wonderOf.get(key);
    const t = { key, name: oc.n.replace(', D.C.', ''), st: oc.st, x, z, houses: [], biz: bizBy.get(key) ?? [], n: 0, open: true, pop: oc.pop, cap: oc.cap, wonder: w ? { ...w, target: GAME.wonderTarget(oc.pop), unlocked: false, progress: 0 } : null };
    makeTown(t);
  }
  for (const [key, list] of bizBy) {   // loja em cidade ainda sem casa: ganha um terreno próprio na coordenada da cidade
    if (townByKey.has(key)) continue; const b0 = list.find(b => b.lat != null); if (!b0) continue;
    const [x, z] = toWorld(b0.lon, b0.lat, b0.st), t = { key, name: b0.city, st: b0.st, x, z, ox: x, oz: z, houses: [], biz: list, n: 0, open: true, wonder: null, pop: popOf.get(`${normCity(b0.city)}|${b0.st}`) };
    t.r = (ringFor(list.length, true) + 1.25) * P * 1.12; const pos = settle(x, z, t.r); if (pos) [t.x, t.z] = pos; makeTown(t);
  }
  for (const w of GAME.WONDERS) { const key = `${w.city}|${w.st}`; if (!townByKey.has(key) && FALLBACK[`${w.city.toLowerCase()}|${w.st}`]) { const f = FALLBACK[`${w.city.toLowerCase()}|${w.st}`], [x, z] = toWorld(f.lon, f.lat); makeTown({ key, name: w.city, st: w.st, x, z, houses: [], biz: [], n: 0, open: true, pop: f.pop, wonder: { ...w, target: GAME.wonderTarget(f.pop), unlocked: false, progress: 0 } }); } }
}
mark('layout-total');
for (const t of towns) for (const b of t.biz) { b.ig = String(b.ig ?? '').replace(/^@/, '').toLowerCase(); const c = t.houses.filter(o => o.bz.includes(b.ig)).sort(GAME.better); b.holder = c[0] ?? null; b.fans = c.length; b.town = t; }
const ncell = C.x.length, cgrid = new Map(), cg = (x, z) => (Math.floor(x) + 800) * 4000 + (Math.floor(z) + 800);
for (let c = 0; c < ncell; c++) { const k = cg(C.x[c], C.z[c]); (cgrid.get(k) ?? cgrid.set(k, []).get(k)).push(c); }
const tgrid = new Map(), tg = (x, z) => (Math.floor(x / 3) + 800) * 4000 + (Math.floor(z / 3) + 800);
towns.forEach((t, i) => { const k = tg(t.x, t.z); (tgrid.get(k) ?? tgrid.set(k, []).get(k)).push(i); });
const inTown = (x, z) => { const gx = Math.floor(x / 3), gz = Math.floor(z / 3); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const i of tgrid.get((gx + a + 800) * 4000 + gz + b + 800) ?? []) { const t = towns[i]; if (Math.hypot(t.x - x, t.z - z) < t.r * 1.05 + 0.04) return true; } return false; };
mark('grades');

// ---------- pontos (visão do país) ----------
const dotTex = fill => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.beginPath(); x.arc(32, 32, 26, 0, 7); if (fill) { x.fillStyle = '#fff'; x.fill(); } x.lineWidth = fill ? 9 : 11; x.strokeStyle = fill ? '#1e2430' : '#fff'; x.stroke(); return new THREE.CanvasTexture(c); };
const dotTexs = { fill: dotTex(true), ring: dotTex(false) };
function dots(list, size, color, order, tex = dotTexs.fill) {
  if (!list.length) return null; const a = new Float32Array(list.length * 3); list.forEach((o, i) => a.set([o.x, (o.y ?? 0) + 0.3, o.z], i * 3));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, color, size, sizeAttenuation: false, alphaTest: 0.35, transparent: true, depthTest: false }));
  p.userData.base = size * clamp(2.2 - 0.45 * Math.log10(Math.max(10, list.length)), 0.35, 1); p.renderOrder = order; p.frustumCulled = false; scene.add(p); return p;
}
const dotLayers = [dots(towns.filter(t => t.open), 9, 0xffd21f, 0, dotTexs.ring), dots(houses.filter(o => o.role === 7 && !o.founder), 4, 0xffffff, 1), dots(houses.filter(o => o.role === 7 && o.founder || o.role >= 5 && o.role < 7), 6, 0xffd21f, 2), dots(houses.filter(o => o.role <= 4), 10, 0xe0483e, 3), dots(hotHouses, 12, 0xff7a1a, 4, dotTexs.ring)].filter(Boolean);

// ---------- instâncias ----------
const GEO = makeGeoms(), WON = makeWonders();
const lam = o => new THREE.MeshLambertMaterial(o), vlam = e => lam({ vertexColors: true, emissive: e ?? 0x000000 });
const CAPG = mobile ? 9000 : 18000, CAPD = mobile ? 900 : 2200, CAPS = mobile ? 5000 : 12000;
const WHITE = new THREE.Color(1, 1, 1);
const I = {}; const mk = (name, geo, mat, cap, tint = false, shadow = true) => { const m = new THREE.InstancedMesh(geo, mat, cap); m.name = name; m.count = 0; m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = true; if (tint) m.setColorAt(0, WHITE); scene.add(m); m.userData.cap = cap; I[name] = m; return m; };
const simpleBody = (() => { const g = new THREE.BoxGeometry(0.62, 0.32, 0.5).translate(0, G0 + 0.16, 0); g.deleteAttribute('uv'); const n = g.attributes.position.count, a = new Float32Array(n * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; })();
const simpleRoof = (() => { const g = new THREE.ConeGeometry(0.46, 0.24, 4).rotateY(Math.PI / 4).scale(1.0, 1, 0.82).translate(0, G0 + 0.32 + 0.12, 0); g.deleteAttribute('uv'); const n = g.attributes.position.count, a = new Float32Array(n * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; })();
const simpleTower = (() => { const g = new THREE.BoxGeometry(0.56, 1, 0.56).translate(0, G0 + 0.5, 0); g.deleteAttribute('uv'); const n = g.attributes.position.count, a = new Float32Array(n * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; })();
const TOWER_H = [1.1, 1.4, 1.8, 3.0, 2.6, 2.5, 3.5, 3.7, 4.3, 4.2, 5.8], TOWER_C = [0xf2e4cc, 0xc9694b, 0x9fb4c4, 0xdfe3e8, 0x58a8e2, 0x4f8fcf, 0xf1e8d4, 0xf3f6f8, 0xe0b040, 0x9fe8ff, 0x2a3040].map(h => new THREE.Color(h));
const skirtGeo = (() => { const g = new THREE.BoxGeometry(1, 3, 1).translate(0, -1.5, 0); g.deleteAttribute('uv'); return g; })();
mk('skirt', skirtGeo, lam({ color: 0x78a84f }), CAPG, false, false);
mk('lot', GEO.lot, vlam(), CAPG, true, false); mk('roadX', GEO.roadX, vlam(), CAPG, false, false); mk('cross', GEO.cross, vlam(), CAPG, false, false); mk('round', GEO.round, vlam(), 3000, false, false); mk('open', GEO.open, vlam(), 3000, false, false); mk('site', GEO.site, vlam(), 3000, false, true); mk('palace', GEO.palace, vlam(), 8, false, true); mk('capitol', GEO.capitol, vlam(), 400, false, true); mk('hall', GEO.hall, vlam(), 4000, false, true);
const beaconM = new THREE.InstancedMesh(GEO.props.beacon ?? GEO.beacon, new THREE.MeshBasicMaterial({ vertexColors: true }), 4500); beaconM.count = 0; beaconM.frustumCulled = false; beaconM.setColorAt(0, WHITE); scene.add(beaconM); I.beacon = beaconM;
GEO.house.forEach((h, k) => { mk('hb' + k, h.body, vlam(0x222222), CAPD, true); mk('hr' + k, h.roof, vlam(0x15181f), CAPD, true); });
BUILD_ORDER.forEach((n, k) => mk('bd' + k, GEO.build[n], vlam(0x1c1c1c), Math.floor(CAPD / 2), true));
mk('sb', simpleBody, vlam(0x222222), CAPS, true); mk('sr', simpleRoof, vlam(0x15181f), CAPS, true); mk('st', simpleTower, vlam(0x1c1c1c), CAPS, true);
for (const n of ['park', 'school', 'hospital', 'stadium']) mk(n, GEO.civic[n], vlam(0x181818), 3000);
mk('bizBody', GEO.civic.biz.body, vlam(0x181818), 800, false); mk('bizAwning', GEO.civic.biz.awning, vlam(0x181818), 800, true);
// prédios detalhados por tipo de loja: corpo, detalhes na cor da empresa, vitrines acesas e placa da logo (na cor da empresa até existir o desenho)
const BZ = makeBizModels(), BZ_TYPES = Object.keys(BZ);
for (const t of BZ_TYPES) { const m = BZ[t]; mk('bzb_' + t, m.body, vlam(0x181818), 300, false); if (m.accent) mk('bza_' + t, m.accent, vlam(0x181818), 300, true); if (m.glow) mk('bzg_' + t, m.glow, new THREE.MeshBasicMaterial({ vertexColors: true }), 300, false, false); mk('bzl_' + t, m.logo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 300, true, false); }
// tipo da loja: as pagas já vêm com o tipo; as antigas (pedidas por direct) têm um texto livre, então adivinha pelo ramo
const bizType = b => BZ[b.type] ? b.type : (s => /coffee|cafe|ice cream|bakery|donut/.test(s) ? 'cafeteria' : /restaurant|pizza|food|grill|bbq/.test(s) ? 'restaurante' : /market|grocery|store|shop/.test(s) ? 'mercado' : /gym|sport|fitness/.test(s) ? 'academia' : /salon|barber|beauty|nail/.test(s) ? 'barbearia' : /auto|garage|car|dealer/.test(s) ? 'concessionaria' : /phone|it|tech|creator|page|office|service|school/.test(s) ? 'tecnologia' : /cinema|movie|theater/.test(s) ? 'cinema' : 'lanchonete')(String(b.type ?? '').toLowerCase());
for (const [id, g] of Object.entries(WON)) mk('w_' + id, g, vlam(0x181818), 60);
mk('fire', GEO.fire, new THREE.MeshBasicMaterial({ vertexColors: true }), 600, false, false);
for (const n of ['tree', 'pine', 'palm', 'bush', 'car', 'lamp', 'flag']) mk('p_' + n, GEO.props[n], vlam(), CAPD * 3, ['tree', 'pine', 'car', 'flag'].includes(n));
// estilo comprado cresce com a fase: o castelo de quem é torre fica tão alto quanto a torre (só estica para cima); cabana e mansão crescem um pouco por inteiro
const skinGrow = (skin, L) => L < 4 ? [1, 1] : skin === 'castle' ? [1.15, Math.max(1, TOWER_H[Math.min(L - 4, TOWER_H.length - 1)] * 0.9 / DEC.skinTop.castle)] : [1 + 0.03 * (L - 3), 1 + 0.03 * (L - 3)];
// itens e estilos comprados na loja (cerca, bandeira, parquinho, tobogã, piscina; cabana, mansão, castelo)
const DEC = makeDecor(); for (const n of ['fence', 'flag', 'playground', 'slide', 'pool']) mk('dc_' + n, DEC[n], vlam(), CAPD); for (const [n, g] of Object.entries(DEC.skins)) mk('sk_' + n, g, vlam(0x1c1c1c), CAPD);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();
function put(name, x, y, z, yaw, sx, sy = sx, sz = sx, col = null) {
  const m = I[name]; if (m.count >= m.userData.cap) return; _q.setFromAxisAngle(_Y, yaw); _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s); m.setMatrixAt(m.count, _m);
  if (col) { const a = m.instanceColor.array, o = m.count * 3; a[o] = col.r; a[o + 1] = col.g; a[o + 2] = col.b; } m.count++;
}
const WALLS = [0xfbf8f2, 0xf7ecd5, 0xe8f1f8, 0xfbe6d6, 0xfdf3c8, 0xeaf3df, 0xf8e6ec, 0xf1ebdc].map(h => new THREE.Color(h)), ROOFS = [0xe7b58e, 0xbdd49c, 0xd9bf9c, 0xf0cfae, 0xb4cde0, 0xe9dcc8, 0xd2ae8f, 0xc9d9aa].map(h => new THREE.Color(h));
const LAWN = [0.92, 0.97, 1, 1.04, 1.08].map(k => new THREE.Color(k, k, k)), TREEC = [0x56a845, 0x62b350, 0x4a9a3c, 0x6cbc58].map(h => new THREE.Color(h)), PINEC = [0x2d6b3a, 0x346f3f, 0x2a6234, 0x3e8048].map(h => new THREE.Color(h));
const CARC = [0xe0483e, 0x3b82f6, 0xf5c542, 0xf4f4f4, 0x22a559, 0x20262f].map(h => new THREE.Color(h)), ROLEC = GAME.ROLES.map(r => new THREE.Color(r.hex));
// casas de quem tem cargo são maiores (presidente > senador > governador > deputado > prefeito > vereador)
const ROLE_SCALE = [1.55, 1.5, 1.4, 1.35, 1.25, 1.18, 1.08, 1];
let sel = null, nearState = { x: 1e9, z: 1e9, d: 0, force: true }, tags = [], fires = [], beacons = [];
function updateNear(cx, cz, dist) {
  const R = clamp(dist * 1.3, 1.2, 44), Rd = clamp(dist * 0.6, 0.5, 2.6), Rp = Rd * 1.25; let cand = [];
  for (let gx = Math.floor(cx - R); gx <= Math.floor(cx + R); gx++) for (let gz = Math.floor(cz - R); gz <= Math.floor(cz + R); gz++) for (const c of cgrid.get((gx + 800) * 4000 + gz + 800) ?? []) { const d = Math.hypot(C.x[c] - cx, C.z[c] - cz); if (d < R) cand.push([d, c]); }
  if (cand.length > CAPG) cand = cand.sort((a, b) => a[0] - b[0]).slice(0, CAPG);
  for (const k in I) I[k].count = 0; tags = []; fires = []; beacons = [];
  for (const [d, c] of cand) {
    const x = C.x[c], y = C.y[c], z = C.z[c], k = C.k[c], v = C.v[c], det = d < Rd;
    put('skirt', x, y, z, 0, P);
    if (k === K.RX) { put('roadX', x, y, z, 0, P); if (d < Rp) { if (v % 6 === 0) put('p_car', x + (((v >> 3) & 1) ? 0.1 : -0.15) * P, y, z + (((v >> 4) & 1) ? 0.22 : -0.22) * P, 0, P * 0.6, P * 0.6, P * 0.6, CARC[v % 6]); if (v % 5 === 0) put('p_lamp', x, y, z - 0.48 * P, 0, P * 1.1); if (v % 2 === 0) put('p_tree', x + 0.1 * P, y, z + (v & 8 ? 0.4 : -0.4) * P, v * 0.37, P * 0.55, P * 0.55, P * 0.55, TREEC[(v >> 12) & 3]); } }
    else if (k === K.RZ) { put('roadX', x, y, z, Math.PI / 2, P); if (d < Rp) { if (v % 6 === 0) put('p_car', x + (((v >> 4) & 1) ? 0.22 : -0.22) * P, y, z + (((v >> 3) & 1) ? 0.1 : -0.15) * P, Math.PI / 2, P * 0.6, P * 0.6, P * 0.6, CARC[v % 6]); if (v % 5 === 0) put('p_lamp', x - 0.48 * P, y, z, Math.PI / 2, P * 1.1); if (v % 2 === 0) put('p_tree', x + (v & 8 ? 0.4 : -0.4) * P, y, z + 0.1 * P, v * 0.37, P * 0.55, P * 0.55, P * 0.55, TREEC[(v >> 12) & 3]); } }
    else if (k === K.CROSS) put('cross', x, y, z, 0, P); else if (k === K.ROUND) put('round', x, y, z, 0, P); else if (k === K.OPEN) put('open', x, y, z, 0, P); else if (k === K.SIGN) { put('site', x, y, z, (v & 3) * Math.PI / 2, P); if (d < Rd * 1.4) { const t = towns[C.t[c]], lm = C.l[c]; tags.push({ x, y: y + P * 1.05, z, kind: 'site', txt: C.w[c] && t.wonder ? `🏗 ${t.wonder.name} · ${Math.round(t.wonder.progress * 100)}%` : `🏗 ${LANDMARKS.find(l => l.n === lm)?.name ?? 'Landmark'} · ${t.n}/${lm}` }); } }
    else if (k === K.CAPITOL) { const t = towns[C.t[c]]; put('capitol', x, y, z, 0, P); beacons.push([x, y + P * 0.74, z, v]); if (d < Rd * 1.6) tags.push({ x, y: y + P * 0.82, z, kind: 'palace', txt: t.palace ? '🏛 U.S. Capitol · Senate & House' : `🏛 ${stateByCode.get(t.st)?.name ?? t.st} State Capitol` }); }
    else if (k === K.HALL) { put('hall', x, y, z, 0, P); beacons.push([x, y + P * 0.99, z, v]); if (d < Rd * 1.6) tags.push({ x, y: y + P * 1.05, z, kind: 'palace', txt: `🗳 ${towns[C.t[c]].name} City Hall` }); }
    else if (k === K.PALACE) { put('palace', x, y, z, 0, P); beacons.push([x, y + P * 0.66, z, v]); if (d < Rd * 1.6) tags.push({ x, y: y + P * 0.85, z, kind: 'palace', txt: office.H.president ? `🏛 White House · @${office.H.president.h}` : '🏛 White House · seat open' }); }
    else {   // lotes
      const civ = k === K.PARK ? 'park' : k === K.SCHOOL ? 'school' : k === K.HOSP ? 'hospital' : k === K.STAD ? 'stadium' : null;
      if (k === K.LOT || k === K.WONDER) put('lot', x, y, z, 0, P, P, P, LAWN[v % 5]); else put('lot', x, y, z, 0, P, P, P, WHITE);
      if (civ) put(civ, x, y, z, (v & 3) * Math.PI / 2, P);
      else if (k === K.WONDER) { const w = towns[C.t[c]].wonder; put('w_' + w.id, x, y, z, 0, P * 1.05); }
      else if (k === K.LOT && C.b[c] >= 0) { const b = towns[C.t[c]].biz[C.b[c]]; const yaw = yawFor(C.i[c], C.j[c], v); const bt = b._bt ??= bizType(b), bc = _c.set(b.color ?? '#e0483e'); put('bzb_' + bt, x, y, z, yaw, P); if (I['bza_' + bt]) put('bza_' + bt, x, y, z, yaw, P, P, P, bc); if (I['bzg_' + bt]) put('bzg_' + bt, x, y, z, yaw, P); put('bzl_' + bt, x, y, z, yaw, P, P, P, bc); if (d < Rd * 1.6) tags.push({ x, y: y + P * 0.78, z, kind: 'biz', txt: b.name, b }); }
      else if (k === K.LOT && C.h[c] >= 0) {
        const o = houses[C.h[c]], L = o.level, S = ROLE_SCALE[o.role], yaw = yawFor(C.i[c], C.j[c], v), wall = WALLS[v % 8], roof = ROOFS[(v >> 4) % 8];
        const skin = o.look?.skin && DEC.skins[o.look.skin] ? o.look.skin : null, items = new Set(o.look?.items ?? []);
        if (det) {
          if (skin) { const g = skinGrow(skin, L); put('sk_' + skin, x, y, z, yaw, P * S * g[0], P * S * g[1], P * S * g[0]); }
          else if (L <= 3) { const hv = L === 0 ? v & 1 : L === 1 ? 2 + (v & 1) : L === 2 ? 4 : 5; put('hb' + hv, x, y, z, yaw, P * S, P * S, P * S, wall); put('hr' + hv, x, y, z, yaw, P * S, P * S, P * S, roof); }
          else put('bd' + (L - 4), x, y, z, yaw, P * S, P * S, P * S, WHITE);
        } else if (L <= 3) { const h = 1 + L * 0.2; put('sb', x, y, z, yaw, P * S, P * h * S, P * S, wall); put('sr', x, y + (h - 1) * 0.32 * P * S, z, yaw, P * S, P * S, P * S, roof); }
        else put('st', x, y, z, 0, P * S, P * S * TOWER_H[L - 4], P * S, TOWER_C[L - 4]);
        if (items.size && d < Rp) {   // itens comprados, nos cantos do lote (girados junto com a casa)
          const cs = Math.cos(yaw), sn = Math.sin(yaw), at = (lx, lz) => [x + (lx * cs + lz * sn) * P, z + (-lx * sn + lz * cs) * P];
          if (items.has('fence')) put('dc_fence', x, y, z, yaw, P);
          if (items.has('pool')) { const [px, pz] = at(0, -0.36); put('dc_pool', px, y, pz, yaw, P); }
          if (items.has('playground')) { const [px, pz] = at(0.33, -0.33); put('dc_playground', px, y, pz, yaw, P); }
          if (items.has('slide')) { const [px, pz] = at(-0.34, 0.32); put('dc_slide', px, y, pz, yaw, P); }
          if (items.has('tree')) { const [px, pz] = at(-0.35, -0.35); put('p_tree', px, y, pz, v * 0.37, P * 1.45, P * 1.45, P * 1.45, TREEC[(v >> 12) & 3]); }
          if (items.has('car')) { const [px, pz] = at(0.36, 0.32); put('p_car', px, y, pz, yaw + Math.PI / 2, P * 0.85, P * 0.85, P * 0.85, CARC[(v >> 5) % 6]); }
        }
        if (items.has('flag') && det) { if (skin || L <= 3) put('dc_flag', x, y + P * S * (skin ? DEC.skinTop[skin] * skinGrow(skin, L)[1] : 0.5 + 0.06 * L), z, yaw, P * S); else { const cs = Math.cos(yaw), sn = Math.sin(yaw); put('dc_flag', x + (0.4 * cs + 0.4 * sn) * P, y + G0 * P, z + (-0.4 * sn + 0.4 * cs) * P, yaw, P * 2.2); } }   // torre: mastro no canto do lote
        if (d < Rp && !items.size) { // jardim
          const h2 = (v >> 8) & 15, pa = L <= 3 ? [[0.38, 0.38], [-0.38, 0.38], [0.38, -0.38], [-0.38, -0.38]][h2 & 3] : [[0.42, 0.42], [-0.42, -0.42]][h2 & 1];
          const kind = h2 < 6 ? 'p_tree' : h2 < 9 ? 'p_bush' : h2 < 11 ? 'p_palm' : h2 < 13 ? 'p_pine' : 'p_tree';
          put(kind, x + pa[0] * P, y, z + pa[1] * P, v * 0.37, P * 0.9, P * 0.9, P * 0.9, kind === 'p_tree' ? TREEC[(v >> 12) & 3] : kind === 'p_pine' ? PINEC[(v >> 12) & 3] : null);
          if (L <= 2 && (v >> 14) & 1) put('p_bush', x - pa[0] * 0.8 * P, y, z + 0.42 * P, 0, P * 0.8);
        }
        if (o.hot) fires.push([x, y + P * S * (L <= 3 ? 0.5 + 0.06 * L : TOWER_H[L - 4] + 0.05), z, v]);
        if (o.role <= 5 && d < Rp * 1.6) put('p_flag', x - 0.42 * P, y, z + 0.42 * P, 0, P * 1.4, P * 1.4, P * 1.4, ROLEC[o.role]);
      }
    }
  }
  for (const k in I) { const m = I[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  nearState = { x: cx, z: cz, d: dist, force: false };
}

// ---------- árvores selvagens ----------
const TMAX = 40000, mkTrees = (cap) => { const geo = [GEO.props.tree, GEO.props.pine].map(g => new THREE.InstancedMesh(g, vlam(), cap)); for (const m of geo) { m.count = 0; m.frustumCulled = false; m.setColorAt(0, WHITE); m.userData.cap = cap; m.castShadow = true; m.receiveShadow = true; scene.add(m); } return geo; };
const treeNear = mkTrees(TMAX), treeFar = mkTrees(30000); let lastNearTrees = '', lastFarTrees = '';
function rebuildTrees(layer, set, cx, cz, Rr, CELLS, DENS, smin, smax, skipR) {
  const cnt = [0, 0], i0 = Math.floor((cx - Rr) / CELLS), i1 = Math.floor((cx + Rr) / CELLS), j0 = Math.floor((cz - Rr) / CELLS), j1 = Math.floor((cz + Rr) / CELLS);
  for (let ix = i0; ix <= i1; ix++) for (let iz = j0; iz <= j1; iz++) {
    if (Math.hypot((ix + 0.5) * CELLS - cx, (iz + 0.5) * CELLS - cz) > Rr + CELLS) continue;
    const rnd = mulberry((ix * 73856093) ^ (iz * 19349663) ^ (layer * 83492791)), ncell = Math.round(CELLS * CELLS * DENS);
    for (let t = 0; t < ncell; t++) {
      const x = (ix + rnd()) * CELLS, z = (iz + rnd()) * CELLS, sc = smin + rnd() * (smax - smin), yaw = rnd() * 6.28, ci = Math.floor(rnd() * 4), br = 0.9 + rnd() * 0.25, keep = rnd();
      if (Math.hypot(x - cx, z - cz) > Rr || (skipR && Math.hypot(x - cx, z - cz) < skipR)) continue;
      const fo = TER.forestAt(x, z) * (0.2 + 0.8 * smoothstep(0.42, 0.62, ((Math.sin(x * 3.1) + Math.cos(z * 2.7) + Math.sin((x + z) * 1.3)) / 6) + 0.5)); if (keep > 0.03 + 0.97 * fo || !isLand(x, z) || inTown(x, z)) continue;
      const k = TER.conifAt(x, z) ? 1 : 0, m = set[k]; if (cnt[k] >= m.userData.cap) continue;
      _q.setFromAxisAngle(_Y, yaw); _p.set(x, hAt(x, z) - 0.002, z); _s.set(sc, sc * (0.9 + rnd() * 0.3), sc); _m.compose(_p, _q, _s); m.setMatrixAt(cnt[k], _m);
      const a = m.instanceColor.array, o = cnt[k] * 3; _c.copy(k ? PINEC[ci] : TREEC[ci]).multiplyScalar(br); a[o] = _c.r; a[o + 1] = _c.g; a[o + 2] = _c.b; cnt[k]++; } }
  for (const k of [0, 1]) { set[k].count = cnt[k]; set[k].instanceMatrix.needsUpdate = true; set[k].instanceColor.needsUpdate = true; }
}

// ---------- seleção ----------
const ring = new THREE.Mesh(GEO.props.ring, new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.95, depthTest: false })); ring.renderOrder = 5; ring.visible = false; scene.add(ring);

// ---------- câmera ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.09; controls.minDistance = 0.3; controls.maxDistance = 330; controls.maxPolarAngle = 1.2; controls.minPolarAngle = 0.1; controls.rotateSpeed = 0.7;
controls.screenSpacePanning = false; controls.zoomToCursor = true; controls.panSpeed = 1.0;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }; controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.addEventListener('change', () => { controls.target.x = clamp(controls.target.x, -55, 55); controls.target.z = clamp(controls.target.z, -36, 46); controls.target.y = hAt(controls.target.x, controls.target.z); });
const desktop = () => innerWidth >= 900;
const countryDist = () => (desktop() ? 54 : 60) / (Math.tan(25 * Math.PI / 180) * Math.min(desktop() ? (innerWidth - 470) / innerHeight : camera.aspect, 1.5));
const placeCam = (tx, tz, dist, elev, yaw) => { const e = elev * Math.PI / 180, y = yaw * Math.PI / 180, ty = hAt(tx, tz); controls.target.set(tx, ty, tz); camera.position.set(tx + dist * Math.sin(y) * Math.cos(e), ty + dist * Math.sin(e), tz + dist * Math.cos(y) * Math.cos(e)); camera.lookAt(controls.target); };
const sph = () => { const v = camera.position.clone().sub(controls.target), d = v.length(); return { d, e: Math.asin(clamp(v.y / d, -1, 1)) * 180 / Math.PI, y: Math.atan2(v.x, v.z) * 180 / Math.PI }; };
let fly = null;
function flyTo(tx, tz, dist, elev, yaw, ms = 2600) { const s = sph(), dy = ((yaw - s.y + 540) % 360) - 180; fly = { t0: performance.now(), ms, from: { x: controls.target.x, z: controls.target.z, d: s.d, e: s.e, y: s.y }, to: { x: tx, z: tz, d: dist, e: Math.min(elev, 68), dy } }; controls.enabled = false; }
function stepFly(now) { if (!fly) return; const k = clamp((now - fly.t0) / fly.ms), s = smooth(k), f = fly.from, t = fly.to, arc = Math.sin(k * Math.PI) * Math.min(1, Math.abs(Math.log(t.d / f.d)) / 3) * 0.35;
  placeCam(f.x + (t.x - f.x) * s, f.z + (t.z - f.z) * s, Math.exp(Math.log(f.d) + (Math.log(t.d) - Math.log(f.d)) * s + arc * 1.5), f.e + (t.e - f.e) * s, f.y + t.dy * s); if (k >= 1) { fly = null; controls.enabled = true; } }
function setView() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  if (q.has('reel')) camera.clearViewOffset(); else if (desktop()) camera.setViewOffset(w, h, -210, Math.round(h * 0.03), w, h); else camera.setViewOffset(w, h, 0, Math.round(h * 0.25), w, h); camera.updateProjectionMatrix(); }
addEventListener('resize', setView); setView(); placeCam(0, 2, countryDist(), 55, 0);

// ---------- rótulos ----------
const labelsEl = $('labels'), pool = (cls, n) => Array.from({ length: n }, () => { const e = document.createElement('div'); e.className = cls; e.style.display = 'none'; labelsEl.append(e); return e; });
const cityLabs = pool('lab', mobile ? 16 : 28), houseLabs = pool('hlab', mobile ? 12 : 22), tagLabs = pool('tlab', mobile ? 6 : 12);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stateLabs = states.map(s => { const e = document.createElement('div'); e.className = 'slab'; e.style.display = 'none'; const g = office.H.governors.get(s.st); e.innerHTML = `${esc(mobile ? s.st : s.name.toUpperCase())}<i>${g ? `♛ @${esc(g.h)}` : 'open'}</i>`; labelsEl.append(e); return e; });
const stateOrder = states.map((_, i) => i).sort((a, b) => states[b].r - states[a].r), pv = new THREE.Vector3();
const toScreen = (x, y, z, top = 0) => { pv.set(x, y, z).project(camera); if (pv.z >= 1 || Math.abs(pv.x) > 1.15 || Math.abs(pv.y) > 1.15) return null; const px = (pv.x * 0.5 + 0.5) * innerWidth, py = (-pv.y * 0.5 + 0.5) * innerHeight; return py < top ? null : [px, py]; };
let nearHouses = [];
function updateLabels(dist) {
  const tx = controls.target.x, tz = controls.target.z, so = clamp((dist - 55) / 40), sbox = [], TOP = mobile ? 100 : 100;
  stateOrder.forEach(i => { const s = states[i], e = stateLabs[i], p = so > 0.02 ? toScreen(s.x, hAt(s.x, s.z) + 0.2, s.z, TOP) : null, w = (mobile ? 4.5 : s.name.length) * (mobile ? 10 : 12.5) + 20;
    if (!p || sbox.some(b => Math.abs(b[0] - p[0]) < (b[2] + w) / 2 && Math.abs(b[1] - p[1]) < 34)) { e.style.display = 'none'; return; } sbox.push([p[0], p[1], w]); e.style.display = 'block'; e.style.opacity = (0.9 * so).toFixed(2); e.style.transform = `translate(${p[0]}px,${p[1]}px) translate(-50%,-50%)`; });
  let list = []; if (dist < 70 && dist > 1.0) { const Rr = clamp(dist * 1.4, 0.8, 50); for (let gx = Math.floor((tx - Rr) / 3); gx <= Math.floor((tx + Rr) / 3); gx++) for (let gz = Math.floor((tz - Rr) / 3); gz <= Math.floor((tz + Rr) / 3); gz++) for (const i of tgrid.get((gx + 800) * 4000 + gz + 800) ?? []) { const t = towns[i]; if (Math.hypot(t.x - tx, t.z - tz) < Rr) list.push(t); }
    list.sort((a, b) => (b.n - a.n) || ((b.pop ?? 0) - (a.pop ?? 0))); }
  const taken = []; let used = 0; const gap = mobile ? 90 : 120;
  for (const t of list) { if (used >= cityLabs.length) break; const p = toScreen(t.x, t.y + (t.open ? 0.12 : 0.2 + 0.015 * (t.maxRing ?? 1)), t.z, TOP); if (!p || taken.some(q => Math.abs(q[0] - p[0]) < gap && Math.abs(q[1] - p[1]) < 34)) continue;
    taken.push(p); const e = cityLabs[used++], key = t.name + t.n + t.open + (t.wonder?.progress ?? 0).toFixed(2); if (e._k !== key) { e._k = key; const lead = t.open ? null : office.H.mayors.get(t.key) ?? cityFounder.get(t.key);
      const sub = t.open ? 'Founder seat open' : `${lead ? (lead.role <= 5 ? GAME.ROLES[lead.role].icon : '⚑') + ' @' + esc(lead.h) : ''}${t.n > 1 ? ' · ' + t.n : ''}`;
      const wd = t.wonder && !t.wonder.unlocked ? `<span class="wd">🏗 ${esc(t.wonder.name)} ${Math.round(t.wonder.progress * 100)}%</span>` : t.wonder ? `<span class="wd">🗽 ${esc(t.wonder.name)}</span>` : '';
      e.innerHTML = `<b>${esc(t.name)}${t.cap ? ' ★' : ''}</b><span>${sub}</span>${wd}`; e.classList.toggle('open', t.open); }
    e.style.display = 'block'; e.style.transform = `translate(${p[0]}px,${p[1]}px) translate(-50%,-100%)`; }
  for (let i = used; i < cityLabs.length; i++) cityLabs[i].style.display = 'none';
  const htaken = []; let h = 0; if (dist < 2.2) for (const o of nearHouses) { if (h >= houseLabs.length) break; if (o === sel) continue; const p = toScreen(o.x, o.y + P * (0.45 + 0.35 * o.level), o.z, TOP); if (!p || htaken.some(q => Math.abs(q[0] - p[0]) < 80 && Math.abs(q[1] - p[1]) < 20)) continue; htaken.push(p);
    const e = houseLabs[h++], kk = o.h + o.role + o.hot + o.founder; if (e._k !== kk) { e._k = kk; e.innerHTML = `${o.hot ? '🔥 ' : ''}@${esc(o.h)}${o.role <= 5 ? `<i style="background:${GAME.ROLES[o.role].color}">${GAME.ROLES[o.role].tag}</i>` : o.founder ? '<i style="background:#ffd21f;color:#1e2430">FOUNDER</i>' : ''}`; e.classList.toggle('hot', o.hot); } e.style.display = 'block'; e.style.transform = `translate(${p[0]}px,${p[1]}px) translate(-50%,-100%)`; }
  for (let i = h; i < houseLabs.length; i++) houseLabs[i].style.display = 'none';
  let tl = 0; if (dist < 3) for (const g of tags) { if (tl >= tagLabs.length) break; const p = toScreen(g.x, g.y, g.z, TOP); if (!p) continue; const e = tagLabs[tl++]; if (e._k !== g.txt) { e._k = g.txt; e.textContent = g.txt; } e.className = 'tlab ' + g.kind; e.style.display = 'block'; e.style.transform = `translate(${p[0]}px,${p[1]}px) translate(-50%,-100%)`; }
  for (let i = tl; i < tagLabs.length; i++) tagLabs[i].style.display = 'none';
}


// ---------- clique: casa, negócio, obra, cidade ou estado ----------
const _ray = new THREE.Raycaster(), _nd = new THREE.Vector2(), _pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _hit = new THREE.Vector3();
function groundAt(px, py) {
  _nd.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); _ray.setFromCamera(_nd, camera); let y = controls.target.y;
  for (let i = 0; i < 4; i++) { _pl.constant = -y; if (!_ray.ray.intersectPlane(_pl, _hit)) return null; y = hAt(_hit.x, _hit.z); }
  return { x: _hit.x, z: _hit.z, y };
}
function pick(px, py) {
  const g = groundAt(px, py); if (!g) return null; const dist = camera.position.distanceTo(controls.target);
  if (dist > 3.2) {   // longe: cidade (se perto) ou estado
    let bt = null, bd = 1e9; for (const t of towns) { const d = Math.hypot(t.x - g.x, t.z - g.z); const lim = Math.max(t.r * 1.3, dist * 0.018); if (d < lim && d < bd) { bd = d; bt = t; } }
    if (bt && dist < 70) return { type: 'town', t: bt };
    let bs = null; bd = 1e9; for (const s of states) { const d = Math.hypot(s.x - g.x, s.z - g.z) / Math.max(s.r, 0.5); if (d < bd) { bd = d; bs = s; } } return bs && bd < 2.2 ? { type: 'state', s: bs } : null;
  }
  const gx = Math.floor(g.x), gz = Math.floor(g.z); let best = null, bd = 1e9; const thr = Math.max(34, 150 / Math.max(0.6, dist));
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const c of cgrid.get((gx + a + 800) * 4000 + gz + b + 800) ?? []) {
    const k = C.k[c]; let kind = null, mid = P * 0.3;
    if (k === K.LOT && C.h[c] >= 0) { kind = 'house'; const L = houses[C.h[c]].level; mid = L <= 3 ? P * (0.25 + 0.06 * L) : P * TOWER_H[L - 4] * 0.5; } else if (k === K.LOT && C.b[c] >= 0) { kind = 'biz'; mid = P * 0.3; }
    else if (k === K.SIGN || k === K.PALACE || k === K.CAPITOL || k === K.HALL || k === K.WONDER || k === K.PARK || k === K.SCHOOL || k === K.HOSP || k === K.STAD) { kind = k === K.CAPITOL ? 'capitol' : k === K.HALL ? 'hall' : k === K.PALACE ? 'palace' : k === K.SIGN ? 'site' : k === K.WONDER ? 'wonder' : 'civic'; mid = P * 0.4; }
    if (!kind) continue; pv.set(C.x[c], C.y[c] + mid, C.z[c]).project(camera); if (pv.z >= 1) continue;
    const d = Math.hypot((pv.x * 0.5 + 0.5) * innerWidth - px, (-pv.y * 0.5 + 0.5) * innerHeight - py); if (d < thr && d < bd) { bd = d; best = { kind, c }; } }
  if (best) { const c = best.c, t = towns[C.t[c]]; if (best.kind === 'house') return { type: 'house', o: houses[C.h[c]] }; if (best.kind === 'biz') return { type: 'biz', b: t.biz[C.b[c]], t }; return { type: best.kind, t, k: C.k[c], lm: C.l[c] }; }
  let bt = null; bd = 1e9; for (const t of towns) { const d = Math.hypot(t.x - g.x, t.z - g.z); if (d < t.r * 1.1 && d < bd) { bd = d; bt = t; } } return bt ? { type: 'town', t: bt } : null;
}
{ const el = renderer.domElement; let dn = null;
  el.addEventListener('pointerdown', e => { dn = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  el.addEventListener('pointerup', e => { if (!dn) return; const moved = Math.hypot(e.clientX - dn.x, e.clientY - dn.y), dt = performance.now() - dn.t; dn = null; if (moved > 7 || dt > 600 || fly) return; const r = pick(e.clientX, e.clientY); if (r) api.onPick?.(r, e.clientX, e.clientY); }); }

// ---------- API para a interface ----------
const FLYV = { elev: 44, yaw: -20 };
const api = {
  day1: Date.parse(SITE.day1 ?? hd.launch ?? SITE.launch), LED, THREE, renderer, scene, camera, controls, houses, towns, office, GAME, states, stateByCode, byHandle, cityFounder, openCities, businesses, launch, hd, mobile, SITE, esc, townByKey, popOf,
  get sel() { return sel; }, set sel(o) { sel = o; }, nearForce: () => { nearState.force = true; }, WONDERS: GAME.WONDERS,
  flyTo, goHome: () => { api.clearSel(); flyTo(0, 2, countryDist(), 55, 0, 2200); }, countryDist,
  flyTown: t => flyTo(t.x, t.z, clamp((t.maxRing + 2) * P * 3.2, 0.7, 12), 46, -15, 2600),
  flyHouse: o => flyTo(o.x, o.z, 0.55 + P * 2.4 + 0.07 * o.level, FLYV.elev, FLYV.yaw, 3200),
  showRing: o => { ring.position.set(o.x, o.y, o.z); ring.scale.setScalar(P * 0.62); ring.visible = true; sel = o; nearState.force = true; },
  clearSel: () => { sel = null; ring.visible = false; nearState.force = true; },
  hotHouses, mandData, weekStale, wkStartMs, pickAt: (x, y) => pick(x, y), toWorld: (lon, lat, st) => toWorld(lon, lat, st),
  zoomBy: f => { const s = sph(); flyTo(controls.target.x, controls.target.z, clamp(s.d * f, 0.32, 320), s.e, s.y, 450); },
  captureFrame: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
  ready: true,
};
initUI(api);
mark('ui-final');

// ---------- loop ----------
const sunOff = new THREE.Vector3(); let lastShadow = 0, frameN = 0;
function frame(now) {
  requestAnimationFrame(frame); if (document.hidden) return; stepFly(now); controls.update(); frameN++;
  const dist = camera.position.distanceTo(controls.target), tx = controls.target.x, tz = controls.target.z;
  const dotScale = 0.5 + 0.5 * clamp((dist - 8) / 180); for (const p of dotLayers) { p.visible = dist > 48; p.material.size = p.userData.base * dotScale; }
  const near = dist < 60; for (const k in I) I[k].visible = near;
  if (near && (nearState.force || Math.hypot(tx - nearState.x, tz - nearState.z) > Math.max(0.35, dist * 0.08) || Math.abs(Math.log(dist / nearState.d)) > 0.22)) {
    updateNear(tx, tz, dist);
    nearHouses = []; const Rl = 2.4; for (let gx = Math.floor(tx - Rl); gx <= Math.floor(tx + Rl); gx++) for (let gz = Math.floor(tz - Rl); gz <= Math.floor(tz + Rl); gz++) for (const c of cgrid.get((gx + 800) * 4000 + gz + 800) ?? []) if (C.h[c] >= 0 && Math.hypot(C.x[c] - tx, C.z[c] - tz) < Rl) nearHouses.push(houses[C.h[c]]);
    nearHouses.sort((a, b) => Math.hypot(a.x - tx, a.z - tz) - Math.hypot(b.x - tx, b.z - tz)); nearHouses = nearHouses.slice(0, 40); }
  // sombras seguem o alvo
  sun.castShadow = dist < 9;
  if (sun.castShadow) { const S = clamp(dist * 1.05, 0.7, 5); if (Math.abs(S - lastShadow) > S * 0.05) { Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 0.1, far: S * 8 + 5 }); sun.shadow.camera.updateProjectionMatrix(); lastShadow = S; }
    sun.target.position.set(tx, controls.target.y, tz); sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, S * 3 + 2); sun.target.updateMatrixWorld(); }
  const NEAR_D = 14, nearR = clamp(dist * 0.9, 0.8, 2.0), farR = clamp(dist * 0.9, 2.5, 26);
  const kp = smooth(clamp((NEAR_D - dist) / (NEAR_D * 0.6))), kf = smoothstep(95, 55, dist) * smoothstep(1.2, 3, dist), nearKey = `${Math.floor(tx / 0.2)},${Math.floor(tz / 0.2)}`, farKey = `${Math.floor(tx)},${Math.floor(tz)},${Math.round(farR * 2)}`;
  for (const m of treeNear) m.visible = dist < NEAR_D; for (const m of treeFar) m.visible = dist < 95 && dist > 1.3;
  if (dist < NEAR_D && nearKey !== lastNearTrees) { lastNearTrees = nearKey; rebuildTrees(0, treeNear, tx, tz, nearR, 0.2, 2200, P * 0.7, P * 1.2, 0); }
  if (dist < 95 && dist > 1.3 && farKey !== lastFarTrees) { lastFarTrees = farKey; rebuildTrees(1, treeFar, tx, tz, farR, 1, 22, 0.16, 0.3, dist < NEAR_D ? nearR + 0.15 : 0); }
  for (const m of treeNear) m.scale.y = Math.max(kp, 0.001); for (const m of treeFar) m.scale.y = Math.max(kf, 0.001);
  clouds.visible = dist > 60; if (clouds.visible && frameN % 2 === 0) updateClouds(now / 1000);
  scene.fog.near = dist * 1.4; scene.fog.far = dist * 14; gridU.value = 0;
  if (near) { const m = I.beacon, ts = now / 1000; m.visible = true; m.count = Math.min(beacons.length, 4500); const ca = m.instanceColor.array; for (let i = 0; i < m.count; i++) { const b = beacons[i], ph = Math.floor(ts * 2.2 + (b[3] % 7) * 0.37) & 1, pulse = 1 + 0.25 * Math.sin(ts * 9 + b[3]); _p.set(b[0], b[1], b[2]); _q.identity(); _s.set(P * pulse * 2.4, P * pulse * 2.4, P * pulse * 2.4); _m.compose(_p, _q, _s); m.setMatrixAt(i, _m); ca[i * 3] = ph ? 0.2 : 1; ca[i * 3 + 1] = ph ? 0.55 : 0.2; ca[i * 3 + 2] = ph ? 1 : 0.25; } m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  if (fires.length && near) { const m = I.fire; m.count = Math.min(fires.length, m.userData.cap); for (let i = 0; i < m.count; i++) { const f = fires[i], t = now / 1000 + f[3], sc = P * 0.9 * (1 + 0.16 * Math.sin(t * 9) + 0.08 * Math.sin(t * 17)); _q.setFromAxisAngle(_Y, t * 2.2); _p.set(f[0], f[1], f[2]); _s.set(sc * (1 + 0.08 * Math.sin(t * 13)), sc * (1 + 0.14 * Math.sin(t * 11 + 1)), sc); _m.compose(_p, _q, _s); m.setMatrixAt(i, _m); } m.instanceMatrix.needsUpdate = true; }
  if (sel && ring.visible) ring.scale.setScalar(P * 0.62 * (1 + 0.06 * Math.sin(now / 250)));
  if (frameN % 2 === 0) updateLabels(dist);
  api.onFrame?.(now, dist);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
if (q.has('reel')) { document.body.classList.add('reel'); controls.enabled = false; }
const capitolCell = (() => { for (let c = 0; c < C.x.length; c++) if (C.k[c] === K.CAPITOL) return { x: C.x[c], y: C.y[c], z: C.z[c] }; return null; })();
const palaceCell = (() => { for (let c = 0; c < C.x.length; c++) if (C.k[c] === K.PALACE) return { x: C.x[c], y: C.y[c], z: C.z[c] }; return null; })();
const bizCell = name => { for (let c = 0; c < C.x.length; c++) if (C.k[c] === K.LOT && C.b[c] >= 0 && towns[C.t[c]].biz[C.b[c]].name === name) return { x: C.x[c], y: C.y[c], z: C.z[c] }; return null; };   // posição de uma loja (usado nos reels)
window.__app = { scene, capitolCell, palaceCell, bizCell, setCam: (...a) => { fly = null; placeCam(...a); nearState.force = true; }, P, K, camera, controls, houses, towns, office, api, flyTo, heightAt: hAt, find: t => api.find?.(t), ready: true };
