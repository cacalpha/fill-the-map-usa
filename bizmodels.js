// Prédios detalhados das lojas dos jogadores (9 tipos). Lote unitário 1×1, frente = +z, chão em y = G0.
// Cada tipo devolve: body (cores fixas), accent (branco, tingido pela cor da empresa), glow (vitrines e luzes, sem sombra) e logo (placa do desenho do dono).
import * as THREE from 'three';
import { G0, bx, cy, sp, gable, col } from './buildings.js';

const WHITE = 0xffffff, AW = 0xffffff, GLOW = 0xffe0a3, GLASS = 0x6f93ad, DARK = 0x2b313b, STEEL = 0x9aa3ad, WOOD = 0x8b5a33, BRICK = 0xa45a43, CREAM = 0xf3e8d2, GREEN = 0x3f9a45, LEAF = 0x5cb85c, SKIN = 0xf0c8a0;
const G = (geo, c) => [geo, c];
const rbox = (x, y, z, w, h, d, r, c) => G(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0).rotateY(r).translate(x, y, z), c);

// ---------- peças pequenas ----------
const tree = (x, z, s = 1) => [cy(x, G0, z, 0.018 * s, 0.024 * s, 0.12 * s, 0x7a4a2a, 6), sp(x, G0 + 0.17 * s, z, 0.075 * s, 0x3f9a45, 9, 7), sp(x + 0.03 * s, G0 + 0.22 * s, z - 0.02 * s, 0.055 * s, 0x58b65a, 8, 6)];
const planter = (x, z, w = 0.12, d = 0.05) => [bx(x, G0, z, w, 0.04, d, 0x6b4a33), ...Array.from({ length: Math.max(2, Math.round(w / 0.035)) }, (_, i) => sp(x - w / 2 + 0.02 + i * (w - 0.04) / Math.max(1, Math.round(w / 0.035) - 1), G0 + 0.055, z, 0.024, i % 3 === 1 ? 0xe84a5f : i % 3 === 2 ? 0xffd23f : LEAF, 6, 5))];
const lamp = (x, z) => ({ b: [cy(x, G0, z, 0.006, 0.006, 0.2, DARK, 6), bx(x, G0 + 0.2, z, 0.03, 0.012, 0.03, DARK)], g: [sp(x, G0 + 0.19, z, 0.014, GLOW, 6, 5)] });
const bench = (x, z, r = 0) => [rbox(x, G0 + 0.03, z, 0.12, 0.012, 0.035, r, WOOD), rbox(x, G0 + 0.042, z - 0.016 * Math.cos(r), 0.12, 0.03, 0.008, r, WOOD), rbox(x - 0.05 * Math.cos(r), G0, z + 0.05 * Math.sin(r), 0.01, 0.03, 0.03, r, DARK), rbox(x + 0.05 * Math.cos(r), G0, z - 0.05 * Math.sin(r), 0.01, 0.03, 0.03, r, DARK)];
const person = (x, z, c, h = 1) => [bx(x, G0, z, 0.022, 0.05 * h, 0.016, 0x2f3a4a), cy(x, G0 + 0.05 * h, z, 0.014, 0.012, 0.045 * h, c, 7), sp(x, G0 + 0.108 * h, z, 0.013, SKIN, 7, 6)];
const table = (x, z) => [cy(x, G0, z, 0.006, 0.006, 0.05, DARK, 6), cy(x, G0 + 0.05, z, 0.032, 0.032, 0.006, WHITE, 12), bx(x - 0.045, G0, z, 0.02, 0.03, 0.02, WOOD), bx(x + 0.045, G0, z, 0.02, 0.03, 0.02, WOOD)];
const umbrella = (x, z) => ({ b: [cy(x, G0 + 0.05, z, 0.003, 0.003, 0.11, DARK, 5)], a: [G(new THREE.ConeGeometry(0.075, 0.035, 8).translate(x, G0 + 0.175, z), AW)] });
const ac = (x, y, z) => [bx(x, y, z, 0.07, 0.035, 0.05, 0xc9ced4), cy(x, y + 0.035, z, 0.018, 0.018, 0.004, 0x7d858f, 10)];
const parapet = (x, y, z, w, d, c, t = 0.018, h = 0.03) => [bx(x, y, z + d / 2 - t / 2, w, h, t, c), bx(x, y, z - d / 2 + t / 2, w, h, t, c), bx(x - w / 2 + t / 2, y, z, t, h, d, c), bx(x + w / 2 - t / 2, y, z, t, h, d, c)];
// vitrine acesa: moldura escura + vidro iluminado (no glow), com montantes verticais
const shopfront = (x, y, z, w, h, n, frame = DARK) => ({ b: [bx(x, y, z - 0.004, w + 0.02, h + 0.02, 0.008, frame), ...Array.from({ length: n + 1 }, (_, i) => bx(x - w / 2 + i * w / n, y, z + 0.002, 0.008, h, 0.006, frame))], g: [bx(x, y + 0.01, z, w, h - 0.01, 0.004, GLOW)] });
const windowLit = (x, y, z, w, h, lit = true, face = 1) => ({ b: [bx(x, y - 0.006, z - 0.003 * face, w + 0.016, h + 0.014, 0.006, WHITE), bx(x, y - 0.018, z + 0.004 * face, w + 0.03, 0.01, 0.014, WHITE)], g: lit ? [bx(x, y, z, w, h, 0.004, GLOW)] : [], v: lit ? [] : [bx(x, y, z, w, h, 0.004, GLASS)] });
const awning = (x, y, z, w, d, n) => { const b = [], a = []; for (let i = 0; i < n; i++) { const g = new THREE.BoxGeometry(w / n * 0.99, 0.012, d).rotateX(0.35).translate(x - w / 2 + (i + 0.5) * w / n, y, z + d / 2 - 0.01); (i % 2 ? b : a).push(G(g, i % 2 ? WHITE : AW)); } for (let i = 0; i < n; i++) (i % 2 ? b : a).push(G(new THREE.BoxGeometry(w / n * 0.99, 0.03, 0.006).translate(x - w / 2 + (i + 0.5) * w / n, y - 0.04, z + d - 0.005), i % 2 ? WHITE : AW)); return { b, a }; };
const bulbs = (x, y, z, w, n) => Array.from({ length: n }, (_, i) => sp(x - w / 2 + (i + 0.5) * w / n, y, z, 0.007, GLOW, 5, 4));
const logoBoard = (x, y, z, s, face = 1) => ({ b: [bx(x, y - 0.014, z - 0.008 * face, s + 0.034, s + 0.034, 0.016, DARK)], plane: new THREE.PlaneGeometry(s, s).translate(x, y + s / 2 - 0.014 + 0.003, z + 0.002 * face) });
const car = (x, z, r, paint = AW) => ({ a: paint === AW ? [rbox(x, G0 + 0.012, z, 0.15, 0.036, 0.075, r, AW)] : [], b: [...(paint === AW ? [] : [rbox(x, G0 + 0.012, z, 0.15, 0.036, 0.075, r, paint)]), rbox(x - 0.008 * Math.cos(r), G0 + 0.048, z + 0.008 * Math.sin(r), 0.08, 0.032, 0.066, r, 0xb8dcef),
  ...[[-0.048, 0.04], [0.048, 0.04], [-0.048, -0.04], [0.048, -0.04]].map(([a, c]) => G(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 10).rotateX(Math.PI / 2).translate(a, 0.017, c).rotateY(r).translate(x, G0, z), 0x1f2329))] });
