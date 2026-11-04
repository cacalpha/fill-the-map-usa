// Albers equal-area conic (EUA contíguos). Usado no node (prep) e no browser, para bater igual.
const R = Math.PI / 180, p1 = 29.5 * R, p2 = 45.5 * R, p0 = 38.7 * R, l0 = -96.6 * R;
const n = (Math.sin(p1) + Math.sin(p2)) / 2;
const C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
const rho = p => Math.sqrt(C - 2 * n * Math.sin(p)) / n;
const rho0 = rho(p0);

export function rawProject(lon, lat) {
  const th = n * (lon * R - l0), r = rho(lat * R);
  return [r * Math.sin(th), r * Math.cos(th) - rho0]; // x = leste, z = sul
}

// meta = { K, cx, cz } vindo de us.json. Devolve [x, z] em unidades do mundo (EUA ~100 de largura).
export function makeToWorld(meta) {
  return (lon, lat) => {
    const [x, z] = rawProject(lon, lat);
    return [(x - meta.cx) * meta.K, (z - meta.cz) * meta.K];
  };
}
