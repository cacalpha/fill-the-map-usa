// Máscara terra/mar em alta resolução (0.05 do mundo ≈ 2 km), feita dos polígonos reais dos estados.
export function buildMask(polys, CS = 0.05, PAD = 1) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; const edges = [];
  for (const poly of polys) for (const ring of poly) for (let i = 1; i < ring.length; i++) { const [ax, az] = ring[i - 1], [bx, bz] = ring[i];
    edges.push(ax, az, bx, bz); x0 = Math.min(x0, ax); x1 = Math.max(x1, ax); z0 = Math.min(z0, az); z1 = Math.max(z1, az); }
  const minx = x0 - PAD, minz = z0 - PAD, NX = Math.ceil((x1 - x0 + 2 * PAD) / CS), NZ = Math.ceil((z1 - z0 + 2 * PAD) / CS), data = new Uint8Array(NX * NZ);
  for (let j = 0; j < NZ; j++) { const z = minz + (j + 0.5) * CS, xs = [];
    for (let e = 0; e < edges.length; e += 4) { const za = edges[e + 1], zb = edges[e + 3]; if ((za <= z) !== (zb <= z)) xs.push(edges[e] + (z - za) * (edges[e + 2] - edges[e]) / (zb - za)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) { const a = Math.max(0, Math.ceil((xs[k] - minx) / CS - 0.5)), b = Math.min(NX - 1, Math.floor((xs[k + 1] - minx) / CS - 0.5)); for (let i = a; i <= b; i++) data[j * NX + i] = 1; } }
  const isLand = (x, z) => { const i = Math.floor((x - minx) / CS), j = Math.floor((z - minz) / CS); return i >= 0 && j >= 0 && i < NX && j < NZ && data[j * NX + i] === 1; };
  return { data, NX, NZ, CS, minx, minz, isLand };
}
