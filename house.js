import * as THREE from 'three';
// (trecho colado em index.html pelo patch) casa detalhada: 2 águas, chaminé, porta+alpendre, janelas com floreira, jardim, cerca
export function buildHouse(rotY) {
  const M = (c, em = 0x262626) => new THREE.MeshLambertMaterial({ color: c, emissive: em, transparent: true });
  const root = new THREE.Group(), g = new THREE.Group(); g.rotation.y = rotY; root.add(g);
  const put = (geo, c, x, y, z, em) => { const m = new THREE.Mesh(geo, M(c, em)); m.position.set(x, y, z); g.add(m); return m; };
  const box = (w, h, d, c, x, y, z, em) => put(new THREE.BoxGeometry(w, h, d), c, x, y, z, em);
  const Wd = 0.2, Dp = 0.15, WH = 0.085, RISE = 0.052, OV = 0.018, base = 0.018;
  const WALL = 0xfbf8f2, TRIM = 0xffffff, ROOF = 0x56627a;
  put(new THREE.CylinderGeometry(0.19, 0.19, 0.006, 28), 0x74b84e, 0, 0.003, 0, 0x142210);            // gramado
  box(Wd + 0.014, 0.012, Dp + 0.014, 0xc9ccd2, 0, 0.012, 0);                                          // base
  box(Wd, WH, Dp, WALL, 0, base + WH / 2, 0, 0x333333);                                               // paredes
  const tri = new THREE.Shape([new THREE.Vector2(-Dp / 2, 0), new THREE.Vector2(Dp / 2, 0), new THREE.Vector2(0, RISE)]);
  const gg = new THREE.ExtrudeGeometry(tri, { depth: Wd, bevelEnabled: false }); gg.rotateY(-Math.PI / 2); gg.translate(Wd / 2, 0, 0);
  put(gg, WALL, 0, base + WH, 0, 0x333333);                                                           // empena
  const al = Math.atan2(RISE, Dp / 2), L = Math.hypot(Dp / 2, RISE) + OV;                            // telhado 2 águas
  for (const s of [1, -1]) {
    const m = box(Wd + 2 * OV, 0.008, L, ROOF, 0, base + WH + (RISE - OV * Math.sin(al)) / 2 + 0.004,
      s * (Dp / 2 + OV * Math.cos(al)) / 2, 0x1a1f2a);
    m.rotation.x = s * al;
  }
  box(Wd + 2 * OV, 0.008, 0.016, 0x8a96ae, 0, base + WH + RISE + 0.005, 0, 0x1a1f2a);                 // cumeeira
  box(0.024, 0.05, 0.024, 0xa4503a, 0.062, base + WH + RISE * 0.55 + 0.02, -0.02, 0x2a1008);          // chaminé
  box(0.031, 0.006, 0.031, 0x555a63, 0.062, base + WH + RISE * 0.55 + 0.048, -0.02);
  const F = Dp / 2;                                                                                   // frente (+z)
  box(0.042, 0.058, 0.004, TRIM, -0.06, base + 0.029, F + 0.001, 0x333333);                           // porta
  box(0.032, 0.05, 0.005, 0x8b5a33, -0.06, base + 0.025, F + 0.003, 0x2a1a0a);
  put(new THREE.SphereGeometry(0.0028, 8, 6), 0xe2b53a, -0.051, base + 0.025, F + 0.007, 0x40300a);
  box(0.052, 0.006, 0.024, 0xcfd2d8, -0.06, 0.011, F + 0.012);                                        // degrau
  const aw = box(0.066, 0.005, 0.036, ROOF, -0.06, base + 0.068, F + 0.017, 0x1a1f2a); aw.rotation.x = 0.16;
  for (const dx of [-0.029, 0.029]) box(0.004, 0.058, 0.004, TRIM, -0.06 + dx, base + 0.03, F + 0.032, 0x333333);
  const win = (x, y, z, ry, flowers) => {
    const w = new THREE.Group(); w.position.set(x, y, z); w.rotation.y = ry; g.add(w);
    const add = (geo, c, px, py, pz, em) => { const m = new THREE.Mesh(geo, M(c, em)); m.position.set(px, py, pz); w.add(m); };
    const bx = (a, b, c, col, px, py, pz, em) => add(new THREE.BoxGeometry(a, b, c), col, px, py, pz, em);
    bx(0.046, 0.04, 0.004, TRIM, 0, 0, 0, 0x333333);
    bx(0.036, 0.03, 0.005, 0x9bd6f5, 0, 0, 0.001, 0x3a7fa8);
    bx(0.0035, 0.03, 0.006, TRIM, 0, 0, 0.002, 0x333333); bx(0.036, 0.0035, 0.006, TRIM, 0, 0, 0.002, 0x333333);
    bx(0.052, 0.004, 0.01, TRIM, 0, -0.022, 0.003, 0x333333);
    if (flowers) { bx(0.05, 0.008, 0.008, 0x7a4a2a, 0, -0.028, 0.006, 0x20140a);
      [-0.016, 0, 0.016].forEach((fx, i) => add(new THREE.SphereGeometry(0.0045, 6, 5), [0xe84a5f, 0xffd23f, 0xff8fb1][i], fx, -0.022, 0.007, 0x401018)); }
  };
  win(0.02, base + 0.05, F + 0.001, 0, true); win(0.075, base + 0.05, F + 0.001, 0, true);
  win(Wd / 2 + 0.001, base + 0.045, 0, Math.PI / 2, false); win(-Wd / 2 - 0.001, base + 0.045, 0, -Math.PI / 2, false);
  { const r = put(new THREE.CircleGeometry(0.013, 16), TRIM, Wd / 2 + 0.001, base + WH + 0.02, 0, 0x333333); r.rotation.y = Math.PI / 2;  // óculo
    const r2 = put(new THREE.CircleGeometry(0.0095, 16), 0x9bd6f5, Wd / 2 + 0.0015, base + WH + 0.02, 0, 0x3a7fa8); r2.rotation.y = Math.PI / 2; }
  box(0.032, 0.002, 0.06, 0xd9cdb4, -0.06, 0.007, F + 0.04);                                          // caminho
  for (let x = -0.12; x <= 0.121; x += 0.03) if (x < -0.09 || x > -0.03) box(0.005, 0.024, 0.005, TRIM, x, 0.018, F + 0.05, 0x333333);
  for (const [a, b] of [[-0.12, -0.09], [-0.03, 0.12]]) for (const y of [0.016, 0.026]) box(b - a, 0.004, 0.003, TRIM, (a + b) / 2, y, F + 0.05, 0x333333);
  [[-0.098, F + 0.012, 0x2e8b3a], [0.102, F + 0.016, 0x3a9a2c], [0.11, -0.03, 0x2f8626], [-0.108, -0.02, 0x3b9a2c]].forEach(([x, z, c], i) => {  // arbustos
    const b = put(new THREE.IcosahedronGeometry(0.017, 1), c, x, 0.02, z, 0x0e2a0e); b.scale.set(1, 0.85, 1);
    for (let k = 0; k < 3; k++) put(new THREE.SphereGeometry(0.0035, 6, 5), [0xe84a5f, 0xffd23f, 0xffffff][(i + k) % 3],
      x + (k - 1) * 0.009, 0.026 + (k % 2) * 0.006, z + 0.012, 0x302010); });
  const mats = []; root.traverse(m => m.isMesh && mats.push(m.material));
  return { root, mats };
}

export function flagTexture(text, color = '#ffd21f') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 512, 128); x.strokeStyle = '#111'; x.lineWidth = 12; x.strokeRect(6, 6, 500, 116);
  x.fillStyle = '#111'; x.font = '900 60px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 256, 68); return new THREE.CanvasTexture(c);
}
