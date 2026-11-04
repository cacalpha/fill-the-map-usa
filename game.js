// Regras do jogo (sem 3D, sem DOM): pontos, 15 níveis, cargos, vagas que crescem com o mapa, mandato semanal.
export const LEVELS = [
  { n: 0, name: 'Cottage' }, { n: 20, name: 'Two-story' }, { n: 30, name: 'Tall house' }, { n: 45, name: 'Mansion' },
  { n: 70, name: 'Tower' }, { n: 100, name: 'Apartments' }, { n: 130, name: 'Office tower' }, { n: 190, name: 'Skyscraper' },
  { n: 260, name: 'Glass tower' }, { n: 340, name: 'Twin towers' }, { n: 430, name: 'Luxury tower' }, { n: 560, name: 'Megatower' },
  { n: 720, name: 'Golden tower' }, { n: 920, name: 'Diamond tower' }, { n: 1200, name: 'Top of the map' }];
export const levelOf = pts => { let l = 0; for (let i = 0; i < LEVELS.length; i++) if (pts >= LEVELS[i].n) l = i; return l; };


// ================= ECONOMIA (ajuste tudo aqui) =================
// Moedas ganhas (comentar etc.) viram SALDO. Fase da casa e candidatura são COMPRADAS com saldo.
export const PHASE_PRICE = [30, 45, 70, 100, 150, 220, 330, 480, 700, 1000, 1400, 2000, 2800, 4000];   // preço de ir da fase k para k+1 (k = 0..13)
export const FEE = { council: 60, mayor: 75, representative: 90, governor: 120, senator: 150, vice: 180, president: 225 };    // taxa para se candidatar
export const SALARY = { council: 30, mayor: 45, representative: 55, governor: 70, senator: 85, vice: 110, president: 150 }; // moedas por hora no cargo
export const OFFICE_ROLE = { president: 0, vice: 1, senator: 2, governor: 3, representative: 4, mayor: 5, council: 6 };
export const OFFICE_SCOPE = { president: 'usa', vice: 'usa', senator: 'usa', governor: 'state', representative: 'state', mayor: 'city', council: 'city' };
export const OFFICE_SEATS = { president: 1, vice: 1 };   // vice: mude para 2 se quiser dois vice-presidentes
export const VOTE_REWARD = 50;   // moedas para quem vota (1 vez por urna, no 1º voto válido)
export const ELECTION = { openH: 17, closeH: 19 };        // domingo, horário de Nova York: urna abre 17h e fecha 19h (2 horas)

export const POINTS = { house: 10, comment: 5, extra: 1, extraMax: 10, tag: 3, tagMax: 10, vote: 5, recruit: 25, story: 30, biz: 10 };
export const HOT_MS = 24 * 3600e3;   // casa 'em alta' depois de um story
export const BREAK_KEYS = ['house', 'comments', 'extras', 'tags', 'recruits', 'stories', 'votes', 'biz'];

// 0 mais alto … 6 morador
export const ROLES = [
  { id: 'president', title: 'President', icon: '★', tag: 'PRES', color: '#b06cff', hex: 0xb06cff, scope: 'USA' },
  { id: 'vice', title: 'Vice President', icon: '★', tag: 'VP', color: '#d946ef', hex: 0xd946ef, scope: 'USA' },
  { id: 'senator', title: 'Senator', icon: '★', tag: 'SEN', color: '#3b82f6', hex: 0x3b82f6, scope: 'USA' },
  { id: 'governor', title: 'Governor', icon: '♛', tag: 'GOV', color: '#e0483e', hex: 0xe0483e, scope: 'state' },
  { id: 'representative', title: 'Representative', icon: '◆', tag: 'REP', color: '#f59e0b', hex: 0xf59e0b, scope: 'state' },
  { id: 'mayor', title: 'Mayor', icon: '🏛', tag: 'MAYOR', color: '#22a559', hex: 0x22a559, scope: 'city' },
  { id: 'council', title: 'Councilmember', icon: '✦', tag: 'COUNCIL', color: '#14b8a6', hex: 0x14b8a6, scope: 'city' },
  { id: 'resident', title: 'Resident', icon: '⌂', tag: '', color: '#8a93a3', hex: 0x8a93a3, scope: 'city' }];

// cadeiras reais da Câmara (censo 2020); as vagas ABERTAS crescem com o nº de moradores no estado/cidade
export const HOUSE_SEATS = { AK: 1, HI: 2, AL: 7, AZ: 9, AR: 4, CA: 52, CO: 8, CT: 5, DE: 1, DC: 1, FL: 28, GA: 14, ID: 2, IL: 17, IN: 9, IA: 4, KS: 4, KY: 6, LA: 6, ME: 2, MD: 8, MA: 9, MI: 13, MN: 8, MS: 4, MO: 8, MT: 2, NE: 3, NV: 4, NH: 2, NJ: 12, NM: 3, NY: 26, NC: 14, ND: 1, OH: 15, OK: 5, OR: 6, PA: 17, RI: 2, SC: 7, SD: 1, TN: 9, TX: 38, UT: 4, VT: 1, VA: 11, WA: 10, WV: 2, WI: 8, WY: 1 };
export const OPEN = { mayor: 3, governor: 5 };   // moradores necessários para abrir a vaga
export const SEATS = {
  senators: total => Math.max(3, Math.min(100, Math.round(total * 0.04))),
  reps: (st, stateRes) => Math.min(HOUSE_SEATS[st] ?? 1, Math.floor(stateRes * 0.25)),
  council: cityRes => Math.min(20, Math.floor(cityRes * 0.5)),
};

