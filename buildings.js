// Peças 3D das cidades. TUDO desenhado num "lote unitário" (1 x 1, origem no centro, chão em y = G0) e depois escalado pelo
// tamanho do lote no mundo. Cores no vértice (para instanciar). Casas/telhados levam cor por instância (tint) para variar.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const G0 = 0.032;                         // altura do gramado do lote
const WIN = 0x7db6d8, FRAME = 0xffffff, DOOR = 0x8b5a33, DARK = 0x2f4d68, BRICK = 0x9a5b45, STONE = 0xd9d2c3, GOLD = 0xe3b43c;

const bx = (x, y, z, w, h, d, c) => [new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), c];
const cy = (x, y, z, rb, rt, h, c, s = 16) => [new THREE.CylinderGeometry(rt, rb, h, s).translate(x, y + h / 2, z), c];
const sp = (x, y, z, r, c, ws = 12, hs = 9) => [new THREE.SphereGeometry(r, ws, hs).translate(x, y, z), c];
const hip = (x, y, z, w, d, h, c, ov = 0.05) => [new THREE.ConeGeometry((w / 2 + ov) * Math.SQRT2, h, 4).rotateY(Math.PI / 4).scale(1, 1, (d / 2 + ov) / (w / 2 + ov)).translate(x, y + h / 2, z), c];
function gable(x, y, z, w, d, h, c, ridgeX = true, ov = 0.05) {   // telhado 2 águas; cumeeira ao longo de X (ridgeX) ou de Z
  const span = (ridgeX ? d : w) + 2 * ov, len = (ridgeX ? w : d) + 2 * ov;
  const g = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(0, h)]), { depth: len, bevelEnabled: false });
  if (ridgeX) { g.rotateY(Math.PI / 2); g.translate(x - len / 2, y, z); } else g.translate(x, y, z - len / 2);
  return [g, c];
}
const win = (x, y, z, w, h, face = 'f') => { const parts = [];   // janela com moldura e peitoril; face f=+z b=-z r=+x l=-x
  const P = (px, py, pz, pw, ph, pd, c) => face === 'f' ? bx(x + px, y + py, z + pz, pw, ph, pd, c) : face === 'b' ? bx(x - px, y + py, z - pz, pw, ph, pd, c) : face === 'r' ? bx(x + pz, y + py, z - px, pd, ph, pw, c) : bx(x - pz, y + py, z + px, pd, ph, pw, c);
  parts.push(P(0, 0, 0.0, w + 0.03, h + 0.03, 0.012, FRAME), P(0, 0.012, 0.007, w, h - 0.01, 0.008, WIN), P(0, h / 2, 0.01, w + 0.025, 0.012, 0.01, FRAME), P(0, -0.02, 0.014, w + 0.045, 0.014, 0.022, FRAME)); return parts; };
const door = (x, y, z, w = 0.1, h = 0.17, face = 'f') => { const P = (px, py, pz, pw, ph, pd, c) => face === 'f' ? bx(x + px, y + py, z + pz, pw, ph, pd, c) : bx(x - px, y + py, z - pz, pw, ph, pd, c);
  return [P(0, 0, 0, w + 0.03, h + 0.02, 0.012, FRAME), P(0, 0, 0.007, w, h, 0.01, DOOR), P(w * 0.3, h * 0.45, 0.016, 0.012, 0.012, 0.01, GOLD)]; };
const trim = (x, y, z, w, h, d) => bx(x, y, z, w, h, d, FRAME);

// aceita listas aninhadas de [geom,cor]; achata mantendo pares
const flat = list => { const out = []; const walk = a => { if (a.length === 2 && a[0]?.isBufferGeometry) out.push(a); else for (const x of a) walk(x); }; walk(list); return out; };
const col = list => mergeGeometries(flat(list).map(([g, hex]) => { const ng = g.index ? g.toNonIndexed() : g; ng.deleteAttribute('uv'); const c = new THREE.Color(hex), n = ng.attributes.position.count, arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3); ng.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return ng; }));

// ---------- terreno do lote ----------
const lotGround = () => col([bx(0, 0, 0, 1, 0.02, 1, 0xf1efe8), bx(0, 0.02, 0, 0.9, 0.012, 0.9, 0xa4d67f)]);
const ASPH = 0x767c86, CURB = 0xf3f1ea;
const SIDE = 0xeceae2, RW = 0.62;   // calçada clara por baixo; asfalto mais estreito por cima
const roadX = () => col([bx(0, 0, 0, 1, 0.02, 1, SIDE), bx(0, 0.02, 0, 1, 0.008, RW, ASPH), bx(-0.25, 0.028, 0, 0.3, 0.004, 0.03, 0xf4f4f0), bx(0.25, 0.028, 0, 0.3, 0.004, 0.03, 0xf4f4f0), bx(0, 0.02, RW / 2, 1, 0.012, 0.03, CURB), bx(0, 0.02, -RW / 2, 1, 0.012, 0.03, CURB)]);
const cross = () => col([bx(0, 0, 0, 1, 0.02, 1, SIDE), bx(0, 0.02, 0, 1, 0.008, RW, ASPH), bx(0, 0.02, 0, RW, 0.008, 1, ASPH), ...[-1, 1].flatMap(s => [-0.2, -0.1, 0, 0.1, 0.2].flatMap(k => [bx(s * 0.37, 0.028, k, 0.1, 0.004, 0.05, 0xf4f4f0), bx(k, 0.028, s * 0.37, 0.05, 0.004, 0.1, 0xf4f4f0)]))]);
const roundabout = () => col([bx(0, 0, 0, 1, 0.02, 1, ASPH), cy(0, 0.02, 0, 0.4, 0.4, 0.014, 0xd9d9d6, 28), cy(0, 0.034, 0, 0.35, 0.35, 0.012, 0x8fd16b, 28),
  cy(0, 0.046, 0, 0.17, 0.17, 0.05, STONE, 20), cy(0, 0.05, 0, 0.14, 0.14, 0.055, 0x7fd0f0, 20), cy(0, 0.05, 0, 0.03, 0.04, 0.17, STONE, 10), sp(0, 0.235, 0, 0.05, 0xbfe9fb),
  cy(0.26, 0.046, 0.0, 0.006, 0.006, 0.5, 0xe5e5e5, 6), bx(0.26 - 0.13, 0.46, 0, 0.26, 0.09, 0.008, 0xffd21f)]);
const openSeat = () => col([bx(0, 0, 0, 1, 0.02, 1, ASPH), cy(0, 0.02, 0, 0.4, 0.4, 0.014, 0xcfc9ba, 28), ...Array.from({ length: 12 }, (_, i) => [new THREE.BoxGeometry(0.1, 0.012, 0.035).rotateY(-i / 12 * 6.283).translate(0.34 * Math.cos(i / 12 * 6.283), 0.04, 0.34 * Math.sin(i / 12 * 6.283)), 0xffd21f]), cy(0, 0.034, 0, 0.006, 0.006, 0.5, 0xe5e5e5, 6), bx(-0.13, 0.48, 0, 0.26, 0.09, 0.008, 0xffd21f)]);
const signLot = () => col([bx(0, 0, 0, 1, 0.02, 1, 0xd9d9d6), bx(0, 0.02, 0, 0.9, 0.012, 0.9, 0xb9c98a), bx(-0.3, G0, 0.3, 0.025, 0.28, 0.025, 0x7a4a2a), bx(0.3, G0, 0.3, 0.025, 0.28, 0.025, 0x7a4a2a), bx(0, G0 + 0.12, 0.3, 0.7, 0.16, 0.02, 0xffd21f),
  ...[-0.4, -0.13, 0.13, 0.4].map(k => cy(k, G0, 0.44, 0.03, 0.015, 0.1, 0xff7a1a, 8)), bx(0, G0, -0.1, 0.22, 0.12, 0.2, 0xcfc9ba)]);

