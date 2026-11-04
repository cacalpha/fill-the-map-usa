// Interface: abas, cartão da casa, ranking, Capitol (mandato), dados, como funciona, negócio, imagem de story.
import { initShop } from './shop.js';
import { PHASE_PRICE, FEE, SALARY, VOTE_REWARD, ELECTION, OFFICE_SCOPE, electionState, LEVELS, ROLES, POINTS, OPEN, SEATS, nextSteps, nextMandateEnd, mandateNumber, countdown, better, levelOf, WONDERS, HOT_MS, HOUSE_SEATS as GAME_HOUSE_SEATS } from './game.js';
import { LANDMARKS } from './town.js';
import { balanceOf, liveSalary } from './econ.js';
const $ = id => document.getElementById(id);
// selos especiais dados à mão (só visual; não dão moedas nem vantagem)
const SPECIAL_BADGES = { nnot_cole: ['🧪 First Tester'] };
const fmt = n => n.toLocaleString('en-US');
const LVL_ICON = ['🏠', '🏡', '🏘️', '🏰', '🏢', '🏬', '🏙️', '🌇', '🪟', '🌃', '🏛️', '🗼', '👑', '💎', '🌟'];
const BR_LABEL = [['house', 'your house', '#7dc4f2'], ['comments', 'comments', '#ffd21f'], ['extras', 'extra comments', '#ffa65c'], ['tags', 'tagged friends', '#5cb85c'], ['recruits', 'recruited', '#ef6f6c'], ['stories', 'stories & bonus', '#b9a2e8'], ['votes', 'votes', '#4fd1c5'], ['biz', 'tagged businesses', '#f6a5c0']];
const BIZ_TYPES = ['Restaurant / food', 'Ice cream / coffee', 'Market / bakery', 'Clothing store', 'Salon / barber / beauty', 'Gym / sports', 'Phone / IT', 'Flowers / gifts', 'Pet shop / vet', 'Auto / garage', 'Service / office / school', 'Creator / page', 'Other'];
const BIZ_COLORS = ['#e0483e', '#ff9f43', '#ffd21f', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#1e2430'];

const LOOK_NAMES = {"castle": "🏰 Castle", "mansion": "🏛 Mansion", "cabin": "🪵 Log cabin", "fence": "Fence", "flag": "🚩 Flag", "tree": "🌳 Tree", "car": "🚗 Car", "playground": "🛝 Playground", "slide": "💦 Water slide", "pool": "🏊 Pool"};
export function initUI(A) {
  const { houses, towns, office, esc, states, stateByCode, SITE, launch, hd, hotHouses, LED } = A;
  const { H } = office, usa = office.usa;
  const post = SITE.postUrl ?? 'https://www.instagram.com/' + (SITE.igHandle ?? '');
  const igLink = SITE.igHandle ? `https://www.instagram.com/${SITE.igHandle}/` : '#';
  const day1 = Date.parse(SITE.day1 ?? hd.launch ?? SITE.launch), day = Math.max(1, Math.floor((Date.now() - day1) / 864e5) + 1), totalPts = houses.reduce((a, o) => a + o.n, 0);
  const cityCount = k => office.byCity.get(k)?.length ?? 0;
  const sheet = $('sheet'), PANELS = ['find', 'rank', 'capitol', 'data', 'how'];
  const toastEl = $('toast'); let toastT; const toast = m => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2400); };
  const copy = async (t, msg = 'Copied') => { try { await navigator.clipboard.writeText(t); toast(msg); } catch { prompt('Copy this:', t); } };
  const roleOf = o => ROLES[o.role], roleTag = o => o.role <= 5 ? `<span class="rtag" style="background:${roleOf(o).color}">${roleOf(o).tag}</span>` : '';
  const scopeName = o => o.role <= 2 ? 'the USA' : o.role <= 4 ? stateByCode.get(o.st).name : o.city;

  // ---------- cabeçalho ----------
  document.title = houses.length ? `${SITE.name} · find your house` : document.title;
  $('brandname').textContent = SITE.name; $('day').textContent = `DAY ${day}`;
  $('n-houses').textContent = fmt(houses.length); $('n-cities').textContent = fmt(office.byCity.size); $('n-states').textContent = `${office.byState.size}/${states.length}`;
  document.querySelectorAll('.reelhint').forEach(e => e.textContent = SITE.reelHint);
  if (SITE.igHandle) document.querySelectorAll('.ig').forEach(e => { e.href = igLink; e.textContent = `Follow @${SITE.igHandle}`; e.hidden = false; });
  function openTab(name) { document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', x.dataset.p === name)); for (const p of PANELS) $('p-' + p).hidden = p !== name; sheet.classList.remove('min'); if (name === 'capitol') renderCapitol(); }
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => openTab(t.dataset.p)); $('grab').onclick = () => sheet.classList.toggle('min');
  new ResizeObserver(() => document.documentElement.style.setProperty('--sh', sheet.offsetHeight + 'px')).observe(sheet);
  $('zin').onclick = () => A.zoomBy(0.55); $('zout').onclick = () => A.zoomBy(1.8); $('zhome').onclick = A.goHome; $('zhelp').onclick = () => openTab('how');
  $('qrank').onclick = () => openTab('rank'); $('qdata').onclick = () => openTab('data'); $('qcap').onclick = () => { openTab('capitol'); };
  $('qdc').onclick = () => { const t = A.townByKey.get('Washington|DC'); if (t) A.flyTown(t); };
  const SHOP = initShop(A); $('qshop').onclick = () => SHOP.open(); $('zshop') && ($('zshop').onclick = () => SHOP.open()); document.addEventListener('click', e => { if (e.target.closest?.('.shopgo')) SHOP.open('skins'); }); $('qbiz').onclick = () => SHOP.open('biz'); $('qbiz2') && ($('qbiz2').onclick = () => SHOP.open('biz'));

  // ---------- busca ----------
  const normHandle = s => s.trim().replace(/^.*instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@+/, '').toLowerCase();
  const nameKey = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  function find(raw) {
    const text = raw.trim(); if (!text) return; const h = normHandle(text), o = /^[a-z0-9._]{1,30}$/.test(h) ? A.byHandle.get(h) : null; if (o) return showHouse(o);
    const key = nameKey(text.replace(/^@/, '')), code = key.toUpperCase(), st = states.find(s => nameKey(s.name) === key || (key.length === 2 && s.st === code));
    if (st) { showState(st); return; }
    const cts = towns.filter(t => nameKey(t.name) === key || (key.length > 2 && nameKey(t.name).startsWith(key)) || t.also?.some(n => nameKey(n) === key)).sort((a, b) => (b.n - a.n) || ((b.pop ?? 0) - (a.pop ?? 0)));
    if (cts.length && !text.startsWith('@')) { showTown(cts[0]); return; }
    if (!/^[a-z0-9._]{1,30}$/.test(h)) { toast('Enter an @, a city or a state'); return; }
    openTab('find'); $('out').innerHTML = `<div class="res"><h3>@${esc(h)} isn’t on the map yet</h3><p class="hint" style="margin:8px 0 12px">Comment your city (like <b>“Austin, TX”</b>) on <b>${esc(SITE.reelHint)}</b> and your house appears on the next update.</p><a class="btn" style="display:block;text-align:center;text-decoration:none;padding:11px" href="${post}" target="_blank" rel="noopener">Open the post</a></div>`;
  }
  A.find = find; $('f').onsubmit = e => { e.preventDefault(); $('handle').blur(); find($('handle').value); };

  // ---------- cartão ----------
  function levelStrip(o) {
    const L = o.level, from = Math.max(0, Math.min(L - 1, LEVELS.length - 5)), price = PHASE_PRICE[L], bal = Math.max(0, o.bal), pct = price ? Math.min(100, Math.round(bal / price * 100)) : 100;
    return `<div class="lvstrip">${LEVELS.slice(from, from + 5).map((l, k) => `<div class="lvchip${from + k === L ? ' on' : from + k < L ? ' done' : ''}"><span>${LVL_ICON[from + k]}</span><b>Phase ${from + k + 1}</b><small>${from + k < L ? 'owned' : from + k === L ? 'yours' : `🪙 ${PHASE_PRICE[from + k - 1] ?? ''}`}</small></div>`).join('')}</div>
      <div class="bar"><i style="width:${pct}%"></i></div><div class="lvtxt">${price ? (bal >= price ? `<b>You can buy Phase ${L + 2} now</b> for 🪙 ${fmt(price)}. Comment <b>buy phase</b> on our latest post.` : `<b>🪙 ${fmt(price - bal)} more</b> to buy Phase ${L + 2} (costs 🪙 ${fmt(price)}). Comment <b>buy phase</b> on our latest post when you have them.`) : 'You own the last phase. The top of the map.'}</div>`;
  }
  function goalText(o, st) {
    const ctx = office;
    if (o.role === 0) return `You lead the USA until Sunday 7pm ET${usa[1] ? ` — ${Math.max(1, o.n - usa[1].n)} coin${o.n - usa[1].n > 1 ? 's' : ''} ahead of @${esc(usa[1].h)}` : ''}.`;
    const tgt = o.role === 1 ? H.president : o.role === 2 ? H.vp : o.role === 3 ? H.senators.at(-1) : o.role === 4 ? H.governors.get(o.st) : o.role === 5 ? H.reps.get(o.st)?.at(-1) : o.role === 6 ? H.mayors.get(o.key) : H.councils.get(o.key)?.at(-1);
    const nm = o.role === 1 ? 'President of the USA' : o.role === 2 ? 'Vice President' : o.role === 3 ? 'Senator' : o.role === 4 ? 'Governor of ' + stateByCode.get(o.st).name : o.role === 5 ? 'Representative' : o.role === 6 ? 'Mayor of ' + o.city : 'Councilmember of ' + o.city;
    return tgt ? `<b>${Math.max(1, tgt.n - o.n + 1)} more coin${tgt.n - o.n + 1 > 1 ? 's' : ''}</b> to become <b>${nm}</b>. Today it’s @${esc(tgt.h)} with ${fmt(tgt.n)}.` : `Keep climbing: more neighbors open more seats.`;
  }
  function earnList(o) {
    const b = o.br, row = (pts, title, desc, done, act) => `<div class="earn"><b class="pp">+${pts} 🪙</b><div><h5>${title}</h5><p>${desc}</p><small>${done}</small></div>${act ?? ''}</div>`;
    return `<h4 class="sec">How to earn more coins</h4>
      ${row(POINTS.comment, 'Comment on a post', 'One comment per post is worth +5. Every new post counts.', `done: ${b[1] / 5} post${b[1] / 5 === 1 ? '' : 's'} (+${b[1]})`, `<a class="mini" href="${post}" target="_blank" rel="noopener">open post</a>`)}
      ${row(POINTS.extra, 'Extra comment on the same post', 'Commented again? +1 each, up to 10 per post.', `done: ${b[2]} (+${b[2]})`)}
      ${row(POINTS.tag, 'Tag a friend (@name)', 'Tag a friend in a comment: +3 each, up to 10 per post.', `done: ${b[3] / 3} (+${b[3]})`, `<button class="mini" data-act="copy" data-t="Hey! Comment your city on @${SITE.igHandle ?? ''}'s post and get your own house on the US map 🏠 ${igLink}">copy invite</button>`)}
      ${row(POINTS.vote, 'Votes for you', 'When someone comments “vote @you” you get +5 (1 per person per post).', `done: ${b[6] / 5} (+${b[6]})`, `<button class="mini" data-act="copy" data-t="I vote @${o.h}">copy vote</button>`)}
      ${row(POINTS.recruit, 'Recruit a friend', 'Tag a friend who then comments their city and gets a house: +25 for the first to tag them.', `done: ${b[4] / 25} (+${b[4]})`)}
      ${row(POINTS.story, 'Story: post your house', `Share your house on Instagram stories tagging @${esc(SITE.igHandle ?? '')}: +30 and your house burns for 24 h. We add it when we see the tag.`, `done: ${o.stories} (+${o.stories * 30})`, `<button class="mini" data-act="story">make image</button>`)}
      ${row(POINTS.biz, 'Tag a brand', 'Tag a brand or company (Nike, Burger King, iFood…) in a comment: +10 per different brand. Tagging the same brand twice counts once.', `done: ${o.br[7] / 10} (+${o.br[7]})`)}
      ${row(POINTS.house, 'Have a house', 'Commenting your city creates your house. Once.', 'done ✓')}`;
  }
  const sponsorOf = o => towns.flatMap(t => t.biz).filter(b => b.holder === o);
  function card(o) {
    const st = stateByCode.get(o.st), role = roleOf(o), fnd = A.cityFounder.get(o.key), ns = nextSteps(o, office), pos = (k, t, sc) => `<button class="pos" data-act="scope" data-s="${sc}"><span>${t}</span><b>#${fmt(ns[k].rank)}</b><small>of ${fmt(ns[k].of)}</small><em>${ns[k].text}</em></button>`;
    const rtitle = o.role <= 7 ? (o.role === 7 ? `Resident of ${esc(o.city)}` : `${role.title} of ${esc(o.role <= 2 ? 'the USA' : o.role <= 4 ? st.name : o.city)}`) : '';
    const bsum = o.br.reduce((a, b) => a + b, 0) || 1;
    const wd = o.metro ? null : A.townByKey.get(o.key)?.wonder;
    return `<div class="res"><div class="rhead"><h3>@${esc(o.h)}</h3><button class="x" data-act="close" aria-label="Close">×</button></div><div class="where"><b>${esc(o.city)}</b> · ${o.st}</div>
      ${o.prov ? `<div class="prov">Provisional house: you only named the state, so it landed in ${esc(o.city)}. Comment your city on the latest post and it moves.</div>` : ''}
      ${o.hot ? `<div class="hotbox">🔥 <b>@${esc(o.h)} is on fire</b> until ${new Date(o.hotUntil).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}. Post again before then to keep it burning.</div>` : ''}
      <button class="story" data-act="story"><span>📸</span><div><b>Post your house on your story · +30 coins</b><small>Tag @${esc(SITE.igHandle ?? '')} and your house is <b>on fire for 24 h</b></small></div></button>
      <div class="rolebox" style="border-color:${role.color};background:${role.color}18"><span class="ricon" style="background:${role.color}">${role.icon}</span><div><b>${rtitle}</b><small>${o.role < 7 ? 'office held by coins · until Sunday 7pm ET' : 'no office yet — coins decide'}</small></div></div>
      ${(() => { const sp = sponsorOf(o), sb = SPECIAL_BADGES[o.h] ?? []; return o.founder || sp.length || sb.length ? `<div class="badges">${sb.map(t => `<span class="badge f" style="background:#7c3aed;color:#fff">${esc(t)}</span>`).join('')}${o.founder ? `<span class="badge f">★ Founder of ${esc(o.city)}</span>` : ''}${sp.map(b => `<span class="badge f" style="background:${esc(b.color ?? '#ffd21f')};color:#fff">${esc(b.title || 'Brand ambassador')} · ${esc(b.name)}</span>`).join('')}</div>` : ''; })()}
      ${o.look && (o.look.skin || o.look.items?.length) ? `<div class="badges">${[o.look.skin, ...(o.look.items || [])].filter(Boolean).map(k => `<span class="badge">${esc(LOOK_NAMES[k] ?? k)}</span>`).join('')}<span class="badge">lot ${o.look.lot_level}</span></div>` : ''}
      <div class="kv2"><div><b>🪙 ${fmt(o.bal)}</b><span>your balance</span><small>spend it on phases and elections</small></div><div><b>🪙 ${fmt(o.w)}</b><span>earned this week</span><small>ranks you in your city</small></div></div><button class="btn gold full shopgo" style="margin:10px 0 2px">🛍 Shop · house styles &amp; decorations</button>${(LED.holders?.[o.h]) ? `<div class="goal gold">💼 Your office pays <b>🪙 ${SALARY[LED.holders[o.h].office]} per hour</b> while you hold it.</div>` : ""}
      <h4 class="sec">Where the coins came from</h4><div class="stack">${o.br.map((v, i) => v ? `<i style="width:${v / bsum * 100}%;background:${BR_LABEL[i][2]}"></i>` : '').join('')}</div>
      <div class="legend">${BR_LABEL.map((l, i) => `<span class="${o.br[i] ? '' : 'z'}"><i style="background:${l[2]}"></i>${l[1]} <b>+${o.br[i]}</b></span>`).join('')}</div>
      <h4 class="sec">House phase <small>${o.level + 1} of ${LEVELS.length}</small></h4>${levelStrip(o)}
      <h4 class="sec">Your position <small>weekly coins</small></h4><div class="poss">${pos('city', 'CITY', 'city')}${pos('state', 'STATE', 'state')}${pos('usa', 'USA', 'usa')}</div>
      <div class="goal">${goalText(o, st)}</div>
      ${wd && !wd.unlocked ? `<div class="goal gold">🏗 ${esc(o.city)} is building the <b>${esc(wd.name)}</b>: ${cityCount(o.key)} of ${wd.target} neighbors (${Math.round(wd.progress * 100)}%).</div>` : ''}
      ${o.metro ? `<div class="goal">🏙 ${esc(o.city)} is a neighborhood of the <b>${esc(o.metro)}</b> area on the map: no free land left around it.</div>` : ''}
      ${(() => { const nl = o.metro ? null : LANDMARKS.find(l => cityCount(o.key) < l.n); return nl ? `<div class="goal gold">${esc(o.city)} unlocks a <b>${nl.name}</b> at ${nl.n} houses — <b>${nl.n - cityCount(o.key)} more</b>.</div>` : ''; })()}
      ${earnList(o)}
      <div class="row"><button class="btn" data-act="share">Share my house</button><button class="btn alt" data-act="again">Look up another</button></div>
      ${!o.founder ? `<div class="fine">Founder of ${esc(o.city)} is @${esc(fnd.h)}.</div>` : ''}</div>`;
  }
  let curCardHouse = null;
  function showHouse(o, fly = true) {
    curCardHouse = o; openTab('find'); $('out').innerHTML = card(o); $('out').scrollIntoView?.({ block: 'start' });
    history.replaceState(null, '', `?u=${encodeURIComponent(o.h)}${new URLSearchParams(location.search).get('data') ? '&data=' + new URLSearchParams(location.search).get('data') : ''}`);
    A.showRing(o); rankScope = 'city'; rankCity = o.key; rankState = o.st; renderRank(); if (fly) A.flyHouse(o);
  }
  $('out').onclick = async e => { const b = e.target.closest('[data-act]'); if (!b) return; const act = b.dataset.act;
    if (act === 'copy') return copy(b.dataset.t, b.dataset.m ?? 'Copied'); if (act === 'open') return find('@' + b.dataset.h); if (act === 'fly') { const t = A.townByKey.get(b.dataset.k); if (t) { sheet.classList.add('min'); A.flyTown(t); } return; }
    if (act === 'run') return openRun();
    if (act === 'vote') return openVote();
    if (act === 'fly-state') { const s2 = stateByCode.get(b.dataset.s); if (s2) { sheet.classList.add('min'); A.flyTo(s2.x, s2.z, Math.min(Math.max(s2.r * 3.4, 18), 120), 52, 0, 2200); } return; }
    if (act === 'state') { const s2 = stateByCode.get(b.dataset.s); if (s2) showState(s2); return; } if (act === 'town') { const t = A.townByKey.get(b.dataset.k); if (t) showTown(t); return; } if (act === 'biz') { const [k, ig] = b.dataset.k.split('|').length > 2 ? [b.dataset.k.split('|').slice(0, 2).join('|'), b.dataset.k.split('|')[2]] : [b.dataset.k, '']; const t = A.townByKey.get(k), bz = t?.biz.find(x => x.ig === ig); if (bz) showBiz(bz, t); return; }
    if (act === 'close') { $('out').innerHTML = ''; A.clearSel(); curCardHouse = null; history.replaceState(null, '', location.pathname); return; }
    if (act === 'share-link') { try { if (navigator.share) await navigator.share({ title: SITE.name, text: b.dataset.t, url: b.dataset.u }); else copy(b.dataset.u, 'Link copied'); } catch { /* cancelado */ } return; }
    if (!curCardHouse) return; const o = curCardHouse;
    if (act === 'again') { $('out').innerHTML = ''; $('handle').value = ''; $('handle').focus(); }
    else if (act === 'share') { const url = `${location.origin}${location.pathname}?u=${encodeURIComponent(o.h)}`; try { if (navigator.share) await navigator.share({ title: SITE.name, text: `Here’s my house on the map: @${o.h}`, url }); else copy(url, 'Link copied'); } catch { /* cancelado */ } }
    else if (act === 'scope') { rankScope = b.dataset.s; rankCity = o.key; rankState = o.st; renderRank(); openTab('rank'); } else if (act === 'story') makeStory(o); };

  // ---------- cartões de cidade, estado e negócio (clicar no mapa) ----------
  const real = towns.filter(t => !t.open), townsByN = [...real].sort((a, b) => b.n - a.n), stateTowns = new Map();
  for (const t of real) (stateTowns.get(t.st) ?? stateTowns.set(t.st, []).get(t.st)).push(t);
  for (const l of stateTowns.values()) l.sort((a, b) => b.n - a.n);
  const person = (o, tag) => `<div class="mrow" data-act="open" data-h="${esc(o.h)}"><div><b>${tag ? tag + ' ' : ''}@${esc(o.h)}</b><small>${esc(o.city)}, ${o.st} · level ${o.level + 1}${o.hot ? ' · 🔥 on fire' : ''}</small></div><span class="pts">🪙 ${fmt(o.w)}<small>this week</small></span></div>`;
  const out = html => { curCardHouse = null; A.clearSel(); openTab('find'); $('out').innerHTML = html; $('out').scrollIntoView?.({ block: 'start' }); };
  function nextConquest(t) {
    const n = t.n, w = t.wonder, nl = LANDMARKS.find(l => n < l.n), ic = { Park: '🌳', School: '🏫', Hospital: '🏥', Stadium: '🏟' };
    if (nl) return { txt: `${ic[nl.name]} ${nl.name}`, left: nl.n - n, of: nl.n, pct: Math.round(n / nl.n * 100) };
    if (w && !w.unlocked) return { txt: `🏗 ${esc(w.name)}`, left: w.target - n, of: w.target, pct: Math.round(w.progress * 100) };
    return null;
  }
  function showTown(t, fly = true) {
    if (t.open) { out(`<div class="res"><div class="rhead"><h3>${esc(t.name)}</h3><button class="x" data-act="close" aria-label="Close">×</button></div><div class="where">${esc(stateByCode.get(t.st)?.name ?? t.st)} · <b>no houses yet</b></div><div class="goal gold">🚩 <b>Founder seat open.</b> Whoever comments “${esc(t.name)}, ${t.st}” first becomes Founder of this city forever.${t.wonder ? ` A <b>${esc(t.wonder.name)}</b> is waiting to be built here.` : ''}</div><div class="row"><a class="btn" style="text-align:center;text-decoration:none;display:block;padding:11px" href="${post}" target="_blank" rel="noopener">Comment on the post</a><button class="btn alt" data-act="copy" data-t="${esc(t.name)}, ${t.st}" data-m="City copied: paste it as your comment">copy city name</button></div></div>`); if (fly) { sheet.classList.add('min'); A.flyTown(t); } return; }
    const lst = office.byCity.get(t.key) ?? [], mayor = H.mayors.get(t.key), fnd = A.cityFounder.get(t.key), nc = nextConquest(t), rk = townsByN.indexOf(t) + 1, rks = (stateTowns.get(t.st) ?? []).indexOf(t) + 1, tall = lst.filter(o => o.level >= 4).length;
    const council = (H.councils.get(t.key) ?? []).length, pts = lst.reduce((a, o) => a + o.w, 0);
    out(`<div class="res"><div class="rhead"><h3>🚩 ${esc(t.name)}${t.cap ? ' ★' : ''}</h3><button class="x" data-act="close" aria-label="Close">×</button></div><div class="where"><button class="mini" data-act="state" data-s="${t.st}" style="margin:0 6px 0 0">${t.st}</button>${esc(stateByCode.get(t.st)?.name ?? '')}</div>
      <div class="cardgrid"><div><b>${fmt(t.n)}</b><span>HOUSES</span></div><div><b>${tall}</b><span>BUILDINGS</span></div><div><b>#${rk}</b><span>IN THE USA</span></div><div><b>#${rks}</b><span>IN ${t.st}</span></div></div>
      ${nc ? `<h4 class="sec">Next conquest</h4><div class="goal gold"><b>${nc.txt}</b>: <b>${fmt(nc.left)} more house${nc.left > 1 ? 's' : ''}</b> (${t.n} of ${nc.of}).<div class="bar" style="margin-top:6px"><i style="width:${nc.pct}%"></i></div></div>` : '<div class="goal">All landmarks of this city are built. 🎉</div>'}
      ${t.wonder && nc && !nc.txt.includes(t.wonder.name) ? `<div class="fine">Then the <b>${esc(t.wonder.name)}</b> at ${t.wonder.target} houses (${Math.round(t.wonder.progress * 100)}%).</div>` : t.wonder?.unlocked ? `<div class="fine">🗽 ${esc(t.wonder.name)} is built.</div>` : ''}
      <h4 class="sec">Who runs it</h4>${fnd ? person(fnd, '🚩 Founder') : ''}${mayor ? person(mayor, '🏛 Mayor') : `<div class="fine">Mayor seat opens at ${OPEN.mayor} houses (${Math.max(1, OPEN.mayor - t.n)} to go).</div>`}${council ? `<div class="fine">${council} councilmember${council > 1 ? 's' : ''} · ${fmt(pts)} coins this week</div>` : ''}
      <h4 class="sec">Top residents</h4>${lst.slice(0, 6).map(o => person(o)).join('') || '<p class="hint">Nobody yet.</p>'}
      ${t.biz.length ? `<h4 class="sec">Local businesses <span class="sponsored">SPONSORED</span></h4>${t.biz.map(b => `<div class="mrow" data-act="biz" data-k="${esc(t.key)}|${esc(b.ig)}"><div><b>${esc(b.name)}</b><small>@${esc(b.ig)} · ${esc(b.type)}</small></div><span>›</span></div>`).join('')}` : ''}
      <div class="row"><button class="btn" data-act="fly" data-k="${esc(t.key)}">See on the map</button><button class="btn alt" data-act="share-link" data-u="${location.origin}${location.pathname}?c=${encodeURIComponent(t.key)}" data-t="${esc(t.name)}, ${t.st} on ${esc(SITE.name)}">Share</button></div></div>`);
    if (fly) { sheet.classList.add('min'); A.flyTown(t); }
  }
  function showState(s2, fly = true) {
    const lst = office.byState.get(s2.st) ?? [], gov = H.governors.get(s2.st), vice = gov ? lst.find(o => o !== gov && o.role > 3 && better(gov, o) > 0) : null, reps = H.reps.get(s2.st) ?? [], seats = SEATS.reps(s2.st, lst.length), cities = (stateTowns.get(s2.st) ?? []).slice(0, 5);
    out(`<div class="res"><div class="rhead"><h3>🗺 ${esc(s2.name)}</h3><button class="x" data-act="close" aria-label="Close">×</button></div><div class="where"><span class="rtag" style="background:#e0483e">${s2.st}</span> ${fmt(lst.length)} houses in ${(stateTowns.get(s2.st) ?? []).length} cities</div>
      <h4 class="sec">Governor</h4>${gov ? person(gov, '♛') : `<div class="goal gold">The Governor seat opens at <b>${OPEN.governor} houses</b> in the state: ${Math.max(1, OPEN.governor - lst.length)} to go.</div>`}
      ${vice ? `<div class="fine">Runner-up @${esc(vice.h)} · <b>${Math.max(1, gov.w - vice.w + 1)} coins</b> to take the seat (${fmt(vice.w)} vs ${fmt(gov.w)})</div>` : ''}
      <h4 class="sec">Representatives <small>${reps.length} of ${seats} open</small></h4>${reps.slice(0, 3).map(o => person(o, '◆')).join('') || `<div class="fine">More residents open House seats (the real state has ${GAME_HOUSE_SEATS[s2.st] ?? 1}).</div>`}${reps.length > 3 ? `<div class="fine">+ ${reps.length - 3} more in the state ranking</div>` : ''}
      <h4 class="sec">Biggest cities</h4>${cities.map((t, i) => `<div class="mrow" data-act="town" data-k="${esc(t.key)}"><div><b>${i + 1} · ${esc(t.name)}</b><small>🚩 @${esc(A.cityFounder.get(t.key)?.h ?? '')}</small></div><span class="pts">${t.n}<small>houses</small></span></div>`).join('') || '<p class="hint">No cities yet. Be the first Founder here.</p>'}
      <div class="row"><button class="btn" data-act="fly-state" data-s="${s2.st}">See on the map</button><button class="btn alt" data-act="share-link" data-u="${location.origin}${location.pathname}?s=${s2.st}" data-t="${esc(s2.name)} on ${esc(SITE.name)}">Share</button></div></div>`);
    if (fly) { sheet.classList.add('min'); A.flyTo(s2.x, s2.z, Math.min(Math.max(s2.r * 3.4, 18), 120), 52, 0, 2200); }
  }
  function showBiz(b, t) {
    const hold = b.holder, ends = b.end ? Math.max(0, Math.ceil((Date.parse(b.end) - Date.now()) / 864e5)) : null;
    out(`<div class="res"><div class="rhead"><h3>${esc(b.name)}</h3><button class="x" data-act="close" aria-label="Close">×</button></div><div class="where"><span class="sponsored">SPONSORED</span> ${esc(b.type)} · ${esc(t.name)}, ${t.st}${ends != null ? ` · ${ends} day${ends === 1 ? '' : 's'} left` : ''}</div>
      <div class="shop" style="--c:${esc(b.color ?? '#e0483e')};margin-top:10px"><div class="awn"></div><div class="bd"><b>${esc(b.name)}</b><small>@${esc(b.ig)}</small></div></div>
      <h4 class="sec">${esc(b.title || 'Brand ambassador')}</h4>${hold ? person(hold, '🏅') : '<div class="goal gold">Nobody holds this title yet. Tag the business in one of our comments and have the most coins in the city.</div>'}<div class="fine">${b.fans ?? 0} neighbor${b.fans === 1 ? '' : 's'} tagged it. Tagging a sponsored business in our comments is worth <b>+30 coins</b> (once per business).</div>
      <div class="row"><a class="btn" style="text-align:center;text-decoration:none;display:block;padding:11px" href="https://www.instagram.com/${esc(b.ig)}/" target="_blank" rel="noopener">Follow @${esc(b.ig)}</a><button class="btn alt" data-act="copy" data-t="@${esc(b.ig)}" data-m="Handle copied: tag it in a comment">copy @</button></div></div>`);
  }
  function showVenue(r) {
    const t = r.t, es = electionState(), open = es.phase === 'open', cds = ELEC.candidates ?? [];
    const V = r.type === 'palace' ? { name: 'The White House', icon: '🏛', offs: ['president', 'vice'], area: () => 'USA', hold: () => [['President', H.president], ['Vice President', H.vp]] }
      : r.type === 'capitol' && t.palace ? { name: 'The U.S. Capitol', icon: '🏛', offs: ['senator', 'representative'], area: o => o === 'senator' ? 'USA' : null, hold: () => [['Senators', null]] }
      : r.type === 'capitol' ? { name: `${stateByCode.get(t.st)?.name ?? t.st} State Capitol`, icon: '🏛', offs: ['governor', 'representative'], area: () => t.st, hold: () => [['Governor', H.governors.get(t.st)]] }
      : { name: `${t.name} City Hall`, icon: '🗳', offs: ['mayor', 'council'], area: () => t.key, hold: () => [['Mayor', H.mayors.get(t.key)]] };
    const cands = off => cds.filter(c => c.office === off && (r.type === 'capitol' && t.palace && off === 'representative' ? true : c.area === V.area(off))).sort((a, b) => b.votes - a.votes);
    const who = { palace: 'the whole country', hall: `${t.name} residents`, capitol: t.palace ? 'the whole country (senators) and each state (representatives)' : `${stateByCode.get(t.st)?.name ?? t.st} residents` }[r.type];
    out(`<div class="res"><div class="rhead"><h3>${V.icon} ${esc(V.name)}</h3><button class="x" data-act="close" aria-label="Close">×</button></div><div class="where"><b>Voting place</b> · ${pollOpen() ? '<b style="color:#e0483e">POLLS OPEN</b>' : 'polls closed'}</div>
      <div class="goal gold">🗳️ Who votes here: <b>${who}</b>. Vote on the site: one vote per office, never for yourself. Everyone who votes gets <b>🪙 ${VOTE_REWARD}</b> per vote.</div>
      ${V.hold().map(([n, o]) => o ? `<h4 class="sec">${n} now</h4>${person(o)}` : '').join('')}
      ${V.offs.map(off => { const l = cands(off); return `<h4 class="sec">${OFFICE_NAME[off]} candidates <small>fee 🪙 ${FEE[off]} · pays 🪙 ${SALARY[off]}/h</small></h4>${l.slice(0, 8).map(c => `<div class="mrow" data-act="open" data-h="${esc(c.h)}"><div><b>@${esc(c.h)}</b><small>${esc(c.area === 'USA' ? 'USA' : c.area.replace('|', ', '))}</small></div><span class="pts">${c.votes} votes</span></div>`).join('') || '<p class="hint">No candidates yet.</p>'}`; }).join('')}
      <div class="row">${pollOpen() ? '<button class="btn" data-act="vote">Vote now</button>' : ''}<button class="btn alt" data-act="fly" data-k="${esc(t.key)}">See on the map</button></div></div>`);
  }
  A.onPick = r => {
    if (r.type === 'hall' || r.type === 'capitol' || r.type === 'palace') { showVenue(r); return; }
    if (r.type === 'house') { showHouse(r.o, false); A.showRing(r.o); return; } if (r.type === 'biz') { showBiz(r.b, r.t); return; }
    if (r.type === 'state') { showState(r.s, false); return; } showTown(r.t, false);
  };

  // ---------- imagem de story ----------
  async function makeStory(o) {
    toast('Making your story image…'); A.showRing(o); A.flyHouse(o); await new Promise(r => setTimeout(r, 3600));
    const data = A.captureFrame(), img = new Image(); img.src = data; await img.decode(); const W = 1080, Hh = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#7fc1ee'); gr.addColorStop(0.5, '#b9e0f6'); gr.addColorStop(1, '#e6f5fb'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
    const v = new A.THREE.Vector3(o.x, o.y + 0.05, o.z).project(A.camera), sx = (v.x * 0.5 + 0.5) * img.width, sy = (-v.y * 0.5 + 0.5) * img.height, S = Math.min(img.width, img.height) * 0.62;
    const sxc = Math.max(0, Math.min(img.width - S, sx - S / 2)), syc = Math.max(0, Math.min(img.height - S, sy - S / 2)), bx = 90, by = 520, bs = 900;
    g.save(); g.beginPath(); g.roundRect(bx, by, bs, bs, 56); g.clip(); g.drawImage(img, sxc, syc, S, S, bx, by, bs, bs); g.restore(); g.lineWidth = 12; g.strokeStyle = '#1e2430'; g.beginPath(); g.roundRect(bx, by, bs, bs, 56); g.stroke();
    const T = (t, x, y, size, col = '#fff', align = 'center') => { g.font = `900 ${size}px "Arial Black", Impact, sans-serif`; { const w = g.measureText(t).width; if (w > 940) { size = size * 940 / w; g.font = `900 ${size}px "Arial Black", Impact, sans-serif`; } } g.textAlign = align; g.lineJoin = 'round'; g.lineWidth = size * 0.2; g.strokeStyle = '#1e2430'; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y); };
    T(SITE.name.toUpperCase(), W / 2, 180, 96); T('MY HOUSE', W / 2, 340, 150, '#ffd21f'); T(`${o.city}, ${o.st}`.toUpperCase(), W / 2, 450, 64);
    const role = roleOf(o); T(o.role < 7 ? `${role.title.toUpperCase()}` : LEVELS[o.level].name.toUpperCase(), W / 2, 1560, 110, o.role < 7 ? '#fff' : '#ffd21f'); T(`🪙 ${fmt(o.n)} COINS · LEVEL ${o.level + 1}`, W / 2, 1650, 56);
    g.fillStyle = '#fff'; g.strokeStyle = '#1e2430'; g.lineWidth = 10; g.beginPath(); g.roundRect(140, 1720, 800, 120, 60); g.fill(); g.stroke(); g.fillStyle = '#1e2430'; g.font = '900 52px "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText(`@${o.h}`.slice(0, 26), W / 2, 1796);
    cv.toBlob(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `my-house-${o.h}.png`; a.click(); toast('Image saved — post it and tag @' + (SITE.igHandle ?? '')); }, 'image/png');
  }

  // ---------- ranking ----------
  let rankScope = 'usa', rankState = 'TX', rankCity = null, rankShow = 100;
  const cityKeys = () => [...office.byCity.keys()].sort((a, b) => office.byCity.get(b).length - office.byCity.get(a).length);
  function renderRank() {
    if (!rankCity) rankCity = cityKeys()[0] ?? null; const list = rankScope === 'usa' ? usa : rankScope === 'state' ? (office.byState.get(rankState) ?? []) : (office.byCity.get(rankCity) ?? []);
    const title = rankScope === 'usa' ? 'United States' : rankScope === 'state' ? stateByCode.get(rankState)?.name : rankCity ? rankCity.replace('|', ', ') : 'City';
    const selHtml = rankScope === 'state' ? `<select id="rk-st">${states.map(s => `<option value="${s.st}"${s.st === rankState ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : rankScope === 'city' ? `<select id="rk-city">${cityKeys().slice(0, 400).map(k => `<option value="${esc(k)}"${k === rankCity ? ' selected' : ''}>${esc(k.replace('|', ', '))} (${office.byCity.get(k).length})</option>`).join('')}</select>` : '';
    const rows = list.slice(0, rankShow).map((o, i) => `<li data-act="open" data-h="${esc(o.h)}"><span class="pos2 p${i + 1}">${i + 1}</span><div class="who"><b>@${esc(o.h)}</b><span>${rankScope === 'city' ? LEVELS[o.level].name : `${esc(o.city)}, ${o.st}`}</span></div>${roleTag(o)}<span class="pts">🪙 ${fmt(o.n)}</span></li>`).join('');
    $('p-rank').innerHTML = `<div class="seg">${['city', 'state', 'usa'].map(s => `<button data-s="${s}" aria-pressed="${rankScope === s}">${s === 'usa' ? 'USA' : s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div>${selHtml}
      <h4 class="rk-t">${esc(title)}<small>${fmt(list.length)} houses · ${fmt(list.reduce((a, o) => a + o.n, 0))} coins this week</small></h4>
      ${list.length ? `<ol class="rk">${rows}</ol>${list.length > rankShow ? `<button class="btn alt full" data-act="more">show 100 more (${fmt(list.length - rankShow)} left)</button>` : ''}` : '<p class="hint">Nobody here yet. Comment your city on our latest post and take the first seat.</p>'}
      <form id="rk-f" class="rk-find"><input id="rk-q" placeholder="your @ to see your position" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="80"><button class="btn">See</button></form>`;
    $('p-rank').querySelectorAll('.seg button').forEach(b => b.onclick = () => { rankScope = b.dataset.s; rankShow = 100; renderRank(); });
    $('rk-st')?.addEventListener('change', e => { rankState = e.target.value; rankShow = 100; renderRank(); }); $('rk-city')?.addEventListener('change', e => { rankCity = e.target.value; rankShow = 100; renderRank(); });
    $('rk-f').onsubmit = e => { e.preventDefault(); find($('rk-q').value); };
  }
  $('p-rank').onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; if (b.dataset.act === 'more') { rankShow += 100; renderRank(); } else if (b.dataset.act === 'open') find('@' + b.dataset.h); };

  // ---------- Capitol (mandato) ----------
  const miniRow = (o, extra = '') => `<li data-act="open" data-h="${esc(o.h)}"><div class="who"><b>@${esc(o.h)}</b><span>${esc(o.city)}, ${o.st}</span></div>${extra}<span class="pts">🪙 ${fmt(o.n)}</span></li>`;
  // ---------- eleição ----------
  let ELEC = { id: null, candidates: [] };
  const OFFICE_NAME = { president: 'President', vice: 'Vice President', senator: 'Senator', governor: 'Governor', representative: 'Representative', mayor: 'Mayor', council: 'Councilmember' };
  const VENUE = { president: 'White House', vice: 'White House', senator: 'U.S. Capitol', representative: 'U.S. Capitol', governor: 'State capitol', mayor: 'City hall', council: 'City hall' };
  const fmtET = d => new Date(d).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' ET';
  fetch('api/election').then(r => r.ok ? r.json() : null).then(j => { if (j) { ELEC = j; if (!$('p-capitol').hidden) renderCapitol(); } }).catch(() => {});
  const pollOpen = () => !!(ELEC.id && !ELEC.closed && Date.now() >= Date.parse(ELEC.opens) && Date.now() <= Date.parse(ELEC.closes));
  const devId = () => { try { let d = localStorage.getItem('ftm_dev'); if (!d) { d = crypto.randomUUID().split('-').join('') + 'xx'; localStorage.setItem('ftm_dev', d); } return d; } catch { return 'nostore' + Math.random().toString(36).slice(2, 14) + 'abcdefgh'; } };
  function electionCard() {
    const open = pollOpen(), cds = ELEC.candidates ?? [], closes = ELEC.closes ? fmtET(new Date(ELEC.closes)) : '';
    const group = off => cds.filter(c => c.office === off).sort((a, b) => b.votes - a.votes).slice(0, 3).map(c => `<div class="mrow" data-act="open" data-h="${esc(c.h)}"><div><b>@${esc(c.h)}</b><small>${esc(c.area === 'USA' ? 'USA' : c.area.replace('|', ', '))}</small></div><span class="pts">${c.votes} votes</span></div>`).join('');
    return `<div class="dcard"><div class="dsub">🗳️ Election</div><div class="dtitle">${open ? 'The polls are OPEN' : ELEC.closed ? 'The polls are closed' : 'Polls are not open yet'}</div>
      <p class="fine" style="margin-top:0">${open ? `Vote right here on the site until <b>${closes}</b>.` : ''} You can vote for <b>one candidate per office</b>, never for yourself, and only for confirmed candidates. Presidents, vice presidents and senators are voted by the whole country, governors and representatives by the state, mayors and councils by the city. <b>🪙 ${VOTE_REWARD} for every vote.</b></p>
      ${open ? '<button class="btn full" data-act="vote">Vote now</button>' : ''}
      ${Object.keys(OFFICE_NAME).map(off => { const g = group(off); return g ? `<h4 class="sec">${OFFICE_NAME[off]} <small>vote at the ${VENUE[off]}</small></h4>${g}` : ''; }).join('') || '<p class="hint">No candidates yet.</p>'}
      <button class="btn full alt" data-act="run" style="margin-top:10px">Run for office</button><p class="fine">${open ? 'You can still join this election: comment your code and you appear on the ballot once confirmed. ' : ''}Running costs a fee: ${Object.entries(FEE).map(([k, v]) => `${OFFICE_NAME[k]} 🪙 ${v}`).join(' · ')}. Offices pay coins every hour.</p></div>`;
  }
  async function openVote() {
    const m = $('modal'); m.hidden = false; let me = null, mine = [];
    const shell = html => { m.innerHTML = `<div class="mbox"><button class="x" id="mx" aria-label="Close">×</button><h3>🗳️ Vote</h3>${html}</div>`; $('mx').onclick = () => { m.hidden = true; m.innerHTML = ''; }; };
    const scopeOk = c => { const sc = OFFICE_SCOPE[c.office]; return sc === 'usa' || (sc === 'state' && me.st === c.area) || (sc === 'city' && `${me.city}|${me.st}` === c.area); };
    const ballot = async () => {
      try { const j = await (await fetch('api/election?voter=' + encodeURIComponent(me.h))).json(); ELEC = { ...j, mine: undefined }; mine = j.mine ?? []; } catch { /* usa o que já temos */ }
      if (!pollOpen()) return shell('<p class="hint">The polls are closed right now.</p>');
      const sections = Object.keys(OFFICE_NAME).map(off => { const l = (ELEC.candidates ?? []).filter(c => c.office === off && scopeOk(c)).sort((a, b) => b.votes - a.votes); if (!l.length) return ''; const done = mine.includes(off);
        return `<h4 class="sec">${OFFICE_NAME[off]}${done ? ' <small style="color:#3c9d4e">✓ you voted</small>' : ''}</h4>${l.map(c => `<div class="mrow"><div><b>@${esc(c.h)}</b><small>${esc(c.area === 'USA' ? 'USA' : c.area.replace('|', ', '))} · ${c.votes} votes</small></div>${done || c.h === me.h ? '' : `<button class="btn mini" data-off="${off}" data-c="${esc(c.h)}">Vote</button>`}</div>`).join('')}`; }).join('');
      shell(`<p class="hint" style="margin-top:0">Voting as <b>@${esc(me.h)}</b> · ${esc(me.city)}, ${esc(me.st)}. One vote per office, final. You get 🪙 ${VOTE_REWARD} per vote when the polls close.</p>${sections || '<p class="hint">No candidates available for your area yet.</p>'}`);
      m.onclick = async e => { const b = e.target.closest('button[data-off]'); if (!b) return; b.disabled = true;
        try { const r = await fetch('api/vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ voter: me.h, office: b.dataset.off, cand: b.dataset.c, dev: devId() }) }), j = await r.json(); toast(j.ok ? `Vote registered for @${b.dataset.c} ✓` : (j.error ?? 'Could not vote')); await ballot(); } catch { toast('Connection problem, try again'); b.disabled = false; } };
    };
    let saved = ''; try { saved = localStorage.getItem('ftm_me') ?? ''; } catch { /* sem armazenamento */ }
    shell(`<p class="hint" style="margin-top:0">Enter your @ to vote. Only people with a house can vote, and only once per office.</p><label>Your Instagram @<input id="v-h" maxlength="30" placeholder="@yourname" autocapitalize="none" value="${esc(saved)}"></label><p class="fine" id="v-info"></p><button class="btn full" id="v-go">Continue</button>`);
    $('v-go').onclick = () => { const h = $('v-h').value.trim().replace(/^@/, '').toLowerCase(); me = A.byHandle.get(h); if (!me) { $('v-info').textContent = h ? 'No house found for this @. Comment your city on our post first.' : ''; return; } try { localStorage.setItem('ftm_me', h); } catch { /* ok */ } ballot(); };
    if (saved && A.byHandle.get(saved.toLowerCase())) { me = A.byHandle.get(saved.toLowerCase()); ballot(); }
  }
  async function openRun() {
    const m = $('modal'); m.hidden = false; let me = null;
    const body = html => { m.innerHTML = `<div class="mbox"><button class="x" id="mx" aria-label="Close">×</button><h3>Run for office</h3>${html}</div>`; $('mx').onclick = () => { m.hidden = true; m.innerHTML = ''; }; };
    body(`<p class="hint" style="margin-top:0">Enter your @ and pick the office. You get a code. Comment the code on our election post: Instagram proves it’s you, then the fee is charged and you appear as a candidate.</p><label>Your Instagram @<input id="r-h" maxlength="30" placeholder="@yourname" autocapitalize="none"></label>
      <label>Office<div class="chips" id="r-off">${Object.keys(OFFICE_NAME).map((k, i) => `<button type="button" class="hot-b${i === 0 ? ' on' : ''}" data-o="${k}">${OFFICE_NAME[k]} · 🪙 ${FEE[k]}</button>`).join('')}</div></label><p class="fine" id="r-info"></p><button class="btn full" id="r-go">Get my code</button>`);
    let off = 'president'; $('r-off').onclick = e => { const b = e.target.closest('button'); if (!b) return; off = b.dataset.o; $('r-off').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
    const info = () => { const h = $('r-h').value.trim().replace(/^@/, '').toLowerCase(); me = A.byHandle.get(h); $('r-info').textContent = me ? `@${me.h} · balance 🪙 ${fmt(me.bal)}${me.bal < FEE[off] ? ` · you need 🪙 ${FEE[off] - me.bal} more for this office` : ''}` : (h ? 'No house found for this @' : ''); };
    $('r-h').oninput = info; $('r-off').addEventListener('click', info);
    $('r-go').onclick = async () => { info(); if (!me) return toast('Enter a valid @ that has a house'); $('r-go').disabled = true;
      try { const r = await fetch('api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ h: me.h, office: off }) }), j = await r.json();
        if (!j.ok) { toast(j.error ?? 'Could not register'); $('r-go').disabled = false; return; }
        body(`<p class="hint" style="margin-top:0">Almost there, @${esc(me.h)}! Comment this code on our latest election post:</p><div class="pricebig" style="font-size:44px;letter-spacing:.06em">${esc(j.code)}</div><p class="fine" style="text-align:center">${esc(OFFICE_NAME[j.office])} · ${esc(j.city)} · fee 🪙 ${j.fee} (charged when we confirm)</p><button class="btn full" id="r-copy">Copy code</button><p class="fine">We confirm candidates before the polls open. The fee comes from your balance.</p>`); $('r-copy').onclick = () => copy(j.code, 'Code copied'); }
      catch { toast('Connection problem, try again'); $('r-go').disabled = false; } };
  }
  function renderCapitol() {
    const end = nextMandateEnd(), pres = H.president, sen = H.senators, gov = [...H.governors.values()].sort(better);
    const hall = (A.mandData?.m ?? []).slice().reverse(), goal = SITE.goal;
    $('p-capitol').innerHTML = `${A.weekStale ? '<div class="dcard" style="background:#fff1de"><b>New mandate started.</b> Weekly coins restarted at 0 — standings update with the next refresh. Your house level never shrinks.</div>' : ''}<div class="dcard dark"><div class="dsub">End of the mandate</div><div class="dtitle">Mandate ${mandateNumber(launch)} closes in</div><div class="cd" id="cd">${countdown(end - Date.now())}</div><div class="dsub">Sunday 7pm Eastern. Whoever leads now keeps the office until then. You can flip it until the last minute: every comment, tag and vote is coins.</div></div>
      <div class="dcard"><div class="dsub">President of the USA · live</div>${pres ? `<div class="pres" data-act="open" data-h="${esc(pres.h)}"><span class="ricon" style="background:${ROLES[0].color}">★</span><div><b>@${esc(pres.h)}</b><small>${esc(pres.city)}, ${pres.st}</small></div><strong>${fmt(pres.n)}</strong></div>${usa[1] ? `<p class="fine">${Math.max(1, pres.n - usa[1].n)} coin${pres.n - usa[1].n > 1 ? 's' : ''} ahead of @${esc(usa[1].h)}</p>` : ''}` : '<p class="hint">Nobody yet. The first house is the first President.</p>'}</div>
      ${electionCard()}
      <div class="dcard"><div class="dsub">Vice President of the USA · live</div>${H.vp ? `<div class="pres" data-act="open" data-h="${esc(H.vp.h)}"><span class="ricon" style="background:${ROLES[1].color}">★</span><div><b>@${esc(H.vp.h)}</b><small>${esc(H.vp.city)}, ${H.vp.st}</small></div><strong>${fmt(H.vp.w)}</strong></div>` : '<p class="hint">Second place becomes Vice President.</p>'}</div>
      <div class="dcard"><div class="dsub">Senators · top ${H.seats.senators} after the Vice President</div><ol class="rk compact">${sen.slice(0, 10).map(o => `<li data-act="open" data-h="${esc(o.h)}"><div class="who"><b>@${esc(o.h)}</b><span>${esc(o.city)}, ${o.st}</span></div><span class="pts">🪙 ${fmt(o.n)}</span></li>`).join('') || '<li class="hint">No senators yet</li>'}</ol>${sen.length > 10 ? `<p class="fine">+ ${sen.length - 10} more · see the USA ranking</p>` : ''}<p class="fine">Senate seats grow with the map (4% of all houses, up to 100).</p></div>
      <div class="dcard"><div class="dsub">Governors · ${gov.length} of ${states.length} states</div><ol class="rk compact">${gov.slice(0, 10).map(o => `<li data-act="open" data-h="${esc(o.h)}"><div class="who"><b>@${esc(o.h)}</b><span>${esc(stateByCode.get(o.st).name)} · ${esc(o.city)}</span></div><span class="pts">🪙 ${fmt(o.n)}</span></li>`).join('') || '<li class="hint">No governors yet</li>'}</ol><p class="fine">A state opens its Governor seat at ${OPEN.governor} houses. Representatives follow the real House seats (CA 52, TX 38…), opening as the state grows.</p></div>
      ${goal ? `<div class="dcard"><div class="dsub">Community goal</div><div class="dtitle" style="font-size:16px">${esc(goal.label)}</div><div class="bar"><i style="width:${Math.min(100, Math.round((goal.now ?? 0) / goal.target * 100))}%"></i></div><p class="fine">${fmt(goal.now ?? 0)} of ${fmt(goal.target)}. Hit it and everyone who commented gets the bonus.</p></div>` : ''}
      ${hall.length ? `<div class="dcard"><div class="dsub">Hall of fame · past mandates</div>${hall.map(m => `<div class="mrow" data-act="open" data-h="${esc(m.president?.h ?? '')}"><div><b>Mandate ${m.n} · ★ @${esc(m.president?.h ?? '—')}</b><small>${esc(m.president?.city ?? '')}${m.president ? ', ' + m.president.st : ''} · ${(m.senators ?? []).length} senators · ${Object.keys(m.governors ?? {}).length} governors</small></div><span class="pts">🪙 ${fmt(m.president?.w ?? 0)}</span></div>`).join('')}</div>` : ''}
      <div class="dcard"><div class="dsub">Seats still open</div><div class="d3"><div><b>${states.length - gov.length}</b><span>GOVERNORS</span></div><div><b>${[...office.byCity.values()].filter(l => l.length < OPEN.mayor).length}</b><span>MAYORS NEED ${OPEN.mayor}+</span></div><div><b>${Math.max(0, H.seats.senators - sen.length)}</b><span>SENATORS</span></div></div></div>`;
    $('p-capitol').onclick = e => { if (e.target.closest('[data-act="vote"]')) return openVote(); const r = e.target.closest('[data-act="run"]'); if (r) return openRun(); const b = e.target.closest('[data-act="open"]'); if (b) find('@' + b.dataset.h); };
  }
  A.onFrame = (() => { let last = 0; return now => { if (now - last < 1000) return; last = now; const cd = $('cd'); if (cd && !$('p-capitol').hidden) cd.textContent = countdown(nextMandateEnd() - Date.now()); }; })();

  // ---------- corridas apertadas (e legenda pronta pra postar) ----------
  function races() {
    const L = [];
    for (const [st, g] of H.governors) { const r = office.byState.get(st).find(o => o !== g && o.role > 3); if (r) L.push({ gap: g.w - r.w, a: g, b: r, title: `Governor of ${stateByCode.get(st).name}`, kind: 'person' }); }
    for (const [k, m] of H.mayors) { const r = office.byCity.get(k).find(o => o !== m && o.role > 5); if (r) L.push({ gap: m.w - r.w, a: m, b: r, title: `Mayor of ${m.city}`, kind: 'person' }); }
    if (H.president && usa[1]) L.push({ gap: H.president.w - usa[1].w, a: H.president, b: usa[1], title: 'President of the USA', kind: 'person' });
    const top = [...real].sort((a, b) => b.n - a.n).slice(0, 14), duels = []; for (let i = 0; i + 1 < top.length; i++) duels.push({ gap: top[i].n - top[i + 1].n, a: top[i], b: top[i + 1], title: `${top[i].name} vs ${top[i + 1].name}`, kind: 'city' });
    return [...L.sort((x, y) => x.gap - y.gap).slice(0, 4), ...duels.sort((x, y) => x.gap - y.gap).slice(0, 2)];
  }
  function raceCaption(r) {
    const handle = SITE.igHandle ?? '', s = n => n === 1 ? '' : 's', end = nextMandateEnd();
    const head = r.kind === 'city' ? `${r.gap} house${s(r.gap)}. That’s all that separates ${r.a.name} from ${r.b.name}. 🔥` : `${r.gap === 0 ? 'Tied' : `${r.gap} coin${s(r.gap)} separate`} the ${r.title}. 🏛`;
    const score = r.kind === 'city' ? `Right now: ${r.a.name} ${r.a.n} houses × ${r.b.name} ${r.b.n}. ${r.b.name} needs ${r.gap + 1} to pass.` : `Scoreboard right now: @${r.a.h} ${r.a.w} × @${r.b.h} ${r.b.w}. Changes live on the link in bio.`;
    return `${head}\n\nWe’re building a virtual USA in 3D: comment your city and get a house with your @. The first in each city is Founder forever.\n${score}\nComment +5 · tag a friend +3 · story tagging @${handle} +30. Whoever scores most governs: mayor, governor, senator, president. The mandate closes Sunday 7pm ET (${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}).\nFollow the page, comment your city and tag a friend. Find your @ on the link in bio. (Nonpartisan game: the offices are just for fun.)`.replace(/\\n/g, '\n');
  }

  // ---------- dados ----------
  function renderData() {
    const sw = states.map(s => ({ s, pts: (office.byState.get(s.st) ?? []).reduce((a, o) => a + o.n, 0), g: H.governors.get(s.st) })).sort((a, b) => b.pts - a.pts), top = sw[0]?.pts || 1;
    const real = towns.filter(t => !t.open), cp = real.map(t => ({ t, pts: t.houses.reduce((a, o) => a + o.n, 0) })).sort((a, b) => b.pts - a.pts).slice(0, 8);
    const perDay = new Map(); for (const o of houses) { const d = Math.max(1, Math.floor((o.ts * 1000 - day1) / 864e5) + 1); perDay.set(d, (perDay.get(d) ?? 0) + 1); } const days = [...perDay.keys()].sort((a, b) => a - b); let cum = 0; const growth = days.map(d => { cum += perDay.get(d); return { d, add: perDay.get(d), cum }; });
    const bigOpen = A.openCities.length, bigHave = A.openCities.filter(c => A.townByKey.get(`${c.n.replace(', D.C.', '')}|${c.st}`)?.n > 0).length;
    const newToday = real.filter(t => t.houses[0].ts * 1000 > Date.now() - 864e5).sort((a, b) => b.n - a.n).slice(0, 6);
    const wonders = towns.filter(t => t.wonder).sort((a, b) => b.wonder.progress - a.wonder.progress);
    const ring = (pct, label, c) => `<div><div class="ring" style="--p:${Math.round(pct)};--c:${c}" data-t="${Math.round(pct)}%"></div><small>${label}</small></div>`;
    const unlocked = wonders.filter(t => t.wonder.unlocked).length, bounty = towns.filter(t => t.open && t.pop).sort((a, b) => b.pop - a.pop).slice(0, 12);
    const rc = races();
    $('p-data').innerHTML = `<div class="dcard"><div class="dsub">The map now · day ${day}</div><div class="dbig">${fmt(houses.length)}</div><div class="dsub c">houses on the map</div><div class="d3"><div><b>${fmt(office.byCity.size)}</b><span>CITIES</span></div><div><b>${office.byState.size}/${states.length}</b><span>STATES</span></div><div><b>${fmt(totalPts)}</b><span>COINS</span></div></div></div>
      <div class="dcard"><div class="dsub">Scoreboard</div><div class="rings">${ring(bigHave / Math.max(1, bigOpen) * 100, `of the ${bigOpen} biggest cities have a Founder`, '#ffd21f')}${ring(office.byState.size / states.length * 100, `states with at least one house (${office.byState.size}/${states.length})`, '#3b82f6')}${ring(unlocked / Math.max(1, wonders.length) * 100, `landmarks built (${unlocked}/${wonders.length})`, '#22a559')}</div></div>
      ${hotHouses.length ? `<div class="dcard"><div class="dsub">🔥 On fire right now</div>${hotHouses.slice(0, 8).map(o => `<div class="wr cl" data-act="house" data-h="${esc(o.h)}"><span>🔥 @${esc(o.h)} · ${esc(o.city)}, ${o.st}</span><b>${Math.max(1, Math.ceil((o.hotUntil - Date.now()) / 36e5))}h left</b></div>`).join('')}<p class="fine">Post your house on your story tagging @${esc(SITE.igHandle ?? '')}: +30 coins and 24 h of fire.</p></div>` : ''}
      <div class="dcard"><div class="dsub">Close races</div><div class="dtitle" style="font-size:15px">A few coins flip an office. Share the one in your city.</div>${rc.map((r, i) => `<div class="race"><b>${r.gap === 0 ? 'Tied' : `${fmt(r.gap)} ${r.kind === 'city' ? 'house' : 'coin'}${r.gap === 1 ? '' : 's'}`} · ${esc(r.title)}</b><div class="vs"><span>${r.kind === 'city' ? esc(r.a.name) : '@' + esc(r.a.h)} <b>${fmt(r.kind === 'city' ? r.a.n : r.a.w)}</b></span><span>${r.kind === 'city' ? esc(r.b.name) : '@' + esc(r.b.h)} <b>${fmt(r.kind === 'city' ? r.b.n : r.b.w)}</b></span></div><div class="row"><button class="btn alt" data-act="race" data-i="${i}">Copy caption</button>${r.kind === 'city' ? `<button class="btn" data-act="town" data-k="${esc(r.a.key)}">See</button>` : `<button class="btn" data-act="house" data-h="${esc(r.a.h)}">See</button>`}</div></div>`).join('') || '<p class="hint">No contested office yet. Seats open at 3 houses in a city and 5 in a state.</p>'}</div>
      <div class="dcard"><div class="dsub">Cities with no owner</div><p class="fine" style="margin-top:0">The biggest cities nobody claimed yet. The first comment names the Founder, forever.</p>${bounty.map(t => `<div class="wr cl" data-act="town" data-k="${esc(t.key)}"><span>🚩 ${esc(t.name)}, ${t.st}</span><b>${fmt(t.pop)}</b></div>`).join('') || '<p class="hint">Every big city has a Founder.</p>'}</div>
      <div class="dcard"><div class="dsub">State war</div><div class="dtitle">${sw[0]?.pts ? `${esc(sw[0].s.name)} leads` : 'No leader yet'}</div>${sw.slice(0, 8).map((r, i) => `<div class="war"><div class="wr"><span>${i + 1} · ${esc(r.s.name)}</span><b>${fmt(r.pts)}</b></div><div class="bar"><i style="width:${Math.round(r.pts / top * 100)}%"></i></div><small>${r.g ? `♛ @${esc(r.g.h)}` : 'open governor seat'}</small></div>`).join('')}</div>
      <div class="dcard"><div class="dsub">Cities that engage most</div>${cp.map((r, i) => `<div class="wr cl" data-act="town" data-k="${esc(r.t.key)}"><span>${i + 1} · ${esc(r.t.name)}, ${r.t.st}</span><b>${fmt(r.pts)}</b></div>`).join('') || '<p class="hint">No cities yet.</p>'}</div>
      <div class="dcard"><div class="dsub">Coverage</div><div class="dbig sm">${Math.round(bigHave / bigOpen * 100)}%</div><div class="dsub c">of the ${bigOpen} biggest cities and capitals have a Founder</div><div class="bar"><i style="width:${bigHave / bigOpen * 100}%"></i></div></div>
      <div class="dcard"><div class="dsub">Growth</div>${growth.map(g => `<div class="wr"><span>Day ${g.d}</span><b>+${fmt(g.add)} → ${fmt(g.cum)}</b></div>`).join('') || '<p class="hint">Nothing yet.</p>'}</div>
      <div class="dcard"><div class="dsub">New Founders today</div>${newToday.map(t => `<div class="wr cl" data-act="town" data-k="${esc(t.key)}"><span>🚩 ${esc(t.name)}, ${t.st}</span><b>@${esc(t.houses[0].h)}</b></div>`).join('') || '<p class="hint">No new cities in the last 24 hours.</p>'}</div>
      <div class="dcard"><div class="dsub">Famous landmarks</div><p class="fine" style="margin-top:0">Each city unlocks a landmark when it reaches its neighbor goal. Comment your city and tag friends to build it faster.</p>${wonders.map(t => `<div class="wn cl" data-act="town" data-k="${esc(t.key)}"><div class="wr"><span>${t.wonder.unlocked ? '✅' : '🏗'} ${esc(t.wonder.name)} · ${esc(t.name)}</span><b>${t.n}/${t.wonder.target}</b></div><div class="bar"><i style="width:${Math.round(t.wonder.progress * 100)}%"></i></div></div>`).join('')}</div>
      <p class="fine">Updated ${hd.updated ? new Date(hd.updated).toLocaleString('en-US') : '—'}. All 50 states + DC (Alaska and Hawaii are shown as insets). Terrain: AWS Terrain Tiles. Cities: GeoNames.</p>`;
    $('p-data').onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; const act = b.dataset.act;
      if (act === 'town') { const t = A.townByKey.get(b.dataset.k); if (t) showTown(t); } else if (act === 'house') find('@' + b.dataset.h); else if (act === 'race') { const r = races()[+b.dataset.i]; if (r) copy(raceCaption(r), 'Caption copied'); } };
  }
  function renderHow() {
    $('p-how').innerHTML = `<div class="dcard"><div class="dtitle">Your house grows with your coins</div><div class="lv">${LEVELS.map((l, i) => `<div class="lvc"><span>${LVL_ICON[i]}</span><b>${i + 1}. ${l.name}</b><small>${l.n}+ pts</small></div>`).join('')}</div><p class="fine">Coins count forever and the house never shrinks. 15 levels, from a cottage to the top of the map.</p></div>
      <div class="dcard"><div class="dtitle">Offices: the week’s coins rule</div><ul class="roles">${ROLES.slice(0, 7).map(r => `<li><span class="rtag" style="background:${r.color}">${r.tag}</span> <b>${r.icon} ${r.title}</b><br><small>${{ president: '1 seat · most coins in the USA', vice: '1 seat · second most coins in the USA', senator: `top ${H.seats.senators} nationwide (4% of the map, up to 100)`, governor: `1 per state · opens at ${OPEN.governor} houses`, representative: 'real House seats per state, opening as the state grows', mayor: `1 per city · opens at ${OPEN.mayor} houses`, council: 'up to 20 per city, half of the city’s houses' }[r.id]}</small></li>`).join('')}</ul>
        <p class="fine">Each person holds only their highest office. When someone moves up, the next in line takes the seat. Tie-break: the older house. Mandates close Sunday 7pm ET.</p></div>
      <div class="dcard"><div class="dtitle">Coins are money you spend</div><p class="fine" style="margin:0">Coins you earn go to your <b>balance</b>. You <b>buy</b> each house phase with coins (Phase 2 costs 🪙 30), and you pay a fee to run in the weekly election. Elected officials earn coins <b>every hour</b>. Everyone else earns by commenting, tagging friends and posting stories.</p></div>
      <div class="dcard"><div class="dtitle">How to earn coins</div><ul class="roles"><li><b class="pp">+10</b> have a house (once)</li><li><b class="pp">+5</b> comment on each new post</li><li><b class="pp">+1</b> extra comment on the same post (up to 10)</li><li><b class="pp">+3</b> tag a friend (up to 10 per post)</li><li><b class="pp">+5</b> a vote: “vote @you”</li><li><b class="pp">+25</b> recruit: a friend you tagged joins</li><li><b class="pp">+30</b> story: post your house tagging us (and it <b class="fire">burns for 24 h</b>)</li><li><b class="pp">+10</b> tag a brand or company in a comment (each different brand)</li></ul><p class="fine">Total coins set the <b>house level</b> and never reset. <b>Weekly coins</b> set the <b>offices</b> and restart every Sunday 7pm ET.</p></div>
      <div class="dcard"><div class="dtitle">Cities level up</div><p class="fine" style="margin:0">A <b>Park</b> at 3 houses, a <b>School</b> at 6, a <b>Hospital</b> at 12, a <b>Stadium</b> at 25. Until a city gets there, its lot is a <b>construction site</b> with a crane and a progress bar. Big cities unlock a <b>famous landmark</b>; the <b>White House</b> stands in Washington, D.C. Tap any house, city or state to open its card. The first house in a city is its <b>Founder</b>. Local businesses can put their own building on the map.</p></div>
      <p class="fine">All 50 states + DC. Handles come from public comments — message us on Instagram and we’ll remove yours. <a href="privacy.html">Privacy</a></p>`;
  }

  // ---------- negócio (assistente de 3 passos) ----------
  const TIERS = [{ id: 'S', name: 'Small town', sub: 'city under 100k people', price: 9, max: 1e5 }, { id: 'M', name: 'Big city', sub: 'city from 100k to 1 million', price: 14, max: 1e6 }, { id: 'L', name: 'Metropolis', sub: 'city over 1 million', price: 19, max: 1e12 }];
  const tierOf = t => !t ? null : TIERS.find(x => (t.pop || 0) < x.max) ?? TIERS[2];
  const TITLE_BY_TYPE = { 'Restaurant / food': 'Secretary of Food', 'Ice cream / coffee': 'Secretary of Sweets', 'Market / bakery': 'Secretary of Supply', 'Clothing store': 'Secretary of Style', 'Salon / barber / beauty': 'Secretary of Beauty', 'Gym / sports': 'Secretary of Sports', 'Phone / IT': 'Secretary of Tech', 'Flowers / gifts': 'Secretary of Gifts', 'Pet shop / vet': 'Secretary of Pets', 'Auto / garage': 'Secretary of Transport', 'Service / office / school': 'Secretary of Services', 'Creator / page': 'Secretary of Culture', Other: 'Brand Ambassador' };
  function openBiz(preCity = '') {
    const m = $('modal'); m.hidden = false; let step = 1; const st = { name: '', ig: '', type: BIZ_TYPES[0], city: preCity, color: BIZ_COLORS[0], wa: '', ok: false };
    const cityList = towns.map(t => `<option value="${esc(t.name)}, ${t.st}">`).join('');
    const townOf = () => towns.find(t => `${t.name}, ${t.st}`.toLowerCase() === st.city.toLowerCase());
    const shell = body => `<div class="mbox"><button class="x" id="mx" aria-label="Close">×</button><h3>Your business on the map</h3><div class="wz">${[1, 2, 3].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>${body}</div>`;
    const close = () => { m.hidden = true; m.innerHTML = ''; };
    const preview = () => `<div class="shop" style="--c:${esc(st.color)}"><div class="awn"></div><div class="bd"><b>${esc(st.name || 'Your business')} <span class="sponsored">SPONSORED</span></b><small>${esc(st.ig ? '@' + st.ig.replace(/^@/, '') : '@yourbusiness')} · ${esc(st.city || 'your city')}</small></div></div>`;
    function s1() {
      m.innerHTML = shell(`<p class="hint" style="margin-top:0">A real building with your name, your color and your @ on the roof sign, in the city you choose. 10 days on the map. Takes a minute.</p>
        <label>Business name<input id="b-name" maxlength="40" placeholder="e.g. Joe’s Bakery" value="${esc(st.name)}"></label><label>Instagram of the business<input id="b-ig" maxlength="30" placeholder="@yourbusiness" autocapitalize="none" value="${esc(st.ig)}"></label>
        <label>Type<div class="chips" id="b-types">${BIZ_TYPES.map(t => `<button type="button" class="hot-b${t === st.type ? ' on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div></label>
        <label>City<input id="b-city" list="b-cities" placeholder="type a city, ST" autocomplete="off" value="${esc(st.city)}"></label><datalist id="b-cities">${cityList}</datalist>
        <label>Brand color<div class="swatches" id="b-colors">${BIZ_COLORS.map(c => `<button type="button" class="sw${c === st.color ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" id="b-cc" value="${esc(st.color)}"></div></label>
        <label>WhatsApp or phone (optional)<input id="b-wa" maxlength="24" inputmode="tel" placeholder="only so we can reach you" value="${esc(st.wa)}"></label>
        <div class="prev" id="b-prev">${preview()}</div>
        <label class="chk"><input type="checkbox" id="b-ok" ${st.ok ? 'checked' : ''}><span>My business is not betting or gambling, piracy or IPTV, adult content, political, weapons or controlled medicine. If it is, the request can be refused and refunded.</span></label>
        <button class="btn full" id="b-next" style="margin-top:12px">Next · see the price</button>`);
      const sync = () => { st.name = $('b-name').value.trim(); st.ig = $('b-ig').value.trim().replace(/^@/, ''); st.city = $('b-city').value.trim(); st.wa = $('b-wa').value.trim(); st.ok = $('b-ok').checked; $('b-prev').innerHTML = preview(); };
      ['b-name', 'b-ig', 'b-city', 'b-wa'].forEach(id => $(id).addEventListener('input', sync)); $('b-ok').onchange = sync;
      $('b-types').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.type = b.dataset.t; $('b-types').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
      $('b-colors').onclick = e => { const b = e.target.closest('.sw'); if (!b) return; st.color = b.dataset.c; $('b-cc').value = st.color; $('b-colors').querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b)); $('b-prev').innerHTML = preview(); };
      $('b-cc').oninput = e => { st.color = e.target.value; $('b-colors').querySelectorAll('.sw').forEach(x => x.classList.remove('on')); $('b-prev').innerHTML = preview(); };
      $('mx').onclick = close;
      $('b-next').onclick = () => { sync(); if (!st.name || !st.ig) return toast('Fill the business name and Instagram'); if (!townOf()) return toast('Pick a city from the list (City, ST)'); if (!st.ok) return toast('Tick the box to continue'); step = 2; s2(); };
    }
    function s2() {
      const t = townOf(), tier = tierOf(t), title = TITLE_BY_TYPE[st.type] ?? 'Brand Ambassador';
      m.innerHTML = shell(`${preview()}<div class="pricebig">$${tier.price}</div><p class="fine" style="text-align:center;margin-top:0">one time · 10 days on the map · ${esc(t.name)}, ${t.st}</p>
        ${TIERS.map(x => `<div class="plan${x.id === tier.id ? ' on' : ''}"><em>$${x.price}</em><b>${x.name}</b>${x.id === tier.id ? ' (yours)' : ''}<small>${x.sub}</small></div>`).join('')}
        <h4 class="sec">What you get</h4><ul class="perks"><li>10 days on the 3D map: a building with your name, your color and your @</li><li>Featured in one of our next Reels, with every business of the batch</li><li>One Story naming you</li><li>Whoever tags your @ in one of our comments earns <b>+30 coins</b>, so the whole city tags you</li><li>The “Sponsored” tag and the title <b>${esc(title)}</b> for the player with the most coins in ${esc(t.name)}</li></ul>
        <div class="row"><button class="btn alt" id="b-back">Back</button><button class="btn" id="b-go">Continue</button></div>`);
      $('mx').onclick = close; $('b-back').onclick = () => { step = 1; s1(); }; $('b-go').onclick = () => { step = 3; s3(); };
    }
    function s3() {
      const t = townOf(), tier = tierOf(t);
      m.innerHTML = shell(`${preview()}<h4 class="sec">Pay securely</h4><ol class="perks" style="list-style:decimal;padding-left:20px"><li style="padding-left:2px">You pay <b>$${tier.price}</b> on Stripe's secure page (card, Apple Pay, Google Pay). We never see your card.</li><li style="padding-left:2px">Your building shows up on the map right after payment, for 10 days.</li><li style="padding-left:2px">If all spots are taken when you pay, you get an automatic full refund.</li></ol>
        <div class="row"><button class="btn alt" id="b-back">Back</button><button class="btn" id="b-pay">Pay $${tier.price} with Stripe</button></div><p class="fine">Payments are processed by Stripe. Price is set by the city size, not by this page.</p>`);
      $('mx').onclick = close; $('b-back').onclick = () => { step = 2; s2(); };
      $('b-pay').onclick = async () => { const b = $('b-pay'); b.disabled = true; b.textContent = 'Opening Stripe…';
        try { const r = await fetch('api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: st.name, ig: st.ig, type: st.type, color: st.color, city: `${t.name}, ${t.st}`, wa: st.wa, terms: st.ok === true }) }), j = await r.json();
          if (j.ok && /^https:\/\/checkout\.stripe\.com\//.test(j.url)) { location.href = j.url; return; } toast(j.error ?? 'Payment could not start'); }
        catch { toast('Connection problem, try again'); } b.disabled = false; b.textContent = `Pay $${tier.price} with Stripe`; };
    }

    s1();
  }

  // ---------- início ----------
  renderRank(); renderData(); renderHow(); renderCapitol();
  { const real = towns.filter(t => !t.open).sort((a, b) => b.n - a.n).slice(0, 8), open = towns.filter(t => t.open).sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0)).slice(0, 10), list = real.length >= 4 ? real : open;
    $('hot').innerHTML = `<div class="hot-t">${real.length >= 4 ? 'Biggest cities' : 'Open seats — claim the first Founder flag'}</div><div class="hot-l">${list.map(t => `<button class="hot-b" data-i="${towns.indexOf(t)}">${esc(t.name)}${t.open ? '' : ` <i>${t.n}</i>`}</button>`).join('')}</div>`;
    $('hot').onclick = e => { const b = e.target.closest('.hot-b'); if (b) { sheet.classList.add('min'); A.flyTown(towns[+b.dataset.i]); } }; }
  $('out').innerHTML = houses.length ? '<p class="hint">Type your Instagram @, a city or a state and the map flies there.</p>' : `<p class="hint"><b>Day ${day}. The map is empty.</b> Be the first Founder in your city: comment your city (like <b>“Austin, TX”</b>) on <b>${esc(SITE.reelHint)}</b>.</p>`;
  const u = new URLSearchParams(location.search).get('u'); if (u) { $('handle').value = normHandle(u); setTimeout(() => find(u), 300); }
  { const qs = new URLSearchParams(location.search), c = qs.get('c'), sx = qs.get('s'); if (c && A.townByKey.get(c)) setTimeout(() => showTown(A.townByKey.get(c)), 300); else if (sx && stateByCode.get(sx.toUpperCase())) setTimeout(() => showState(stateByCode.get(sx.toUpperCase())), 300); }
}