// cargos seguem os pontos da SEMANA (w); desempate: total (n), depois casa mais antiga
export const better = (a, b) => b.w - a.w || b.n - a.n || a.ts - b.ts || (a.h < b.h ? -1 : 1);

// houses: [{h,city,st,n,ts,key,...}]  ->  preenche role e devolve estruturas de consulta
export function computeOffices(houses, elected = null) {
  const byState = new Map(), byCity = new Map();
  for (const o of houses) { (byState.get(o.st) ?? byState.set(o.st, []).get(o.st)).push(o); (byCity.get(o.key) ?? byCity.set(o.key, []).get(o.key)).push(o); }
  for (const l of byState.values()) l.sort(better); for (const l of byCity.values()) l.sort(better);
  const usa = [...houses].sort(better); const taken = new Set(); const set = (o, r) => { o.role = r; taken.add(o); };
  for (const o of houses) o.role = 7;
  const H = { president: null, vp: null, senators: [], governors: new Map(), reps: new Map(), mayors: new Map(), councils: new Map(), seats: {} };
  const byH = new Map(houses.map(o => [o.h, o])), E = elected ?? {}, pick = hs => (hs ?? []).map(h => byH.get(h)).filter(o => o && !taken.has(o));
  { const p = pick([E.president])[0]; if (p) { set(p, 0); H.president = p; } else { const q = usa.find(o => !taken.has(o)); if (q) { set(q, 0); H.president = q; } } }
  { const p = pick([E.vice])[0]; if (p) { set(p, 1); H.vp = p; } else { const q = usa.find(o => !taken.has(o)); if (q) { set(q, 1); H.vp = q; } } }
  const nSen = SEATS.senators(houses.length); H.seats.senators = nSen;
  for (const o of pick(E.senators)) { if (H.senators.length >= nSen) break; set(o, 2); H.senators.push(o); }
  for (const o of usa) { if (H.senators.length >= nSen) break; if (!taken.has(o)) { set(o, 2); H.senators.push(o); } }
  for (const [st, l] of byState) { if (l.length < OPEN.governor) continue; const g = pick([E.governors?.[st]])[0] ?? l.find(o => !taken.has(o)); if (g) { set(g, 3); H.governors.set(st, g); } }
  for (const [st, l] of byState) { const n = SEATS.reps(st, l.length), r = []; for (const o of pick(E.reps?.[st])) { if (r.length >= n) break; set(o, 4); r.push(o); } for (const o of l) { if (r.length >= n) break; if (!taken.has(o)) { set(o, 4); r.push(o); } } H.reps.set(st, r); }
  // prefeito: quem escolheu a cidade vem antes de quem foi sorteado nela (prov)
  for (const [k, l] of byCity) { if (l.length < OPEN.mayor) continue; const m = pick([E.mayors?.[k]])[0] ?? l.find(o => !taken.has(o) && !o.prov) ?? l.find(o => !taken.has(o)); if (m) { set(m, 5); H.mayors.set(k, m); } }
  for (const [k, l] of byCity) { const n = SEATS.council(l.length), r = []; for (const o of pick(E.councils?.[k])) { if (r.length >= n) break; set(o, 6); r.push(o); } for (const o of l) { if (r.length >= n) break; if (!taken.has(o)) { set(o, 6); r.push(o); } } H.councils.set(k, r); }
  return { usa, byState, byCity, H };
}