// obra: canteiro com andaime, guindaste, tapume e placa (cidade ainda não chegou na meta)
const siteLot = () => col([bx(0, 0, 0, 1, 0.02, 1, 0xd9d9d6), bx(0, 0.02, 0, 0.9, 0.012, 0.9, 0xcdbf9f), bx(0.02, G0, 0.04, 0.6, 0.03, 0.46, 0xb4afa4),
  bx(-0.14, G0 + 0.03, 0.02, 0.26, 0.2, 0.3, 0xc9b8a0), bx(-0.14, G0 + 0.23, 0.02, 0.26, 0.012, 0.3, 0x9a8d78),
  ...[[-0.3, -0.16], [0.3, -0.16], [-0.3, 0.24], [0.3, 0.24]].map(([x, z]) => cy(x, G0 + 0.03, z, 0.008, 0.008, 0.46, 0x9aa3ad, 6)),
  ...[0.14, 0.28, 0.42].flatMap(y => [bx(0, G0 + 0.03 + y, -0.16, 0.6, 0.01, 0.01, 0x9aa3ad), bx(0, G0 + 0.03 + y, 0.24, 0.6, 0.01, 0.01, 0x9aa3ad), bx(-0.3, G0 + 0.03 + y, 0.04, 0.01, 0.01, 0.4, 0x9aa3ad), bx(0.3, G0 + 0.03 + y, 0.04, 0.01, 0.01, 0.4, 0x9aa3ad)]),
  bx(0.4, G0, -0.34, 0.045, 1.0, 0.045, 0xf2c230), ...[0.1, 0.26, 0.42, 0.58, 0.74, 0.9].map(y => bx(0.4, G0 + y, -0.34, 0.05, 0.012, 0.05, 0xd9a520)),
  bx(0.02, G0 + 1.0, -0.34, 0.8, 0.035, 0.035, 0xf2c230), bx(0.02, G0 + 1.035, -0.34, 0.8, 0.012, 0.012, 0xd9a520), bx(0.46, G0 + 0.9, -0.34, 0.09, 0.09, 0.07, 0x6b6f78), bx(0.34, G0 + 0.94, -0.3, 0.07, 0.07, 0.07, 0x3b6fb8),
  cy(-0.2, G0 + 0.52, -0.34, 0.003, 0.003, 0.48, 0x333333, 4), bx(-0.2, G0 + 0.46, -0.34, 0.05, 0.05, 0.05, 0xe0483e),
  ...[-0.4, -0.24, -0.08, 0.08, 0.24, 0.4].map((x, i) => bx(x, G0, 0.46, 0.14, 0.09, 0.012, i % 2 ? 0x2a2f3a : 0xffd21f)),
  ...[-0.46, 0.46].map(x => bx(x, G0, 0.0, 0.012, 0.09, 0.9, 0xffd21f)),
  bx(-0.32, G0, 0.36, 0.02, 0.2, 0.02, 0x7a4a2a), bx(0.0, G0 + 0.14, 0.36, 0.6, 0.12, 0.016, 0xffd21f), bx(0.0, G0 + 0.17, 0.372, 0.4, 0.014, 0.004, 0x2a2f3a),
  ...[-0.44, 0.44].map(k => cy(k, G0, 0.44, 0.03, 0.015, 0.1, 0xff7a1a, 8))]);
// Casa Branca (sede do Presidente): em Washington D.C.
const palaceLot = () => col([bx(0, 0, 0, 1, 0.02, 1, 0xd9d9d6), bx(0, 0.02, 0, 0.94, 0.012, 0.94, 0x74c653), bx(0, G0, 0.36, 0.12, 0.006, 0.3, 0xe5dcc3),
  bx(0, G0, -0.08, 0.6, 0.26, 0.34, 0xf7f5ef), bx(-0.4, G0, -0.08, 0.2, 0.17, 0.26, 0xf0ede4), bx(0.4, G0, -0.08, 0.2, 0.17, 0.26, 0xf0ede4),
  bx(0, G0 + 0.26, -0.08, 0.64, 0.025, 0.38, 0xd8d4c8), bx(-0.4, G0 + 0.17, -0.08, 0.22, 0.02, 0.3, 0xd8d4c8), bx(0.4, G0 + 0.17, -0.08, 0.22, 0.02, 0.3, 0xd8d4c8),
  ...[-0.21, -0.126, -0.042, 0.042, 0.126, 0.21].map(x => cy(x, G0, 0.15, 0.014, 0.014, 0.23, 0xffffff, 8)), bx(0, G0 + 0.23, 0.15, 0.5, 0.03, 0.12, 0xffffff), gable(0, G0 + 0.26, 0.15, 0.5, 0.12, 0.08, 0xffffff, true, 0.01),
  ...[-0.26, -0.13, 0.13, 0.26].map(x => win(x, G0 + 0.1, 0.095, 0.08, 0.1)), ...[-0.4, 0.4].map(x => win(x, G0 + 0.06, 0.055, 0.07, 0.07)),
  cy(0.43, G0, 0.34, 0.007, 0.007, 0.62, 0xdddddd, 6), bx(0.5, G0 + 0.5, 0.34, 0.14, 0.08, 0.006, 0xb22234), bx(0.46, G0 + 0.53, 0.34, 0.06, 0.05, 0.008, 0x3c3b6e),
  bx(0, G0, 0.47, 0.9, 0.05, 0.008, 0x2a2f3a), bx(-0.45, G0, 0.1, 0.008, 0.05, 0.74, 0x2a2f3a), bx(0.45, G0, 0.1, 0.008, 0.05, 0.74, 0x2a2f3a),
  sp(-0.34, G0 + 0.12, 0.34, 0.09, 0x2f8626, 9, 7), cy(-0.34, G0, 0.34, 0.015, 0.02, 0.06, 0x7a4a2a, 6), sp(-0.2, G0 + 0.06, 0.4, 0.05, 0x3aa045, 8, 6)]);
// Capitólio dos EUA (Senado e Câmara): base larga, pórtico, tambor e cúpula branca com estátua
const capitolLot = () => col([bx(0, 0, 0, 1, 0.02, 1, 0xd9d9d6), bx(0, 0.02, 0, 0.94, 0.012, 0.94, 0x74c653), bx(0, G0, 0.4, 0.18, 0.006, 0.26, 0xe5dcc3),
  bx(0, G0, -0.06, 0.86, 0.17, 0.4, 0xf4f1ea), bx(-0.34, G0 + 0.17, -0.06, 0.2, 0.05, 0.3, 0xe7e3d8), bx(0.34, G0 + 0.17, -0.06, 0.2, 0.05, 0.3, 0xe7e3d8),
  ...[-0.31, -0.2, -0.09, 0.02, 0.13, 0.24].map(x => cy(x + 0.035, G0, 0.18, 0.016, 0.016, 0.15, 0xffffff, 8)), bx(0, G0 + 0.15, 0.18, 0.5, 0.025, 0.1, 0xffffff), gable(0, G0 + 0.175, 0.18, 0.5, 0.1, 0.06, 0xf4f1ea, true, 0.01),
  ...[-0.3, -0.18, 0.18, 0.3].map(x => win(x, G0 + 0.07, 0.145, 0.07, 0.07)), bx(0, G0 + 0.17, -0.06, 0.4, 0.05, 0.3, 0xece8dd),
  cy(0, G0 + 0.22, -0.06, 0.2, 0.2, 0.1, 0xf8f6f0, 24), ...Array.from({ length: 12 }, (_, i) => cy(0.18 * Math.cos(i / 12 * 6.283), G0 + 0.22, -0.06 + 0.18 * Math.sin(i / 12 * 6.283), 0.012, 0.012, 0.09, 0xffffff, 6)),
  cy(0, G0 + 0.31, -0.06, 0.19, 0.18, 0.025, 0xe9e5d9, 24), [new THREE.SphereGeometry(0.17, 20, 12, 0, 6.283, 0, 1.45).translate(0, G0 + 0.335, -0.06), 0xfafaf7],
  cy(0, G0 + 0.495, -0.06, 0.05, 0.04, 0.05, 0xf1ede2, 12), cy(0, G0 + 0.545, -0.06, 0.012, 0.008, 0.1, 0xd9b25a, 6), sp(0, G0 + 0.65, -0.06, 0.012, 0xffd54a, 6, 5),
  cy(0.42, G0, 0.4, 0.007, 0.007, 0.45, 0xdddddd, 6), bx(0.49, G0 + 0.36, 0.4, 0.13, 0.07, 0.006, 0xb22234), bx(0, G0, 0.47, 0.9, 0.04, 0.008, 0x2a2f3a),
  sp(-0.34, G0 + 0.1, 0.38, 0.08, 0x2f8626, 8, 6), sp(0.3, G0 + 0.08, 0.4, 0.06, 0x3aa045, 8, 6)]);
