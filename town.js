// Layout das cidades: grade de lotes com ruas a cada 4 células (quarteirões 3x3), rotatória no centro.
// Cada cidade vira uma lista de células (chão + o que está em cima). Sem 3D aqui; só números.
export const P = 0.06;                       // tamanho do lote no mundo
export const K = { RX: 0, RZ: 1, CROSS: 2, ROUND: 3, LOT: 4, PARK: 5, SCHOOL: 6, HOSP: 7, STAD: 8, SIGN: 9, OPEN: 10, WONDER: 11, PALACE: 12, CAPITOL: 13, HALL: 14 };
export const HALL_POS = { i: 2, j: -2 };
export const CAPITOL_POS = { i: -2, j: 2 };
export const PALACE_POS = { i: 2, j: 2 };
export const LANDMARKS = [{ i: -1, j: -1, kind: K.PARK, n: 3, name: 'Park' }, { i: 1, j: -1, kind: K.SCHOOL, n: 6, name: 'School' }, { i: -1, j: 1, kind: K.HOSP, n: 12, name: 'Hospital' }, { i: 1, j: 1, kind: K.STAD, n: 25, name: 'Stadium' }];
export const WONDER_POS = { i: -2, j: -2 };
const mod = (a, m) => ((a % m) + m) % m;
export const isRoadCell = (i, j) => mod(i, 4) === 0 || mod(j, 4) === 0;
const hashStr = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export const lotsPerRing = r => r === 0 ? 0 : 8 * r * 0.5625;

// lotes (não-estrada) ordenados do centro para fora, em anéis quadrados; ângulo desempata
let ORD = [], ORD_R = 0;
export function ensureOrder(R) {
  if (R <= ORD_R) return; ORD = [];
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) if (!isRoadCell(i, j)) ORD.push([i, j, Math.max(Math.abs(i), Math.abs(j)), Math.atan2(j, i)]);
  ORD.sort((u, v) => u[2] - v[2] || u[3] - v[3]); ORD_R = R;
}
export const ringFor = (need, small = false) => small ? (need <= 4 ? 1 : 2) : Math.max(2, Math.ceil((Math.sqrt(Math.max(need, 1) * 1.12 / 0.5625) - 1) / 2) + 1);
// vilarejo: até 4 moradores, sem obras reservadas -> só 1 anel (cabem muito mais cidades no mapa)
export const isHamlet = t => !t.open && !t.wonder && !t.palace && t.houses.length + (t.biz?.length ?? 0) <= 4;

// face da casa: para a rua mais próxima
export function yawFor(i, j, v) {
  const a = mod(i, 4), b = mod(j, 4), da = Math.min(a, 4 - a), db = Math.min(b, 4 - b);
  const alongX = da < db || (da === db && (v & 1));
  if (alongX) return (a <= 2 && a !== 2) ? -Math.PI / 2 : (a === 2 ? ((v & 2) ? Math.PI / 2 : -Math.PI / 2) : Math.PI / 2);
  return (b === 1 || (b === 2 && (v & 2))) ? Math.PI : 0;
}

// Constrói as células de UMA cidade. town: {n, houses[], biz[], wonder:{unlocked,...}|null, open?}
// devolve { cells:[{i,j,k,v,h,b}], maxRing }
export function layoutTown(town, ok = () => true) {
  const cells = [], used = new Set(), key = (i, j) => (i + 500) * 1000 + (j + 500), add = (i, j, k, extra = {}) => { used.add(key(i, j)); cells.push({ i, j, k, v: hashStr(`${town.name}${town.st}${i},${j}`), h: -1, b: -1, ...extra }); };
  if (town.open && !town.biz?.length) { add(0, 0, K.OPEN); if (town.palace) { add(1, 1, K.PALACE); add(-1, 1, K.CAPITOL); } for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) add(i, j, i === 0 ? K.RZ : K.RX); return { cells, maxRing: 2 }; }
  const hamlet = isHamlet(town), hasHall = !hamlet && town.houses.length >= 3, hasCap = !!town.cap && !town.palace && !hamlet, reserved = new Set(hamlet ? [] : LANDMARKS.map(l => key(l.i, l.j))); if (town.wonder) reserved.add(key(WONDER_POS.i, WONDER_POS.j)); if (town.palace) { reserved.add(key(PALACE_POS.i, PALACE_POS.j)); reserved.add(key(CAPITOL_POS.i, CAPITOL_POS.j)); } if (hasHall) reserved.add(key(HALL_POS.i, HALL_POS.j)); if (hasCap) reserved.add(key(CAPITOL_POS.i, CAPITOL_POS.j));
  const need = town.houses.length + (town.biz?.length ?? 0) + reserved.size; ensureOrder(ringFor(need, hamlet) + 2);
  let maxRing = 1;
  for (const l of LANDMARKS) if (!hamlet && ok(l.i, l.j)) add(l.i, l.j, town.houses.length >= l.n ? l.kind : K.SIGN, { lm: l });
  if (town.wonder && ok(WONDER_POS.i, WONDER_POS.j)) add(WONDER_POS.i, WONDER_POS.j, town.wonder.unlocked ? K.WONDER : K.SIGN, { wonder: true });
  if (town.palace && ok(PALACE_POS.i, PALACE_POS.j)) add(PALACE_POS.i, PALACE_POS.j, K.PALACE);
  if ((town.palace || hasCap) && ok(CAPITOL_POS.i, CAPITOL_POS.j)) add(CAPITOL_POS.i, CAPITOL_POS.j, K.CAPITOL);
  if (hasHall && ok(HALL_POS.i, HALL_POS.j)) add(HALL_POS.i, HALL_POS.j, K.HALL);
  let bi = 0, hi = 0;
  for (const [i, j, ring] of ORD) {
    if (bi >= (town.biz?.length ?? 0) && hi >= town.houses.length) break;
    if (reserved.has(key(i, j)) || !ok(i, j)) continue;
    if (bi < (town.biz?.length ?? 0)) add(i, j, K.LOT, { b: bi++ }); else add(i, j, K.LOT, { h: hi++ });
    maxRing = Math.max(maxRing, ring);
  }
  add(0, 0, K.ROUND);
  // ruas: só onde há lote por perto
  const lots = new Set(used); const R = maxRing + 1;
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
    if (!isRoadCell(i, j) || used.has(key(i, j)) || !ok(i, j)) continue;
    let near = false; for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1; b++) if ((a || b) && lots.has(key(i + a, j + b)) && !isRoadCell(i + a, j + b)) { near = true; break; }
    if (!near || (hamlet && Math.max(Math.abs(i), Math.abs(j)) > 1)) continue;
    add(i, j, mod(i, 4) === 0 && mod(j, 4) === 0 ? K.CROSS : mod(i, 4) === 0 ? K.RZ : K.RX);
  }
  return { cells, maxRing };
}