const merge = (...ps) => { const o = { b: [], a: [], g: [], v: [] }; for (const p of ps) { if (Array.isArray(p)) { o.b.push(...p); continue; } for (const k of ['b', 'a', 'g', 'v']) if (p[k]) o[k].push(...p[k]); } return o; };
const done = (o, L) => ({ body: col([...o.b, ...o.v, ...L.b]), accent: o.a.length ? col(o.a) : null, glow: o.g.length ? col(o.g) : null, logo: L.plane });

export function makeBizModels() {
  const T = {};

  // 1 · LANCHONETE (diner retrô com hambúrguer gigante, mesas de piquenique e janela de drive-thru)
  { const o = merge(
      [bx(0, G0, -0.02, 0.66, 0.24, 0.48, CREAM), bx(0, G0 + 0.24, -0.02, 0.7, 0.025, 0.52, 0xd84a3a), bx(0, G0 + 0.14, 0.222, 0.66, 0.018, 0.012, 0xcfd6dc), ...parapet(0, G0 + 0.265, -0.02, 0.68, 0.5, 0xc23d2f),
        // hambúrguer gigante no telhado
        cy(0.14, G0 + 0.28, -0.05, 0.11, 0.11, 0.04, 0xd99a4e, 18), cy(0.14, G0 + 0.32, -0.05, 0.12, 0.12, 0.012, 0x5ca83a, 18), cy(0.14, G0 + 0.332, -0.05, 0.115, 0.115, 0.03, 0x6b3a22, 18), cy(0.14, G0 + 0.362, -0.05, 0.118, 0.118, 0.008, 0xf2c230, 18),
        G(new THREE.SphereGeometry(0.115, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0.14, G0 + 0.37, -0.05), 0xe0a454), ...[[0.1, -0.02], [0.17, -0.09], [0.19, 0], [0.09, -0.1]].map(([a, b]) => sp(a, G0 + 0.45, b, 0.008, 0xfff1d0, 4, 3)),
        ...ac(-0.2, G0 + 0.265, -0.15), bx(0.334, G0 + 0.08, 0.02, 0.012, 0.09, 0.12, DARK), bx(0.37, G0, 0.02, 0.06, 0.012, 0.18, 0xe9e2c8),
        ...[-0.26, 0.26].flatMap(x => [bx(x, G0 + 0.04, 0.36, 0.16, 0.01, 0.07, WOOD), bx(x, G0 + 0.022, 0.31, 0.16, 0.008, 0.03, WOOD), bx(x, G0 + 0.022, 0.41, 0.16, 0.008, 0.03, WOOD), bx(x - 0.06, G0, 0.36, 0.01, 0.04, 0.06, DARK), bx(x + 0.06, G0, 0.36, 0.01, 0.04, 0.06, DARK)]),
        ...person(-0.3, 0.3, 0xe0483e), ...person(0.22, 0.42, 0x3b82f6), ...person(0.36, 0.44, 0xf59e0b, 0.85), ...planter(0.02, 0.33, 0.14), ...tree(-0.42, -0.38, 1.1), ...tree(0.42, -0.4, 0.9)],
      shopfront(-0.08, G0 + 0.04, 0.224, 0.46, 0.12, 4), awning(-0.08, G0 + 0.19, 0.224, 0.52, 0.09, 8), lamp(0.42, 0.38), { g: bulbs(0, G0 + 0.255, 0.236, 0.64, 16) });
    T.lanchonete = done(o, logoBoard(-0.15, G0 + 0.3, 0.2, 0.15)); }

  // 2 · CAFETERIA (sobrado de esquina, vitrine, mesinhas com guarda-sol, floreiras, varal de luzes, xícara com vapor)
  { const u1 = umbrella(-0.28, 0.36), u2 = umbrella(0.02, 0.4), o = merge(
      [bx(0, G0, -0.03, 0.62, 0.44, 0.46, 0xd8c1a0), bx(0, G0 + 0.21, -0.03, 0.64, 0.02, 0.48, 0xbfa684), bx(0, G0 + 0.44, -0.03, 0.66, 0.025, 0.5, 0x6b4a33), ...parapet(0, G0 + 0.465, -0.03, 0.64, 0.48, 0x5a3e2b),
        cy(-0.14, G0 + 0.48, -0.08, 0.075, 0.09, 0.12, WHITE, 18), cy(-0.14, G0 + 0.598, -0.08, 0.085, 0.085, 0.006, 0x5a2f1a, 18), G(new THREE.TorusGeometry(0.04, 0.012, 6, 14).rotateY(Math.PI / 2).translate(-0.24, G0 + 0.55, -0.08), WHITE),
        sp(-0.15, G0 + 0.66, -0.08, 0.025, 0xf4f6f8, 7, 5), sp(-0.12, G0 + 0.71, -0.07, 0.02, 0xf4f6f8, 7, 5), sp(-0.15, G0 + 0.75, -0.08, 0.015, 0xf4f6f8, 6, 4),
        ...[-0.2, 0, 0.2].flatMap(x => [bx(x, G0 + 0.255, 0.21, 0.13, 0.03, 0.035, 0x6b4a33), sp(x - 0.035, G0 + 0.29, 0.215, 0.02, 0xe84a5f, 6, 5), sp(x, G0 + 0.295, 0.215, 0.02, 0xffd23f, 6, 5), sp(x + 0.035, G0 + 0.29, 0.215, 0.02, 0xc77dff, 6, 5)]),
        ...table(-0.28, 0.36), ...table(0.02, 0.4), ...table(0.3, 0.36), ...person(-0.33, 0.36, 0x14b8a6, 0.8), ...person(0.07, 0.4, 0xe0483e, 0.8), ...person(0.36, 0.45, 0x6b7280),
        bx(0.22, G0, 0.27, 0.07, 0.1, 0.012, 0x23272e), bx(0.22, G0 + 0.02, 0.277, 0.055, 0.07, 0.002, 0xf3f1ea), cy(0.43, G0 + 0.0, 0.42, 0.004, 0.004, 0.24, DARK, 5), cy(-0.43, G0, 0.42, 0.004, 0.004, 0.24, DARK, 5), ...tree(0.42, -0.36, 1.05)],
      shopfront(-0.03, G0 + 0.03, 0.2, 0.5, 0.15, 5), awning(-0.03, G0 + 0.19, 0.2, 0.56, 0.08, 9),
      ...[-0.2, 0, 0.2].map(x => windowLit(x, G0 + 0.3, 0.202, 0.11, 0.09, x !== 0)), u1, u2, umbrella(0.3, 0.36), { g: bulbs(0, G0 + 0.235, 0.42, 0.86, 14) });
    T.cafeteria = done(o, logoBoard(0.2, G0 + 0.45, 0.19, 0.12)); }

  // 3 · RESTAURANTE (trattoria de tijolo, janelas em arco, varanda com grade, chaminé com fumaça, terraço com lanternas)
  { const o = merge(
      [bx(0, G0, -0.06, 0.72, 0.46, 0.44, BRICK), bx(0, G0 + 0.22, -0.06, 0.74, 0.02, 0.46, 0xe9e4d6), ...gableRoof(-0.06), bx(0.26, G0 + 0.46, -0.18, 0.1, 0.22, 0.1, 0x7b4636), bx(0.26, G0 + 0.68, -0.18, 0.12, 0.02, 0.12, 0x5a3328),
        sp(0.26, G0 + 0.73, -0.18, 0.04, 0xdfe3e8, 8, 6), sp(0.29, G0 + 0.8, -0.16, 0.032, 0xeef1f4, 8, 6), sp(0.27, G0 + 0.86, -0.17, 0.022, 0xf6f8fa, 7, 5),
        bx(0, G0 + 0.24, 0.19, 0.5, 0.012, 0.07, 0xe9e4d6), ...Array.from({ length: 11 }, (_, i) => bx(-0.24 + i * 0.048, G0 + 0.252, 0.222, 0.006, 0.05, 0.006, DARK)), bx(0, G0 + 0.3, 0.222, 0.5, 0.008, 0.008, DARK),
        bx(0, 0.02, 0.33, 0.8, 0.012, 0.24, 0xc9b79c), ...[-0.3, -0.1, 0.1, 0.3].flatMap(x => [...table(x, 0.33)]), ...person(-0.05, 0.36, 0x7c3aed, 0.85), ...person(0.15, 0.3, 0xe0483e, 0.85), ...person(0.36, 0.44, 0x1f2937),
        ...[-0.38, 0.38].flatMap(x => [cy(x, G0, 0.44, 0.03, 0.035, 0.06, WOOD, 10), sp(x, G0 + 0.1, 0.44, 0.05, GREEN, 8, 6)]), ...planter(0, 0.215, 0.18), ...tree(-0.42, -0.4, 1.1)],
      ...[-0.25, 0.25].map(x => arched(x, G0 + 0.05, 0.162, 0.13, 0.14)), ...[-0.2, 0.2].map(x => windowLit(x, G0 + 0.3, 0.162, 0.1, 0.1, true)), { b: [bx(0, G0, 0.163, 0.12, 0.19, 0.01, 0x5a3328)], g: [bx(0, G0 + 0.02, 0.168, 0.08, 0.14, 0.003, GLOW)] },
      { a: [G(new THREE.BoxGeometry(0.6, 0.012, 0.09).rotateX(0.3).translate(0, G0 + 0.2, 0.205), AW)] }, { g: [...bulbs(0, G0 + 0.2, 0.44, 0.76, 12), ...bulbs(-0.38, G0 + 0.16, 0.33, 0.01, 1), ...bulbs(0.38, G0 + 0.16, 0.33, 0.01, 1)] }, lamp(-0.42, 0.26));
    T.restaurante = done(o, logoBoard(0, G0 + 0.36, 0.163, 0.11)); }

  // 4 · ACADEMIA (2 andares de vidro com esteiras à mostra, pista de corrida no telhado, halter-letreiro, bicicletário)
  { const o = merge(
      [bx(0, G0, -0.04, 0.78, 0.015, 0.5, 0x3a4250), bx(0, G0 + 0.22, -0.04, 0.8, 0.02, 0.52, 0x3a4250), bx(0, G0 + 0.44, -0.04, 0.82, 0.025, 0.54, 0x2a2f38), ...[-0.39, 0.39].map(x => bx(x, G0, -0.04, 0.02, 0.44, 0.5, 0x9aa3ad)),
        ...Array.from({ length: 5 }, (_, i) => bx(-0.24 + i * 0.12, G0 + 0.015, 0.1, 0.07, 0.03, 0.12, 0x23272e)), ...Array.from({ length: 5 }, (_, i) => bx(-0.24 + i * 0.12, G0 + 0.045, 0.06, 0.07, 0.04, 0.008, 0x23272e)),
        ...Array.from({ length: 4 }, (_, i) => person(-0.18 + i * 0.12, 0.1, [0xe0483e, 0x3b82f6, 0xf59e0b, 0x14b8a6][i], 0.8)).flat(), ...Array.from({ length: 3 }, (_, i) => bx(-0.2 + i * 0.2, G0 + 0.24, 0.05, 0.1, 0.05, 0.05, 0x23272e)),
        G(new THREE.RingGeometry(0.17, 0.21, 32).rotateX(-Math.PI / 2).translate(-0.1, G0 + 0.468, -0.04), 0xc0533a), G(new THREE.RingGeometry(0.19, 0.192, 32).rotateX(-Math.PI / 2).translate(-0.1, G0 + 0.469, -0.04), WHITE),
        G(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8).rotateZ(Math.PI / 2).translate(0.22, G0 + 0.54, -0.04), STEEL), ...[0.09, 0.35].flatMap(x => [G(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16).rotateZ(Math.PI / 2).translate(x, G0 + 0.54, -0.04), DARK), G(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 16).rotateZ(Math.PI / 2).translate(x + (x < 0.2 ? 0.035 : -0.035), G0 + 0.54, -0.04), DARK)]),
        cy(0.22, G0 + 0.465, -0.04, 0.008, 0.008, 0.05, DARK, 5), ...Array.from({ length: 4 }, (_, i) => G(new THREE.TorusGeometry(0.025, 0.004, 5, 12).translate(-0.3 + i * 0.05, G0 + 0.025, 0.36), DARK)), ...person(0.28, 0.4, 0xe0483e), ...person(0.34, 0.42, 0x111827), ...tree(0.43, -0.4, 1), ...tree(-0.43, 0.42, 0.85)],
      { g: [bx(0, G0 + 0.02, 0.212, 0.76, 0.19, 0.004, 0xbfe3f5), bx(0, G0 + 0.24, 0.212, 0.76, 0.19, 0.004, 0xd6eefa)] }, { b: Array.from({ length: 9 }, (_, i) => bx(-0.38 + i * 0.095, G0, 0.216, 0.01, 0.44, 0.01, 0x2a2f38)) },
      { a: [bx(0, G0 + 0.2, 0.222, 0.8, 0.022, 0.01, AW), bx(0, G0 + 0.43, 0.222, 0.82, 0.022, 0.01, AW), bx(0.399, G0 + 0.2, 0.15, 0.012, 0.22, 0.06, AW)] }, lamp(-0.42, 0.3));
    T.academia = done(o, logoBoard(-0.26, G0 + 0.47, 0.18, 0.13)); }

  // 5 · BARBEARIA (sobrado estreito de tijolo, poste listrado girando, cadeira à mostra, banco na calçada, apartamento em cima)
  { const pole = []; for (let i = 0; i < 8; i++) pole.push(cy(0.2, G0 + 0.06 + i * 0.016, 0.24, 0.016, 0.016, 0.016, [0xe0483e, WHITE, 0x2563eb, WHITE][i % 4], 12));
    const o = merge(
      [bx(-0.08, G0, -0.04, 0.5, 0.48, 0.46, 0x8a4a3a), bx(-0.08, G0 + 0.22, -0.04, 0.52, 0.02, 0.48, 0xe9e4d6), bx(-0.08, G0 + 0.48, -0.04, 0.54, 0.03, 0.5, 0x3a2a22), ...parapet(-0.08, G0 + 0.51, -0.04, 0.52, 0.48, 0x2a1e18, 0.016, 0.045),
        bx(0.28, G0, -0.06, 0.24, 0.3, 0.42, 0xe8dfcf), bx(0.28, G0 + 0.3, -0.06, 0.26, 0.02, 0.44, 0x6b7280), ...ac(0.28, G0 + 0.32, -0.12),
        cy(0.2, G0 + 0.04, 0.24, 0.022, 0.022, 0.02, 0xd9d9d9, 12), ...pole, sp(0.2, G0 + 0.2, 0.24, 0.022, 0xd9d9d9, 10, 8), cy(0.2, G0 + 0.0, 0.24, 0.004, 0.004, 0.04, DARK, 5),
        bx(-0.16, G0 + 0.04, 0.1, 0.06, 0.04, 0.06, 0xb91c1c), bx(-0.16, G0 + 0.08, 0.075, 0.06, 0.06, 0.012, 0xb91c1c), cy(-0.16, G0, 0.1, 0.012, 0.012, 0.04, STEEL, 6), ...person(-0.16, 0.1, 0x6b7280, 0.75), ...person(-0.08, 0.12, 0x111827),
        ...bench(-0.25, 0.36), ...person(-0.27, 0.36, 0x2563eb, 0.75), ...person(0.04, 0.44, 0x14b8a6), ...planter(0.3, 0.2, 0.16), ...tree(0.42, -0.38, 1)],
      shopfront(-0.08, G0 + 0.03, 0.192, 0.38, 0.15, 3), awning(-0.08, G0 + 0.19, 0.192, 0.44, 0.07, 6), ...[-0.2, 0.04].map(x => windowLit(x, G0 + 0.3, 0.193, 0.1, 0.11, x < 0)),
      { b: [bx(-0.2, G0 + 0.27, 0.205, 0.12, 0.025, 0.03, 0x6b4a33), bx(0.04, G0 + 0.27, 0.205, 0.12, 0.025, 0.03, 0x6b4a33), sp(-0.23, G0 + 0.3, 0.21, 0.016, 0xe84a5f, 5, 4), sp(-0.17, G0 + 0.3, 0.21, 0.016, LEAF, 5, 4), sp(0.01, G0 + 0.3, 0.21, 0.016, 0xffd23f, 5, 4), sp(0.07, G0 + 0.3, 0.21, 0.016, LEAF, 5, 4)] }, lamp(0.42, 0.4));
    T.barbearia = done(o, logoBoard(-0.08, G0 + 0.42, 0.195, 0.09)); }

  // 6 · MERCADO (supermercado largo, vitrine acesa, bancas de frutas, carrinhos, estacionamento com carros, letreiro no telhado)
  { const crates = []; [[-0.36, 0xe0483e], [-0.27, 0xf59e0b], [-0.18, 0x5cb85c], [0.18, 0xffd23f], [0.27, 0x8e44ad], [0.36, 0xe67e22]].forEach(([x, c]) => { crates.push(bx(x, G0, 0.19, 0.075, 0.04, 0.06, 0xb08350)); for (let i = 0; i < 6; i++) crates.push(sp(x - 0.024 + (i % 3) * 0.024, G0 + 0.05, 0.178 + Math.floor(i / 3) * 0.024, 0.012, c, 5, 4)); });
    const cart = (x, z) => [bx(x, G0 + 0.025, z, 0.05, 0.03, 0.035, 0xb7bec6), ...[[-0.018, -0.012], [0.018, -0.012], [-0.018, 0.012], [0.018, 0.012]].map(([a, b]) => cy(x + a, G0, z + b, 0.006, 0.006, 0.006, DARK, 6))];
    const o = merge(
      [bx(0, G0, -0.14, 0.86, 0.3, 0.42, 0xf1f3f5), bx(0, G0 + 0.3, -0.14, 0.88, 0.025, 0.44, 0x4b5563), ...parapet(0, G0 + 0.325, -0.14, 0.86, 0.42, 0x374151), bx(0, G0 + 0.21, 0.072, 0.86, 0.06, 0.012, 0x2f855a),
        ...ac(-0.28, G0 + 0.325, -0.24), ...ac(-0.1, G0 + 0.325, -0.26), ...ac(0.3, G0 + 0.325, -0.22), ...crates, ...cart(0.06, 0.12), ...cart(0.1, 0.13), ...cart(0.14, 0.14),
        bx(0, 0.02, 0.33, 0.9, 0.01, 0.26, 0x6b7280), ...[-0.3, -0.1, 0.1, 0.3].map(x => bx(x - 0.1, 0.03, 0.33, 0.006, 0.002, 0.2, WHITE)),
        ...person(-0.05, 0.2, 0xe0483e), ...person(0.22, 0.28, 0x2563eb), ...person(-0.24, 0.27, 0xf59e0b, 0.85), ...tree(-0.43, 0.15, 0.9), ...tree(0.43, 0.15, 0.9)],
      shopfront(0, G0 + 0.03, 0.073, 0.5, 0.16, 6), car(-0.3, 0.34, Math.PI / 2, 0xe0483e), car(-0.1, 0.34, Math.PI / 2, 0x2563eb), car(0.3, 0.34, Math.PI / 2, 0xf3f4f6),
      { a: [bx(0, G0 + 0.36, -0.03, 0.42, 0.08, 0.02, AW), bx(0, G0 + 0.205, 0.08, 0.86, 0.008, 0.012, AW)], b: [cy(-0.15, G0 + 0.325, -0.03, 0.006, 0.006, 0.04, DARK, 5), cy(0.15, G0 + 0.325, -0.03, 0.006, 0.006, 0.04, DARK, 5)] }, lamp(-0.42, 0.44), lamp(0.42, 0.44));
    T.mercado = done(o, logoBoard(0, G0 + 0.38, -0.018, 0.06)); }

  // 7 · CONCESSIONÁRIA (showroom de vidro com carro dentro, pátio com fileira de carros, bandeirinhas, totem alto, oficina)
  { const o = merge(
      [bx(-0.1, G0, -0.17, 0.62, 0.32, 0.36, 0xeef1f4), bx(-0.1, G0 + 0.32, -0.17, 0.66, 0.03, 0.4, 0x1f2937), bx(0.32, G0, -0.17, 0.22, 0.24, 0.36, 0xd1d5db), bx(0.32, G0 + 0.03, 0.012, 0.16, 0.16, 0.008, 0x9ca3af),
        ...Array.from({ length: 5 }, (_, i) => bx(0.32, G0 + 0.05 + i * 0.03, 0.017, 0.16, 0.004, 0.004, 0x6b7280)), bx(0, 0.02, 0.24, 0.94, 0.01, 0.34, 0x7b818a), ...[-0.33, -0.11, 0.11, 0.33].map(x => bx(x, 0.031, 0.24, 0.006, 0.002, 0.26, WHITE)),
        cy(0.43, G0, 0.08, 0.018, 0.022, 0.62, DARK, 8), ...[-0.44, -0.2, 0.04, 0.28].map(x => cy(x, G0, 0.44, 0.005, 0.005, 0.26, 0xdddddd, 5)), ...person(0.1, 0.12, 0x111827), ...person(0.16, 0.13, 0xe0483e, 0.9), ...tree(-0.44, -0.42, 1)],
      { g: [bx(-0.1, G0 + 0.02, 0.012, 0.58, 0.27, 0.004, 0xcfe8f6)] }, { b: Array.from({ length: 5 }, (_, i) => bx(-0.39 + i * 0.145, G0, 0.016, 0.01, 0.32, 0.01, 0x1f2937)) },
      car(-0.12, -0.1, 0.35, 0xf59e0b), car(-0.33, 0.2, Math.PI / 2), car(-0.11, 0.2, Math.PI / 2), car(0.11, 0.2, Math.PI / 2, 0x111827), car(0.33, 0.24, Math.PI / 2 - 0.2),
      { a: [bx(-0.1, G0 + 0.3, 0.02, 0.66, 0.03, 0.012, AW), ...[-0.44, -0.2, 0.04, 0.28].flatMap(x => [G(new THREE.BoxGeometry(0.06, 0.04, 0.003).translate(x + 0.03, G0 + 0.24, 0.44), AW)])] },
      { g: bulbs(-0.08, G0 + 0.255, 0.44, 0.72, 12) });
    T.concessionaria = done(o, logoBoard(0.43, G0 + 0.62, 0.1, 0.13)); }

  // 8 · CINEMA (fachada art déco, marquise com lâmpadas, letreiro vertical, cartazes acesos, tapete vermelho, bilheteria)
  { const o = merge(
      [bx(0, G0, -0.08, 0.74, 0.5, 0.44, 0x7c2d3b), bx(0, G0 + 0.5, -0.08, 0.6, 0.06, 0.44, 0x6b2433), bx(0, G0 + 0.56, -0.08, 0.4, 0.04, 0.44, 0x5a1d2a), ...[-0.3, -0.15, 0.15, 0.3].map(x => bx(x, G0 + 0.22, 0.142, 0.03, 0.34, 0.012, 0xe3b43c)),
        bx(0, G0 + 0.2, 0.2, 0.62, 0.06, 0.14, 0x1f2937), bx(0, G0 + 0.26, 0.2, 0.6, 0.01, 0.12, 0x111827), bx(0.31, G0 + 0.24, 0.16, 0.05, 0.34, 0.07, 0xe3b43c),
        bx(0, 0.022, 0.32, 0.16, 0.004, 0.3, 0xb91c1c), ...[-0.1, 0.1].flatMap(x => [0.26, 0.38].flatMap(z => [cy(x, G0, z, 0.008, 0.008, 0.05, 0xe3b43c, 6), sp(x, G0 + 0.055, z, 0.01, 0xe3b43c, 5, 4)])), ...[-0.1, 0.1].map(x => bx(x, G0 + 0.045, 0.32, 0.004, 0.006, 0.12, 0xb91c1c)),
        bx(-0.25, G0, 0.22, 0.1, 0.16, 0.08, 0xe3b43c), bx(-0.25, G0 + 0.16, 0.22, 0.12, 0.02, 0.1, 0x7c2d3b), ...person(-0.04, 0.34, 0x111827), ...person(0.03, 0.4, 0xc77dff), ...person(0.2, 0.42, 0x14b8a6), ...person(-0.36, 0.36, 0x3b82f6), ...tree(0.43, -0.4, 1), ...tree(-0.43, -0.4, 1)],
      { g: [bx(0, G0 + 0.205, 0.271, 0.56, 0.05, 0.004, 0xfff3c4), ...bulbs(0, G0 + 0.258, 0.272, 0.6, 22), ...bulbs(0, G0 + 0.198, 0.272, 0.6, 22), ...Array.from({ length: 9 }, (_, i) => sp(0.31, G0 + 0.27 + i * 0.035, 0.197, 0.012, 0xfff3c4, 6, 5)),
        ...[-0.225, 0.225].map(x => bx(x, G0 + 0.3, 0.15, 0.08, 0.12, 0.004, 0xffe9b0)), bx(-0.25, G0 + 0.06, 0.262, 0.07, 0.06, 0.003, GLOW), bx(0, G0 + 0.01, 0.143, 0.22, 0.17, 0.003, GLOW)] },
      { b: [bx(0, G0, 0.141, 0.24, 0.19, 0.006, 0x3a1219), ...[-0.225, 0.225].map(x => bx(x, G0 + 0.29, 0.146, 0.1, 0.14, 0.006, 0xe3b43c))] }, { a: [bx(0, G0 + 0.232, 0.272, 0.62, 0.02, 0.006, AW), bx(0.31, G0 + 0.58, 0.16, 0.06, 0.03, 0.08, AW)] }, lamp(-0.44, 0.44), lamp(0.44, 0.44));
    T.cinema = done(o, logoBoard(0, G0 + 0.6, 0.142, 0.1)); }

  // 9 · TECNOLOGIA (torre de vidro escalonada, terraço-jardim, heliponto, faixa de LED, lobby aceso, praça com escultura)
  { const fl = [], o0 = [];
    for (let k = 1; k < 10; k++) fl.push(bx(0, G0 + k * 0.08, 0.181, 0.42, 0.006, 0.006, 0xdbe6f0), bx(0, G0 + k * 0.08, -0.181 - 0.08, 0.42, 0.006, 0.006, 0xdbe6f0));
    const o = merge(
      [bx(0, G0, -0.04, 0.42, 0.8, 0.44, 0x3f6fa8), bx(0.02, G0 + 0.8, -0.06, 0.32, 0.22, 0.34, 0x355f93), bx(0.02, G0 + 1.02, -0.06, 0.34, 0.02, 0.36, 0x1f2937), cy(0.02, G0 + 1.04, -0.06, 0.1, 0.1, 0.006, 0x4b5563, 20), G(new THREE.RingGeometry(0.06, 0.07, 20).rotateX(-Math.PI / 2).translate(0.02, G0 + 1.047, -0.06), 0xffd21f),
        ...fl, ...Array.from({ length: 6 }, (_, i) => bx(-0.21 + i * 0.084, G0, 0.181, 0.006, 0.8, 0.006, 0xdbe6f0)), ...planter(-0.1, 0.1, 0.12), ...[-0.12, 0.12].flatMap(x => [sp(x, G0 + 0.83, 0.08, 0.035, GREEN, 7, 5)]), bx(0, G0 + 0.8, 0.08, 0.42, 0.014, 0.16, 0x86c45a),
        cy(0.16, G0 + 1.04, -0.15, 0.005, 0.005, 0.24, 0xdddddd, 5), bx(0, 0.02, 0.32, 0.6, 0.012, 0.22, 0xd9d6cc), cy(0, G0, 0.34, 0.06, 0.06, 0.03, 0xbfc5cc, 16), G(new THREE.TorusKnotGeometry(0.03, 0.009, 40, 6).translate(0, G0 + 0.085, 0.34), 0x9ca3af),
        ...bench(-0.22, 0.38), ...bench(0.22, 0.38), ...person(-0.08, 0.26, 0x111827), ...person(0.1, 0.42, 0x3b82f6), ...person(0.26, 0.3, 0xe0483e), ...tree(-0.42, 0.36, 1), ...tree(0.42, 0.36, 1), ...tree(-0.42, -0.36, 0.9)],
      { g: [bx(0, G0 + 0.01, 0.184, 0.38, 0.07, 0.004, GLOW), sp(0.16, G0 + 1.28, -0.15, 0.016, 0xff3b30, 6, 5), ...Array.from({ length: 12 }, (_, i) => bx(-0.15 + (i % 4) * 0.1, G0 + 0.12 + Math.floor(i / 4) * 0.24, 0.183, 0.05, 0.05, 0.003, 0xfff1c7))] },
      { a: [bx(0, G0 + 0.77, 0.184, 0.42, 0.03, 0.006, AW), bx(0.211, G0 + 0.77, -0.04, 0.006, 0.03, 0.44, AW), bx(-0.211, G0 + 0.77, -0.04, 0.006, 0.03, 0.44, AW)] }, lamp(0.3, 0.22), lamp(-0.3, 0.22));
    T.tecnologia = done(o, logoBoard(0.02, G0 + 0.86, 0.112, 0.11)); }
  return T;
}

// telhado de duas águas do restaurante (cumeeira ao longo de X)
function gableRoof(z) { return [gable(0, G0 + 0.46, z, 0.74, 0.46, 0.14, 0x5b3a2e)]; }
// janela em arco: retângulo + meio círculo, iluminada
function arched(x, y, z, w, h) {
  const disc = new THREE.CircleGeometry(w / 2, 14, 0, Math.PI).translate(x, y + h, z + 0.001), frame = new THREE.CircleGeometry(w / 2 + 0.012, 14, 0, Math.PI).translate(x, y + h, z - 0.002);
  return { b: [bx(x, y - 0.01, z - 0.004, w + 0.024, h + 0.01, 0.008, WHITE), G(frame, WHITE), bx(x, y - 0.02, z + 0.006, w + 0.04, 0.012, 0.016, WHITE)], g: [bx(x, y, z, w, h, 0.004, GLOW), G(disc, GLOW)] };
}