// Prefeitura (local de votação da cidade): fachada clara, torre azul com relógio, faixa azul e bandeira. Chamativa de longe.
const hallLot = () => col([bx(0, 0, 0, 1, 0.02, 1, 0xd9d9d6), bx(0, 0.02, 0, 0.94, 0.012, 0.94, 0x74c653), bx(0, G0, 0.4, 0.2, 0.006, 0.24, 0xe5dcc3),
  bx(0, G0, -0.02, 0.78, 0.26, 0.5, 0xf8f4ea), bx(0, G0 + 0.26, -0.02, 0.84, 0.03, 0.56, 0x2d6cdf), bx(0, G0 + 0.03, 0.24, 0.8, 0.03, 0.01, 0x2d6cdf),
  ...[-0.28, -0.14, 0, 0.14, 0.28].map(x => cy(x, G0, 0.27, 0.017, 0.017, 0.2, 0xffffff, 8)), bx(0, G0 + 0.2, 0.27, 0.74, 0.025, 0.1, 0xffffff), gable(0, G0 + 0.225, 0.27, 0.74, 0.1, 0.07, 0x2d6cdf, true, 0.01),
  ...[-0.3, -0.15, 0.15, 0.3].map(x => win(x, G0 + 0.08, 0.235, 0.08, 0.1)),
  bx(0, G0 + 0.29, -0.02, 0.26, 0.3, 0.26, 0xf1ede2), ...[-0.07, 0.07].map(x => win(x, G0 + 0.4, 0.115, 0.06, 0.09)), cy(0, G0 + 0.43, 0.115, 0.045, 0.045, 0.012, 0xffffff, 16), bx(0, G0 + 0.59, -0.02, 0.3, 0.025, 0.3, 0x2d6cdf), hip(0, G0 + 0.615, -0.02, 0.26, 0.26, 0.22, 0x2d6cdf, 0.01),
  cy(0, G0 + 0.835, -0.02, 0.006, 0.006, 0.12, 0xdddddd, 6), bx(0.05, G0 + 0.9, -0.02, 0.1, 0.055, 0.006, 0xb22234),
  bx(-0.4, G0, 0.4, 0.012, 0.01, 0.012, 0x888888), sp(-0.36, G0 + 0.1, 0.4, 0.08, 0x2f8626, 8, 6), sp(0.36, G0 + 0.08, 0.38, 0.06, 0x3aa045, 8, 6)]);
const beaconGeo = () => col([sp(0, 0, 0, 0.06, 0xffffff, 10, 8), cy(0, -0.02, 0, 0.012, 0.012, 0.02, 0xdddddd, 6)]);
const fireGeo = () => col([[new THREE.ConeGeometry(0.1, 0.34, 7).translate(0, 0.17, 0), 0xff7a1a], [new THREE.ConeGeometry(0.06, 0.26, 7).translate(0.03, 0.13, 0.02), 0xffc21f], [new THREE.ConeGeometry(0.045, 0.2, 6).translate(-0.05, 0.1, -0.03), 0xff5a1a], [new THREE.TorusGeometry(0.14, 0.012, 5, 16).rotateX(Math.PI / 2).translate(0, 0.02, 0), 0xffb02e]]);

// ---------- casas (4 níveis × variantes) ----------
function cottageA() {   // hip roof clássico
  const body = [bx(0, G0, -0.04, 0.6, 0.3, 0.46, 0xffffff), ...win(-0.19, G0 + 0.12, 0.2, 0.1, 0.1), ...win(0.19, G0 + 0.12, 0.2, 0.1, 0.1), ...door(0, G0, 0.2), ...win(0.3, G0 + 0.12, -0.04, 0.1, 0.1, 'r'), ...win(-0.3, G0 + 0.12, -0.04, 0.1, 0.1, 'l'),
    bx(0, G0, 0.3, 0.22, 0.02, 0.14, 0xcfcfc8), bx(0.02, G0, 0.4, 0.1, 0.012, 0.3, 0xd8cdb4), trim(0, G0 + 0.29, -0.04, 0.62, 0.015, 0.48)];
  const roof = [hip(0, G0 + 0.3, -0.04, 0.6, 0.46, 0.24, 0xffffff, 0.06), bx(0.2, G0 + 0.4, -0.12, 0.07, 0.22, 0.07, 0x8a6a5a)];
  return { body: col(body), roof: col(roof) };
}
function cottageB() {   // gable com garagem
  const body = [bx(-0.06, G0, -0.06, 0.5, 0.28, 0.44, 0xffffff), bx(0.34, G0, 0.0, 0.26, 0.2, 0.36, 0xffffff), ...win(-0.22, G0 + 0.1, 0.16, 0.09, 0.1), ...door(0.02, G0, 0.16, 0.09, 0.16), bx(0.34, G0, 0.185, 0.2, 0.17, 0.012, 0xe4e4de),
    ...[0.04, 0.09, 0.14].map(k => bx(0.34, G0 + k, 0.19, 0.2, 0.006, 0.006, 0xbfbfb8)), ...win(-0.31, G0 + 0.1, -0.06, 0.09, 0.1, 'l'), bx(-0.06, G0, 0.25, 0.2, 0.012, 0.12, 0xd8cdb4)];
  const roof = [gable(-0.06, G0 + 0.28, -0.06, 0.5, 0.44, 0.2, 0xffffff, true, 0.05), gable(0.34, G0 + 0.2, 0.0, 0.26, 0.36, 0.1, 0xffffff, false, 0.04)];
  return { body: col(body), roof: col(roof) };
}
function twoStoryA() {  // sobrado hip + varanda
  const body = [bx(0, G0, -0.04, 0.56, 0.5, 0.42, 0xffffff), bx(0.34, G0, 0.0, 0.24, 0.22, 0.36, 0xffffff), ...[-0.18, 0.18].flatMap(x => [...win(x, G0 + 0.08, 0.18, 0.1, 0.11), ...win(x, G0 + 0.31, 0.18, 0.1, 0.11)]), ...door(0, G0, 0.18),
    bx(0, G0 + 0.27, 0.27, 0.3, 0.02, 0.16, 0xf0f0ea), ...[-0.14, -0.05, 0.05, 0.14].map(k => bx(k, G0 + 0.29, 0.34, 0.012, 0.07, 0.012, FRAME)), bx(0, G0 + 0.36, 0.34, 0.3, 0.012, 0.012, FRAME), ...win(0.28, G0 + 0.2, -0.04, 0.1, 0.12, 'r'), ...win(-0.28, G0 + 0.2, -0.04, 0.1, 0.12, 'l'), bx(0.34, G0, 0.185, 0.18, 0.15, 0.012, 0xe4e4de)];
  const roof = [hip(0, G0 + 0.5, -0.04, 0.56, 0.42, 0.22, 0xffffff, 0.06), hip(0.34, G0 + 0.22, 0, 0.24, 0.36, 0.1, 0xffffff, 0.04), bx(-0.18, G0 + 0.6, -0.12, 0.07, 0.2, 0.07, 0x8a6a5a)];
  return { body: col(body), roof: col(roof) };
}
function twoStoryB() {  // sobrado gable + dormer
  const body = [bx(0, G0, -0.02, 0.5, 0.46, 0.5, 0xffffff), ...[-0.16, 0.16].flatMap(x => [...win(x, G0 + 0.08, 0.23, 0.09, 0.11), ...win(x, G0 + 0.28, 0.23, 0.09, 0.11)]), ...door(0, G0, 0.23, 0.1, 0.17), bx(0, G0, 0.31, 0.26, 0.02, 0.1, 0xcfcfc8),
    ...[-0.1, 0.1].map(k => bx(k, G0 + 0.02, 0.34, 0.02, 0.2, 0.02, FRAME)), bx(0, G0 + 0.2, 0.31, 0.26, 0.025, 0.1, 0xf0f0ea), ...win(0.25, G0 + 0.12, -0.02, 0.1, 0.12, 'r'), ...win(-0.25, G0 + 0.12, -0.02, 0.1, 0.12, 'l')];
  const roof = [gable(0, G0 + 0.46, -0.02, 0.5, 0.5, 0.26, 0xffffff, true, 0.06), gable(0, G0 + 0.5, 0.18, 0.2, 0.14, 0.14, 0xffffff, false, 0.02), bx(0.17, G0 + 0.62, -0.1, 0.07, 0.2, 0.07, 0x8a6a5a)];
  return { body: col([...body, ...win(0, G0 + 0.5, 0.25, 0.09, 0.08)]), roof: col(roof) };
}
function tallHouse() {   // casa alta (3 andares)
  const body = [bx(0, G0, 0, 0.48, 0.74, 0.42, 0xffffff), ...[0.08, 0.3, 0.52].flatMap((y, k) => [-0.14, 0.14].flatMap(x => k === 0 ? win(x, G0 + y, 0.2, 0.1, 0.12) : win(x, G0 + y, 0.2, 0.1, 0.12))), ...door(0, G0, 0.2),
    bx(0, G0 + 0.24, 0.27, 0.34, 0.02, 0.14, 0xf0f0ea), ...[-0.16, -0.08, 0, 0.08, 0.16].map(k => bx(k, G0 + 0.26, 0.33, 0.012, 0.07, 0.012, FRAME)), bx(0, G0 + 0.33, 0.33, 0.34, 0.012, 0.012, FRAME),
    ...win(0.24, G0 + 0.3, 0, 0.1, 0.14, 'r'), ...win(-0.24, G0 + 0.3, 0, 0.1, 0.14, 'l'), ...win(0.24, G0 + 0.52, 0, 0.1, 0.14, 'r'), ...win(-0.24, G0 + 0.52, 0, 0.1, 0.14, 'l'), trim(0, G0 + 0.36, 0, 0.5, 0.012, 0.44), trim(0, G0 + 0.58, 0, 0.5, 0.012, 0.44)];
  const roof = [gable(0, G0 + 0.74, 0, 0.48, 0.42, 0.3, 0xffffff, false, 0.05), bx(-0.16, G0 + 0.9, -0.1, 0.07, 0.22, 0.07, 0x8a6a5a)];
  return { body: col([...body, ...win(0, G0 + 0.8, 0.2, 0.07, 0.09)]), roof: col(roof) };
}
function mansion() {     // mansão com pórtico, alas, piscina e cerca
  const body = [bx(0, G0, -0.06, 0.5, 0.42, 0.4, 0xffffff), bx(-0.34, G0, 0.0, 0.26, 0.3, 0.34, 0xffffff), bx(0.34, G0, 0.0, 0.26, 0.3, 0.34, 0xffffff),
    ...[-0.14, 0.14].flatMap(x => [...win(x, G0 + 0.06, 0.14, 0.1, 0.12), ...win(x, G0 + 0.26, 0.14, 0.1, 0.12)]), ...win(-0.34, G0 + 0.1, 0.18, 0.1, 0.12), ...win(0.34, G0 + 0.1, 0.18, 0.1, 0.12), ...door(0, G0, 0.14, 0.12, 0.2),
    ...[-0.1, 0.1].map(x => cy(x, G0, 0.27, 0.025, 0.025, 0.38, 0xffffff, 10)), bx(0, G0 + 0.37, 0.27, 0.3, 0.025, 0.18, 0xf0f0ea), bx(0, G0, 0.27, 0.32, 0.02, 0.2, 0xcfcfc8),
    bx(0, G0, 0.46, 0.12, 0.01, 0.1, 0xd8cdb4), bx(0.3, G0, -0.34, 0.34, 0.012, 0.22, 0xcfd2d8), bx(0.3, G0 + 0.012, -0.34, 0.3, 0.01, 0.18, 0x6fc3ea),
    ...[-0.46, -0.3, -0.14, 0.14, 0.3, 0.46].map(k => bx(k, G0, 0.48, 0.012, 0.06, 0.012, FRAME)), bx(-0.3, G0 + 0.045, 0.48, 0.32, 0.01, 0.01, FRAME), bx(0.3, G0 + 0.045, 0.48, 0.32, 0.01, 0.01, FRAME)];
  const roof = [hip(0, G0 + 0.42, -0.06, 0.5, 0.4, 0.24, 0xffffff, 0.06), hip(-0.34, G0 + 0.3, 0, 0.26, 0.34, 0.16, 0xffffff, 0.05), hip(0.34, G0 + 0.3, 0, 0.26, 0.34, 0.16, 0xffffff, 0.05), gable(0, G0 + 0.4, 0.27, 0.34, 0.2, 0.1, 0xffffff, true, 0.02), bx(0.14, G0 + 0.58, -0.14, 0.06, 0.2, 0.06, 0x8a6a5a)];
  return { body: col(body), roof: col(roof) };
}