// "faltam X pontos pra <cargo>" por escopo
export function nextSteps(o, ctx) {
  const { usa, byState, byCity, H } = ctx, need = p => Math.max(1, p - o.w + 1), last = a => a?.[a.length - 1];
  const st = byState.get(o.st), ct = byCity.get(o.key), out = {};
  out.city = { rank: ct.indexOf(o) + 1, of: ct.length };
  if (o.role <= 5) out.city.text = o.role === 5 ? 'You run this city' : 'Above the city';
  else if (o.role === 6) { const m = H.mayors.get(o.key); out.city.text = m ? `${need(m.n)} coins to become Mayor` : `${Math.max(1, OPEN.mayor - ct.length)} more houses open the Mayor seat`; }
  else { const c = H.councils.get(o.key), seats = SEATS.council(ct.length); out.city.text = seats === 0 ? 'More neighbors open the city council' : last(c) ? `${need(last(c).n)} coins to join the council` : 'Council seat open'; }
  out.state = { rank: st.indexOf(o) + 1, of: st.length };
  if (o.role <= 3) out.state.text = o.role === 3 ? 'You run this state' : 'Above the state';
  else if (o.role === 4) { const g = H.governors.get(o.st); out.state.text = g ? `${need(g.n)} coins to become Governor` : `${Math.max(1, OPEN.governor - st.length)} more houses open the Governor seat`; }
  else { const r = H.reps.get(o.st), seats = SEATS.reps(o.st, st.length); out.state.text = seats === 0 ? 'More residents open House seats' : last(r) ? `${need(last(r).n)} coins to become Representative` : 'House seat open'; }
  out.usa = { rank: usa.indexOf(o) + 1, of: usa.length };
  if (o.role === 0) out.usa.text = 'Top of the USA';
  else if (o.role === 1) out.usa.text = `${need(H.president.n)} coins to become President`;
  else if (o.role === 2) out.usa.text = `${need(H.vp.n)} coins to become Vice President`;
  else { const s = last(H.senators); out.usa.text = s ? `${need(s.n)} coins to become Senator` : 'Senate seat open'; }
  return out;
}

// próximo domingo às `hour` horas em Nova York (estritamente depois de `now`)
function nextSundayAt(hour, now = new Date()) {
  const nyParts = d => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false, weekday: 'short' }).formatToParts(d).map(p => [p.type, p.value]));
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  for (let add = 0; add < 9; add++) {
    const d = new Date(now.getTime() + add * 864e5), p = nyParts(d);
    if (wd[p.weekday] !== 0) continue;
    for (const off of [4, 5]) { const t = new Date(Date.UTC(+p.year, +p.month - 1, +p.day, hour + off, 0, 0)); const q = nyParts(t); if (+q.hour % 24 === hour && wd[q.weekday] === 0 && t > now) return t; }
  }
  return new Date(now.getTime() + 7 * 864e5);
}
export const nextMandateEnd = (now = new Date()) => nextSundayAt(ELECTION.closeH, now);
// estado da eleição desta semana: 'upcoming' (urna ainda fechada) ou 'open' (17h–19h de domingo)
export function electionState(now = new Date()) {
  const closes = nextMandateEnd(now), opens = new Date(+closes - (ELECTION.closeH - ELECTION.openH) * 3600e3);
  return { phase: now >= opens ? 'open' : 'upcoming', opens, closes, id: 'E' + closes.toISOString().slice(0, 10) };
}
// início do mandato atual (fechamento anterior, domingo 19h ET, nunca antes do lançamento)
export const mandateStart = (launch, now = new Date()) => new Date(Math.max(+launch, +nextMandateEnd(now) - 7 * 864e5));
export const mandateNumber = (launch, now = new Date()) => { const end = nextMandateEnd(now), first = nextMandateEnd(new Date(launch)); return Math.max(1, Math.round((end - first) / (7 * 864e5)) + 1); };
export const countdown = ms => { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return `${d}d ${h}h ${String(m).padStart(2, '0')}min`; };

// Obras famosas: ficam prontas quando a cidade chega à meta de moradores (meta cresce com a população)
export const WONDERS = [
  { id: 'statue', city: 'New York', st: 'NY', name: 'Statue of Liberty' }, { id: 'sign', city: 'Los Angeles', st: 'CA', name: 'Hollywood Sign' },
  { id: 'bean', city: 'Chicago', st: 'IL', name: 'Cloud Gate' }, { id: 'rocket', city: 'Houston', st: 'TX', name: 'Space Center Rocket' },
  { id: 'bellhall', city: 'Philadelphia', st: 'PA', name: 'Liberty Bell Hall' }, { id: 'alamo', city: 'San Antonio', st: 'TX', name: 'The Alamo' },
  { id: 'ballstower', city: 'Dallas', st: 'TX', name: 'Reunion Tower' }, { id: 'bridge', city: 'San Francisco', st: 'CA', name: 'Golden Gate Bridge' },
  { id: 'needle', city: 'Seattle', st: 'WA', name: 'Space Needle' }, { id: 'obelisk', city: 'Washington', st: 'DC', name: 'Washington Monument' },
  { id: 'arch', city: 'Saint Louis', st: 'MO', name: 'Gateway Arch' }, { id: 'pyramid', city: 'Memphis', st: 'TN', name: 'Bass Pro Pyramid' },
  { id: 'temple', city: 'Salt Lake City', st: 'UT', name: 'Salt Lake Temple' }, { id: 'lighthouse', city: 'Portland', st: 'ME', name: 'Portland Head Light' },
  { id: 'parthenon', city: 'Nashville', st: 'TN', name: 'The Parthenon' }, { id: 'dome', city: 'Austin', st: 'TX', name: 'Texas Capitol' }];
export const wonderTarget = pop => Math.max(10, Math.min(300, Math.round(Math.sqrt(pop || 100000) / 8)));