// ---------- prédios (níveis 5–15): cores fixas ----------
const bands = (w, d, y0, n, step, h, c) => { const o = []; for (let i = 0; i < n; i++) o.push(bx(0, y0 + i * step, 0, w + 0.006, h, d + 0.006, c)); return o; };
const mullions = (w, d, y0, H, c) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => bx(sx * w / 2, y0, sz * d / 2, 0.025, H, 0.025, c));
const roofTop = (w, d, y, c = 0x9aa0a8) => [bx(0, y, 0, w + 0.03, 0.03, d + 0.03, c), bx(w * 0.15, y + 0.03, d * 0.1, w * 0.3, 0.08, d * 0.3, 0xc9ced4), cy(-w * 0.25, y + 0.03, -d * 0.2, 0.04, 0.04, 0.06, 0xb0b6bd, 10)];
const BUILD = {
  tower: () => [bx(0, G0, 0, 0.56, 1.1, 0.48, 0xf2e4cc), ...Array.from({ length: 7 }, (_, i) => [win(-0.15, G0 + 0.1 + i * 0.15, 0.24, 0.12, 0.1), win(0.15, G0 + 0.1 + i * 0.15, 0.24, 0.12, 0.1), win(-0.15, G0 + 0.1 + i * 0.15, -0.24, 0.12, 0.1, 'b'), win(0.15, G0 + 0.1 + i * 0.15, -0.24, 0.12, 0.1, 'b'), win(0.28, G0 + 0.1 + i * 0.15, 0, 0.14, 0.1, 'r'), win(-0.28, G0 + 0.1 + i * 0.15, 0, 0.14, 0.1, 'l'), bx(0, G0 + 0.04 + i * 0.15, 0.27, 0.46, 0.012, 0.07, 0xffffff)]), ...door(0, G0, 0.24, 0.14, 0.14), roofTop(0.56, 0.48, G0 + 1.1)],
  apartments: () => [bx(0, G0, 0, 0.7, 1.4, 0.52, 0xc9694b), ...Array.from({ length: 9 }, (_, i) => [[-0.24, -0.08, 0.08, 0.24].map(x => win(x, G0 + 0.1 + i * 0.145, 0.26, 0.09, 0.09)), [-0.24, -0.08, 0.08, 0.24].map(x => win(x, G0 + 0.1 + i * 0.145, -0.26, 0.09, 0.09, 'b')), bx(0, G0 + 0.06 + i * 0.145, 0.29, 0.62, 0.012, 0.07, 0xffffff), win(0.35, G0 + 0.1 + i * 0.145, 0, 0.16, 0.09, 'r'), win(-0.35, G0 + 0.1 + i * 0.145, 0, 0.16, 0.09, 'l')]), bx(0, G0, 0.27, 0.7, 0.14, 0.06, 0xefe7d6), ...door(0, G0, 0.31, 0.16, 0.12), roofTop(0.7, 0.52, G0 + 1.4)],
  office: () => [bx(0, G0, 0, 0.62, 1.8, 0.62, 0xe9edf0), ...bands(0.62, 0.62, G0 + 0.12, 14, 0.12, 0.075, DARK), ...mullions(0.62, 0.62, G0, 1.8, 0xffffff), bx(0, G0, 0, 0.7, 0.1, 0.7, 0xb8bec6), ...roofTop(0.62, 0.62, G0 + 1.8), cy(0.1, G0 + 1.9, 0.1, 0.012, 0.012, 0.3, 0xdddddd, 6)],
  skyscraper: () => [bx(0, G0, 0, 0.86, 0.22, 0.86, 0xcfd3d8), bx(0, G0 + 0.22, 0, 0.56, 1.7, 0.56, 0xf4f4f4), ...bands(0.56, 0.56, G0 + 0.3, 14, 0.12, 0.07, DARK), bx(0, G0 + 1.92, 0, 0.4, 0.6, 0.4, 0xeeeeee), ...bands(0.4, 0.4, G0 + 2.0, 5, 0.11, 0.065, DARK), cy(0, G0 + 2.52, 0, 0.012, 0.02, 0.45, 0xdddddd, 6), sp(0, G0 + 3.0, 0, 0.022, 0xff4a3d), bx(0, G0, 0.4, 0.4, 0.05, 0.14, STONE)],
  glass: () => [bx(0, G0, 0, 0.8, 0.12, 0.8, 0xcfd3d8), bx(0, G0 + 0.12, 0, 0.5, 2.3, 0.5, 0x58a8e2), ...Array.from({ length: 23 }, (_, i) => bx(0, G0 + 0.2 + i * 0.1, 0, 0.516, 0.012, 0.516, 0xffffff)), ...mullions(0.5, 0.5, G0 + 0.12, 2.3, 0xffffff), bx(0, G0 + 2.42, 0, 0.36, 0.14, 0.36, 0x2f6f9f), cy(0, G0 + 2.56, 0, 0.012, 0.012, 0.3, 0xdddddd, 6)],
  twin: () => [bx(0, G0, 0, 0.9, 0.1, 0.5, 0xcfd3d8), bx(-0.24, G0 + 0.1, 0, 0.32, 2.4, 0.4, 0x4f8fcf), bx(0.24, G0 + 0.1, 0, 0.32, 2.1, 0.4, 0x4f8fcf), ...[-0.24, 0.24].flatMap((x, k) => Array.from({ length: k ? 20 : 23 }, (_, i) => bx(x, G0 + 0.18 + i * 0.1, 0, 0.336, 0.012, 0.416, 0xffffff))), bx(0, G0 + 1.5, 0, 0.2, 0.12, 0.3, 0xe9edf0), bx(-0.24, G0 + 2.5, 0, 0.36, 0.05, 0.44, 0xe9edf0), bx(0.24, G0 + 2.2, 0, 0.36, 0.05, 0.44, 0xe9edf0), cy(-0.24, G0 + 2.55, 0, 0.012, 0.012, 0.3, 0xdddddd, 6)],
  luxury: () => [bx(0, G0, 0, 0.9, 0.16, 0.9, 0xcfc9ba), bx(0, G0 + 0.16, 0, 0.64, 1.1, 0.64, 0xf1e8d4), bx(0, G0 + 1.26, 0, 0.5, 1.0, 0.5, 0xf1e8d4), bx(0, G0 + 2.26, 0, 0.36, 0.8, 0.36, 0xf1e8d4), ...[[0.64, 0.16, 1.1], [0.5, 1.26, 1.0], [0.36, 2.26, 0.8]].flatMap(([w, y0, H]) => [...bands(w, w, G0 + y0 + 0.1, Math.floor(H / 0.12), 0.12, 0.07, 0x3d5a73), bx(0, G0 + y0, 0, w + 0.03, 0.03, w + 0.03, GOLD), bx(0, G0 + y0 + H - 0.03, 0, w + 0.03, 0.03, w + 0.03, GOLD), ...mullions(w, w, G0 + y0, H, GOLD)]), hip(0, G0 + 3.06, 0, 0.36, 0.36, 0.4, GOLD, 0.02), cy(0, G0 + 3.46, 0, 0.01, 0.014, 0.4, GOLD, 6)],
  mega: () => [cy(0, G0, 0, 0.46, 0.46, 0.1, 0xcfd3d8, 28), cy(0, G0 + 0.1, 0, 0.3, 0.3, 3.0, 0xf3f6f8, 28), ...Array.from({ length: 26 }, (_, i) => cy(0, G0 + 0.2 + i * 0.11, 0, 0.306, 0.306, 0.06, 0x2f4d68, 28)), cy(0, G0 + 3.1, 0, 0.36, 0.34, 0.07, 0xf5c542, 28), cy(0, G0 + 3.17, 0, 0.33, 0.33, 0.014, 0x565c68, 28), bx(0, G0 + 3.19, 0, 0.3, 0.005, 0.04, 0xffffff), bx(0, G0 + 3.19, 0, 0.04, 0.005, 0.3, 0xffffff), cy(0.12, G0 + 3.17, 0.12, 0.01, 0.014, 0.45, 0xdddddd, 6), sp(0.12, G0 + 3.64, 0.12, 0.025, 0xff4a3d)],
  golden: () => [bx(0, G0, 0, 0.84, 0.12, 0.84, 0xe9d9a8), bx(0, G0 + 0.12, 0, 0.52, 3.0, 0.52, 0xe0b040), ...Array.from({ length: 29 }, (_, i) => bx(0, G0 + 0.2 + i * 0.1, 0, 0.536, 0.012, 0.536, 0xfff3c4)), ...mullions(0.52, 0.52, G0 + 0.12, 3.0, 0xfff3c4), bx(0, G0 + 3.12, 0, 0.4, 0.1, 0.4, 0xc99a2e), hip(0, G0 + 3.22, 0, 0.36, 0.36, 0.55, 0xf5d36b, 0.02), cy(0, G0 + 3.77, 0, 0.008, 0.014, 0.5, GOLD, 6), sp(0, G0 + 4.3, 0, 0.026, 0xff4a3d)],
  diamond: () => [cy(0, G0, 0, 0.5, 0.5, 0.1, 0xdfe9ef, 8), cy(0, G0 + 0.1, 0, 0.34, 0.3, 2.9, 0x9fe8ff, 8), ...Array.from({ length: 20 }, (_, i) => cy(0, G0 + 0.22 + i * 0.14, 0, 0.346 - i * 0.002, 0.346 - i * 0.002, 0.018, 0xffffff, 8)), cy(0, G0 + 3.0, 0, 0.3, 0.001, 0.8, 0xcff6ff, 8), cy(0, G0 + 3.8, 0, 0.006, 0.01, 0.35, 0xffffff, 6), sp(0, G0 + 4.2, 0, 0.03, 0x66e0ff)],
  top: () => [bx(0, G0, 0, 1.0, 0.16, 1.0, 0xcfd3d8), bx(0, G0 + 0.16, 0, 0.7, 1.2, 0.7, 0x20262f), bx(0, G0 + 1.36, 0, 0.54, 1.5, 0.54, 0x20262f), bx(0, G0 + 2.86, 0, 0.4, 1.4, 0.4, 0x20262f), ...[[0.7, 0.16, 1.2], [0.54, 1.36, 1.5], [0.4, 2.86, 1.4]].flatMap(([w, y0, H]) => [...bands(w, w, G0 + y0 + 0.08, Math.floor(H / 0.1), 0.1, 0.05, 0x5fb8ff), bx(0, G0 + y0, 0, w + 0.03, 0.04, w + 0.03, GOLD), bx(0, G0 + y0 + H - 0.04, 0, w + 0.03, 0.04, w + 0.03, GOLD), ...mullions(w, w, G0 + y0, H, GOLD)]), hip(0, G0 + 4.26, 0, 0.4, 0.4, 0.6, GOLD, 0.02), cy(0, G0 + 4.86, 0, 0.01, 0.02, 0.9, 0xffffff, 6), sp(0, G0 + 5.78, 0, 0.05, 0xff4a3d), cy(0, G0 + 4.0, 0, 0.5, 0.5, 0.012, 0x66e0ff, 24)],
};

// ---------- edifícios cívicos / extras ----------
const civic = {
  park: () => col([bx(0, 0, 0, 1, 0.02, 1, 0xd9d9d6), bx(0, 0.02, 0, 0.94, 0.012, 0.94, 0x74c653), cy(0.1, 0.03, 0.05, 0.22, 0.22, 0.014, 0x7fd0f0, 20), bx(0, 0.03, 0.34, 0.9, 0.008, 0.1, 0xe5dcc3), bx(-0.3, 0.03, -0.1, 0.18, 0.04, 0.06, 0x8b5a33),
    ...[[-0.3, -0.32, 1.2], [0.32, -0.3, 1], [-0.34, 0.12, 0.9], [0.34, 0.22, 1.1], [0, -0.38, 0.9]].flatMap(([x, z, s]) => [cy(x, G0, z, 0.03 * s, 0.025 * s, 0.14 * s, 0x7a4a2a, 6), sp(x, G0 + 0.24 * s, z, 0.13 * s, 0x2f8626, 9, 7)])]),
  school: () => col([bx(0, G0, 0, 0.9, 0.3, 0.55, 0xc4553b), bx(0, G0 + 0.3, 0, 0.94, 0.03, 0.59, 0xe9e4d6), bx(0, G0 + 0.33, 0, 0.2, 0.2, 0.2, 0xe9e4d6), hip(0, G0 + 0.53, 0, 0.2, 0.2, 0.18, 0x56627a, 0.03), ...door(0, G0, 0.275, 0.14, 0.2), ...[-0.34, -0.2, 0.2, 0.34].flatMap(x => [win(x, G0 + 0.08, 0.28, 0.1, 0.1), win(x, G0 + 0.2, 0.28, 0.1, 0.1)]), cy(0.4, G0, 0.45, 0.008, 0.008, 0.5, 0xcccccc, 6), bx(0.4 + 0.07, G0 + 0.38, 0.45, 0.14, 0.08, 0.008, 0xe0483e)]),
  hospital: () => col([bx(-0.05, G0, 0, 0.7, 0.45, 0.6, 0xf4f6f8), bx(-0.25, G0 + 0.45, -0.05, 0.3, 0.45, 0.4, 0xe6edf3), bx(0.2, G0 + 0.46, 0.0, 0.2, 0.012, 0.06, 0xe0483e), bx(0.2, G0 + 0.46, 0.0, 0.06, 0.012, 0.2, 0xe0483e), ...[0.12, 0.26, 0.4].map(y => bx(-0.05, G0 + y, 0.305, 0.6, 0.05, 0.008, 0x8fc9ea)), ...[0.55, 0.7].map(y => bx(-0.25, G0 + y, 0.16, 0.26, 0.05, 0.008, 0x8fc9ea)), bx(0.28, G0, 0.34, 0.3, 0.02, 0.2, 0xe0483e), bx(-0.05, G0 + 0.02, 0.4, 0.2, 0.2, 0.1, 0xf4f6f8)]),
  stadium: () => col([cy(0, G0, 0, 0.5, 0.5, 0.22, 0xe4e0d4, 32), cy(0, G0, 0, 0.44, 0.44, 0.23, 0xd9825b, 32), cy(0, G0, 0, 0.34, 0.34, 0.24, 0x4aa84a, 32), bx(0, G0 + 0.235, 0, 0.04, 0.006, 0.3, 0xffffff), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].flatMap(([a, b]) => [cy(a * 0.42, G0, b * 0.42, 0.008, 0.008, 0.5, 0xcccccc, 6), bx(a * 0.42, G0 + 0.5, b * 0.42, 0.1, 0.05, 0.1, 0xffffff)])]),
  biz: () => ({ body: col([bx(0, G0, 0, 0.8, 0.5, 0.6, 0xf3ead8), ...[-0.22, 0.22].map(x => win(x, G0 + 0.1, 0.305, 0.22, 0.16)), ...door(0, G0, 0.305, 0.14, 0.22), bx(0, G0 + 0.5, 0, 0.84, 0.04, 0.64, 0xdcd2bd), ...win(-0.22, G0 + 0.3, 0.305, 0.16, 0.1), ...win(0.22, G0 + 0.3, 0.305, 0.16, 0.1)]),
    awning: col([bx(0, G0 + 0.36, 0.38, 0.8, 0.03, 0.2, 0xffffff), bx(0, G0 + 0.58, 0, 0.7, 0.14, 0.5, 0xffffff), bx(0, G0 + 0.4, 0.31, 0.74, 0.14, 0.01, 0xffffff), bx(0, G0 + 0.54, 0.26, 0.62, 0.2, 0.03, 0xffffff), bx(0, G0 + 0.52, 0.24, 0.06, 0.04, 0.04, 0xffffff)]) }),
};
// ---------- props ----------
const props = {
  tree: () => col([cy(0, G0, 0, 0.03, 0.04, 0.12, 0x7a4a2a, 6), sp(0, G0 + 0.27, 0, 0.17, 0xffffff, 10, 8)]),
  pine: () => col([cy(0, G0, 0, 0.025, 0.03, 0.08, 0x6b4a2e, 6), [new THREE.ConeGeometry(0.15, 0.22, 7).translate(0, G0 + 0.19, 0), 0xffffff], [new THREE.ConeGeometry(0.11, 0.2, 7).translate(0, G0 + 0.33, 0), 0xffffff]]),
  palm: () => col([[new THREE.CylinderGeometry(0.018, 0.03, 0.4, 6).rotateZ(0.1).translate(0.01, G0 + 0.2, 0), 0x9a7448], ...Array.from({ length: 7 }, (_, i) => [new THREE.BoxGeometry(0.28, 0.008, 0.07).translate(0.14, 0, 0).rotateZ(-0.5).rotateY(i / 7 * 6.283).translate(0.03, G0 + 0.4, 0), 0x3f9d3a])]),
  bush: () => col([sp(0, G0 + 0.05, 0, 0.09, 0x2f8f3a, 8, 6), sp(0.08, G0 + 0.035, 0.03, 0.06, 0x3aa045, 7, 5), sp(-0.03, G0 + 0.1, 0.03, 0.025, 0xe84a5f, 5, 4), sp(0.04, G0 + 0.09, -0.04, 0.025, 0xffd23f, 5, 4), sp(0.1, G0 + 0.09, 0.05, 0.025, 0xffffff, 5, 4)]),
  car: () => col([bx(0, 0.025, 0, 0.2, 0.05, 0.1, 0xffffff), bx(-0.01, 0.075, 0, 0.11, 0.045, 0.085, 0x9bd6f5), ...[[-0.06, 0.05], [0.06, 0.05], [-0.06, -0.05], [0.06, -0.05]].map(([x, z]) => [new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8).rotateX(Math.PI / 2).translate(x, 0.02, z), 0x222222])]),
  lamp: () => col([cy(0, 0.02, 0, 0.008, 0.008, 0.22, 0x555a63, 6), bx(0.03, 0.23, 0, 0.08, 0.012, 0.02, 0x555a63), sp(0.07, 0.225, 0, 0.014, 0xfff3b0, 6, 5)]),
  flag: () => col([cy(0, G0, 0, 0.008, 0.008, 0.52, 0xdddddd, 6), bx(-0.1, G0 + 0.4, 0, 0.2, 0.1, 0.006, 0xffffff)]),
  ring: () => new THREE.RingGeometry(0.62, 0.72, 40).rotateX(-Math.PI / 2).translate(0, 0.05, 0),
};

export function makeGeoms() {
  const G = { lot: lotGround(), roadX: roadX(), cross: cross(), round: roundabout(), open: openSeat(), sign: signLot(), site: siteLot(), palace: palaceLot(), capitol: capitolLot(), hall: hallLot(), beacon: beaconGeo(), fire: fireGeo() };
  G.house = [cottageA(), cottageB(), twoStoryA(), twoStoryB(), tallHouse(), mansion()];     // 0,1: nível1  2,3: nível2  4: nível3  5: nível4
  G.build = Object.fromEntries(Object.entries(BUILD).map(([k, f]) => [k, col(f())]));
  G.civic = { park: civic.park(), school: civic.school(), hospital: civic.hospital(), stadium: civic.stadium(), biz: civic.biz() };
  G.props = Object.fromEntries(Object.entries(props).map(([k, f]) => [k, f()]));
  return G;
}
export const BUILD_ORDER = ['tower', 'apartments', 'office', 'skyscraper', 'glass', 'twin', 'luxury', 'mega', 'golden', 'diamond', 'top'];   // níveis 5..15

// ---------- prédios das lojas, um por tipo (frente = +z). body = cores fixas; accent = branco tingido pela cor da empresa; logo = placa onde vai o desenho do dono ----------
const AW = 0xffffff;   // accent: tingido por instância
const stripes = (x, y, z, w, d, n, odd) => Array.from({ length: n }, (_, i) => i % 2 === odd ? bx(x - w / 2 + (i + 0.5) * w / n, y, z, w / n * 0.98, 0.025, d, 0xffffff) : null).filter(Boolean);
const logoBoard = (x, y, z, s = 0.22) => ({ frame: [bx(x, y - 0.012, z - 0.006, s + 0.03, s + 0.03, 0.014, 0x2a2f38)], plane: new THREE.PlaneGeometry(s, s).translate(x, y + s / 2 - 0.012, z + 0.002) });
export function makeBizTypes() {
  const T = {};
  { // lanchonete / café: toldo listrado, mesinhas com guarda-sol, xícara gigante no telhado
    const L = logoBoard(0, G0 + 0.36, 0.236, 0.16);
    T.lanchonete = { body: col([bx(0, G0, 0, 0.62, 0.32, 0.46, 0xf6ead2), bx(0, G0 + 0.32, 0, 0.66, 0.03, 0.5, 0xd8c6a2), bx(0, G0, 0.232, 0.5, 0.2, 0.01, WIN), ...door(0.2, G0, 0.235, 0.09, 0.17),
        ...[-0.18, 0.18].flatMap(x => [cy(x, G0, 0.38, 0.012, 0.012, 0.09, 0x555a63, 6), cy(x, G0 + 0.09, 0.38, 0.06, 0.06, 0.012, 0xffffff, 12), cy(x, G0, 0.38, 0.004, 0.004, 0.22, 0x555a63, 6)]),
        ...stripes(0, G0 + 0.22, 0.31, 0.62, 0.16, 8, 1), cy(-0.12, G0 + 0.35, -0.05, 0.08, 0.1, 0.13, 0xffffff, 18), cy(-0.12, G0 + 0.475, -0.05, 0.088, 0.088, 0.008, 0x6b3a1e, 18), [new THREE.TorusGeometry(0.045, 0.013, 6, 12).rotateY(Math.PI / 2).translate(-0.215, G0 + 0.42, -0.05), 0xffffff], L.frame]),
      accent: col([...stripes(0, G0 + 0.22, 0.31, 0.62, 0.16, 8, 0).map(([g]) => [g, AW]), ...[-0.18, 0.18].map(x => [new THREE.ConeGeometry(0.12, 0.06, 8).translate(x, G0 + 0.25, 0.38), AW])]), logo: L.plane };
  }
  { // restaurante: tijolo, chimney com fumaça, janelas largas, garfo+faca na placa
    const L = logoBoard(0, G0 + 0.43, 0.282, 0.18);
    T.restaurante = { body: col([bx(0, G0, 0, 0.76, 0.4, 0.55, BRICK), bx(0, G0 + 0.4, 0, 0.8, 0.03, 0.59, 0xe9e4d6), bx(0.26, G0 + 0.4, -0.12, 0.1, 0.2, 0.1, 0x7b4636), sp(0.26, G0 + 0.66, -0.12, 0.045, 0xdfe3e8, 8, 6), sp(0.29, G0 + 0.74, -0.1, 0.035, 0xeef1f4, 8, 6),
        ...win(-0.22, G0 + 0.1, 0.276, 0.2, 0.18), ...win(0.22, G0 + 0.1, 0.276, 0.2, 0.18), ...door(0, G0, 0.278, 0.12, 0.2), ...[-0.33, 0.33].flatMap(x => [bx(x, G0, 0.33, 0.08, 0.05, 0.06, 0x8b5a33), sp(x, G0 + 0.08, 0.33, 0.045, 0x3aa045, 8, 6)]),
        bx(-0.035, G0 + 0.47, 0.3, 0.012, 0.11, 0.01, 0xd9d9d9), bx(0.035, G0 + 0.47, 0.3, 0.012, 0.11, 0.01, 0xd9d9d9), L.frame]),
      accent: col([bx(0, G0 + 0.31, 0.32, 0.72, 0.025, 0.12, AW), bx(0, G0 + 0.27, 0.375, 0.72, 0.05, 0.01, AW)]), logo: L.plane };
  }
  { // academia: caixa de vidro com grade escura, halter gigante no telhado
    const L = logoBoard(-0.2, G0 + 0.47, 0.28, 0.16), mull = [];
    for (let i = 0; i <= 6; i++) mull.push(bx(-0.4 + i * 0.8 / 6, G0, 0.278, 0.015, 0.42, 0.012, DARK));
    T.academia = { body: col([bx(0, G0, 0, 0.8, 0.42, 0.55, 0x9fd0ea), bx(0, G0 + 0.42, 0, 0.84, 0.035, 0.59, 0x3a4250), bx(0, G0 + 0.2, 0.279, 0.8, 0.015, 0.012, DARK), ...mull,
        [new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8).rotateZ(Math.PI / 2).translate(0.12, G0 + 0.53, 0), 0x9aa3ad], ...[-0.12, 0.36].flatMap(x => [[new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16).rotateZ(Math.PI / 2).translate(x, G0 + 0.53, 0), 0x2a2f38], [new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16).rotateZ(Math.PI / 2).translate(x + (x < 0.1 ? 0.045 : -0.045), G0 + 0.53, 0), 0x2a2f38]]), L.frame]),
      accent: col([bx(0, G0 + 0.385, 0.285, 0.8, 0.04, 0.012, AW), bx(0, G0 + 0.42, 0.296, 0.84, 0.035, 0.006, AW)]), logo: L.plane };
  }
  { // concessionária: vitrine larga, carros no pátio (cor da empresa), bandeirinhas e totem
    const L = logoBoard(0.36, G0 + 0.5, 0.32, 0.14), car = (x, z, rot) => [new THREE.BoxGeometry(0.17, 0.045, 0.09).rotateY(rot).translate(x, G0 + 0.03, z), AW];
    const wheels = (x, z, rot) => [[-0.055, 0.047], [0.055, 0.047], [-0.055, -0.047], [0.055, -0.047]].map(([a, b]) => [new THREE.CylinderGeometry(0.02, 0.02, 0.015, 8).rotateX(Math.PI / 2).translate(a, 0, b).rotateY(rot).translate(x, G0 + 0.02, z), 0x222222]);
    const cab = (x, z, rot) => [new THREE.BoxGeometry(0.09, 0.04, 0.075).rotateY(rot).translate(x, G0 + 0.072, z), 0x9bd6f5];
    T.concessionaria = { body: col([bx(-0.08, G0, -0.12, 0.72, 0.3, 0.38, 0xeef1f4), bx(-0.08, G0, 0.072, 0.68, 0.24, 0.01, WIN), bx(-0.08, G0 + 0.3, -0.12, 0.76, 0.03, 0.42, 0x3a4250), bx(0, 0.02, 0.28, 0.9, 0.012, 0.3, 0x8d939b),
        cab(-0.28, 0.27, 0.3), cab(-0.02, 0.29, -0.2), cab(0.2, 0.25, 0.1), ...wheels(-0.28, 0.27, 0.3), ...wheels(-0.02, 0.29, -0.2), ...wheels(0.2, 0.25, 0.1), cy(0.36, G0, 0.32, 0.015, 0.015, 0.5, 0x555a63, 6), ...[-0.42, -0.14, 0.14].map(x => cy(x, G0, 0.44, 0.006, 0.006, 0.28, 0xdddddd, 5)), L.frame]),
      accent: col([car(-0.28, 0.27, 0.3), car(-0.02, 0.29, -0.2), car(0.2, 0.25, 0.1), bx(-0.08, G0 + 0.255, 0.08, 0.72, 0.04, 0.012, AW), ...[-0.42, -0.14, 0.14].map(x => [new THREE.BoxGeometry(0.07, 0.045, 0.004).translate(x + 0.035, G0 + 0.255, 0.44), AW])]), logo: L.plane };
  }
  { // tecnologia: torre de vidro escalonada, antena com luz vermelha, antena parabólica, faixa de LED no topo
    const L = logoBoard(0, G0 + 0.74, 0.181, 0.15), fl = [];
    for (let k = 1; k < 9; k++) fl.push(bx(0, G0 + k * 0.08, 0.252, 0.5, 0.008, 0.008, 0xe9eef3));
    T.tecnologia = { body: col([bx(0, G0, 0, 0.5, 0.72, 0.5, 0x4f86c6), bx(0, G0 + 0.72, -0.02, 0.36, 0.2, 0.36, 0x3d6fa8), bx(0, G0 + 0.92, -0.02, 0.38, 0.02, 0.38, 0x2a2f38), ...fl, ...door(0, G0, 0.252, 0.12, 0.16),
        cy(0.1, G0 + 0.94, -0.08, 0.006, 0.006, 0.28, 0xdddddd, 5), sp(0.1, G0 + 1.23, -0.08, 0.018, 0xff3b30, 6, 5), [new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-0.9).translate(-0.09, G0 + 0.97, -0.1), 0xe5e5e5], L.frame]),
      accent: col([bx(0, G0 + 0.69, 0.255, 0.5, 0.03, 0.01, AW), bx(0, G0 + 0.69, -0.255, 0.5, 0.03, 0.01, AW), bx(0.255, G0 + 0.69, 0, 0.01, 0.03, 0.5, AW), bx(-0.255, G0 + 0.69, 0, 0.01, 0.03, 0.5, AW)]), logo: L.plane };
  }
  return T;
}

// peças de desenho reaproveitadas pelos prédios de loja (bizmodels.js)
export { bx, cy, sp, hip, gable, win, door, col, flat };

// ---------- itens e estilos comprados com gemas (loja) ----------
// Mesmo lote unitário (chão em y = G0). Itens ficam nos cantos do lote; estilos substituem o modelo da casa.
export function makeDecor() {
  const WHITE = 0xffffff, POOL = 0x4fc3ee, BLUE = 0x2f7fe0, YEL = 0xffd23f, RED = 0xe0483e, WOOD = 0x8b5a2b, LOG = 0x9a6a3c, LOGD = 0x6e4520, STONEC = 0xb9b4aa, STONED = 0x8e8a82;
  // cerca branca em volta do lote, com portão aberto na frente (+z)
  const fence = (() => { const p = [], E = 0.46;
    for (let t = -E; t <= E + 1e-6; t += 0.092) { p.push(bx(t, G0, -E, 0.014, 0.07, 0.014, WHITE), bx(-E, G0, t, 0.014, 0.07, 0.014, WHITE), bx(E, G0, t, 0.014, 0.07, 0.014, WHITE)); if (Math.abs(t) > 0.1) p.push(bx(t, G0, E, 0.014, 0.07, 0.014, WHITE)); }
    for (const y of [0.025, 0.055]) { p.push(bx(0, G0 + y, -E, 2 * E, 0.01, 0.008, WHITE), bx(-E, G0 + y, 0, 0.008, 0.01, 2 * E, WHITE), bx(E, G0 + y, 0, 0.008, 0.01, 2 * E, WHITE));
      for (const s of [-1, 1]) p.push(bx(s * (E + 0.1) / 2, G0 + y, E, E - 0.1, 0.01, 0.008, WHITE)); }
    return col(p); })();
  // bandeira de telhado (base em y = 0: vai em cima do telhado)
  const flag = col([cy(0, 0, 0, 0.006, 0.006, 0.2, 0xdddddd, 6), bx(0.045, 0.14, 0, 0.09, 0.055, 0.005, RED), bx(0.045, 0.157, 0.001, 0.09, 0.012, 0.005, WHITE), bx(0.02, 0.17, 0.002, 0.04, 0.025, 0.005, BLUE)]);
  // parquinho: balanço + escorregador + torrinha
  const playground = col([bx(0, G0, 0, 0.26, 0.006, 0.2, 0xe9d8a6),
    ...[-0.1, 0.02].flatMap(x => [[new THREE.CylinderGeometry(0.006, 0.006, 0.13, 5).rotateZ(0.25).translate(x - 0.016, G0 + 0.06, -0.07), RED], [new THREE.CylinderGeometry(0.006, 0.006, 0.13, 5).rotateZ(-0.25).translate(x + 0.016, G0 + 0.06, -0.07), RED]]),
    bx(-0.04, G0 + 0.12, -0.07, 0.15, 0.008, 0.008, RED), ...[-0.07, -0.01].flatMap(x => [bx(x, G0 + 0.05, -0.07, 0.003, 0.07, 0.003, 0x555555), bx(x, G0 + 0.04, -0.07, 0.03, 0.006, 0.02, YEL)]),
    bx(0.07, G0, 0.05, 0.07, 0.1, 0.07, BLUE), bx(0.07, G0 + 0.1, 0.05, 0.08, 0.012, 0.08, YEL), [new THREE.BoxGeometry(0.05, 0.008, 0.14).rotateX(0.62).translate(0.07, G0 + 0.05, 0.13), YEL]]);
  // tobogã: torre azul com escada, rampa em zigue-zague e piscininha
  const slide = col([cy(-0.02, G0, -0.04, 0.035, 0.035, 0.2, BLUE, 8), bx(-0.02, G0 + 0.2, -0.04, 0.09, 0.012, 0.09, WHITE),
    [new THREE.BoxGeometry(0.035, 0.012, 0.13).rotateX(0.5).translate(0.04, G0 + 0.15, 0.0), YEL], [new THREE.BoxGeometry(0.13, 0.012, 0.035).rotateZ(-0.5).translate(0.03, G0 + 0.09, 0.07), BLUE],
    [new THREE.BoxGeometry(0.035, 0.012, 0.12).rotateX(-0.5).translate(-0.04, G0 + 0.04, 0.08), YEL], cy(-0.06, G0, 0.1, 0.06, 0.06, 0.016, WHITE, 16), cy(-0.06, G0 + 0.004, 0.1, 0.05, 0.05, 0.014, POOL, 16)]);
  // piscina com borda e escada
  const pool = col([bx(0, G0, 0, 0.38, 0.016, 0.22, 0xf4f1ea), bx(0, G0 + 0.004, 0, 0.33, 0.014, 0.17, POOL), bx(0.12, G0 + 0.004, 0, 0.06, 0.015, 0.17, 0x7fd8f5),
    ...[-0.03, 0.03].map(z => bx(-0.17, G0 + 0.016, z, 0.006, 0.04, 0.006, 0xcccccc)), bx(-0.17, G0 + 0.056, 0, 0.006, 0.006, 0.066, 0xcccccc)]);
  // ---- estilos de casa ----
  const cabin = col([bx(0, G0, 0, 0.56, 0.27, 0.44, LOG), ...[0.04, 0.09, 0.14, 0.19, 0.24].map(y => bx(0, G0 + y, 0, 0.565, 0.012, 0.445, LOGD)),
    ...[[-0.28, -0.22], [0.28, -0.22], [-0.28, 0.22], [0.28, 0.22]].map(([x, z]) => cy(x, G0, z, 0.022, 0.022, 0.29, LOGD, 6)),
    gable(0, G0 + 0.27, 0, 0.56, 0.44, 0.2, 0x3f5a35, true, 0.06), bx(0.17, G0 + 0.3, -0.08, 0.07, 0.18, 0.07, STONED), ...door(0, G0, 0.222, 0.1, 0.17), ...win(-0.17, G0 + 0.1, 0.222, 0.1, 0.08), ...win(0.17, G0 + 0.1, 0.222, 0.1, 0.08),
    bx(0, G0, 0.27, 0.3, 0.02, 0.08, WOOD)]);
  const mansion = col([bx(0, G0, -0.02, 0.42, 0.34, 0.36, 0xf7f3ea), ...[-1, 1].map(s => bx(s * 0.3, G0, -0.03, 0.18, 0.24, 0.32, 0xefe9dc)),
    hip(0, G0 + 0.34, -0.02, 0.42, 0.36, 0.16, 0x4d5d70), ...[-1, 1].map(s => hip(s * 0.3, G0 + 0.24, -0.03, 0.18, 0.32, 0.1, 0x4d5d70)),
    bx(0, G0 + 0.3, 0.2, 0.3, 0.02, 0.1, WHITE), ...[-0.12, -0.04, 0.04, 0.12].map(x => cy(x, G0, 0.22, 0.014, 0.014, 0.3, WHITE, 8)), bx(0, G0, 0.22, 0.34, 0.02, 0.12, 0xdedad0),
    ...door(0, G0 + 0.02, 0.162, 0.1, 0.16), ...[-0.13, 0.13].flatMap(x => [...win(x, G0 + 0.06, 0.162, 0.07, 0.09), ...win(x, G0 + 0.21, 0.162, 0.07, 0.07)]), ...[-1, 1].map(s => win(s * 0.3, G0 + 0.08, 0.132, 0.08, 0.08))]);
  const castle = col([bx(0, G0, 0, 0.34, 0.4, 0.34, STONEC), ...[-0.12, -0.04, 0.04, 0.12].flatMap(t => [bx(t, G0 + 0.4, 0.15, 0.05, 0.045, 0.04, STONEC), bx(t, G0 + 0.4, -0.15, 0.05, 0.045, 0.04, STONEC), bx(0.15, G0 + 0.4, t, 0.04, 0.045, 0.05, STONEC), bx(-0.15, G0 + 0.4, t, 0.04, 0.045, 0.05, STONEC)]),
    ...[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].flatMap(([x, z]) => [cy(x, G0, z, 0.08, 0.075, 0.54, STONED, 12), [new THREE.ConeGeometry(0.095, 0.17, 12).translate(x, G0 + 0.54 + 0.085, z), RED]]),
    bx(0, G0, 0.171, 0.11, 0.17, 0.01, 0x3a2a1c), bx(0, G0 + 0.17, 0.171, 0.13, 0.02, 0.012, STONED), ...[-0.08, 0.08].map(x => bx(x, G0 + 0.26, 0.171, 0.035, 0.07, 0.008, 0x2f3d55)),
    cy(0, G0 + 0.445, 0, 0.005, 0.005, 0.16, 0xdddddd, 6), bx(0.04, G0 + 0.55, 0, 0.07, 0.045, 0.004, YEL)]);
  return { fence, flag, playground, slide, pool, skins: { cabin, mansion, castle }, skinTop: { cabin: 0.5, mansion: 0.55, castle: 0.79 } };
}
