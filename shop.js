// Loja / conta / empresas no site. Toda regra e preço vêm do servidor (/api/game e /api/checkout); aqui é só a tela.
export function initShop(A) {
  if (!document.getElementById('bizpick-css')) { const st = document.createElement('style'); st.id = 'bizpick-css'; st.textContent = '.bizpick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.bzp{display:grid;gap:2px;justify-items:center;text-align:center;background:#fff;border:2.5px solid #d5dde5;border-radius:14px;padding:6px 4px 8px;cursor:pointer;font:inherit;color:#1e2430}.bzp img{width:100%;height:auto;aspect-ratio:1;border-radius:10px;background:#dfeef7}.bzp b{font-size:12.5px;line-height:1.15}.bzp small{font-size:11.5px;color:#5d6878}.bzp.on{border-color:#1e2430;background:#fff4c4;box-shadow:0 3px 0 #1e2430}.bzp:focus-visible{outline:3px solid #ffd21f;outline-offset:2px}@media(max-width:380px){.bizpick{grid-template-columns:repeat(2,1fr)}}'; document.head.append(st); }
  const $ = id => document.getElementById(id), esc = A.esc, m = $('modal');
  const toast = msg => { const t = $('toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3200); };
  const api = async (a, body, method = body ? 'POST' : 'GET', qs = '') => { const r = await fetch(`/api/game?a=${a}${qs}`, { method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); let j = {}; try { j = await r.json(); } catch { /* vazio */ } if (!r.ok || j.ok === false) throw Object.assign(new Error(j.error || 'Something went wrong'), { status: r.status }); return j; };
  const pay = async body => { const r = await fetch('api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (j.ok && /^https:\/\/checkout\.stripe\.com\//.test(j.url)) location.href = j.url; else toast(j.error || 'Payment could not start'); };
  const usd = c => '$' + (c / 100).toFixed(2), nonce = () => crypto.getRandomValues(new Uint32Array(3)).join('-');
  let CAT = null, ME = null, tab = 'gems';
  const shell = (title, html) => { m.hidden = false; m.innerHTML = `<div class="mbox"><button class="x" id="mx" aria-label="Close">×</button><h3>${title}</h3>${html}</div>`; $('mx').onclick = () => { m.hidden = true; m.innerHTML = ''; }; };
  const tabs = () => `<div class="chips" style="margin:6px 0 10px">${[['gems', '💎 Gems'], ['items', '🏡 Lot & items'], ['skins', '🏰 House styles'], ['biz', '🏪 Businesses']].map(([k, l]) => `<button class="hot-b${tab === k ? ' on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>`;

  async function open(which) {
    if (which) tab = which;
    try { CAT ??= await (await fetch('api/game?a=catalog')).json(); } catch { return toast('Shop unavailable right now'); }
    try { ME = await api('me'); } catch (e) { ME = null; if (e.status !== 401) { shell('Shop', `<p class="hint">${esc(e.message)}</p>`); return; } }
    render();
  }
  function render() {
    const head = ME ? `<div class="dcard" style="display:flex;justify-content:space-between;align-items:center"><div><b>💎 ${ME.gems} gems</b><br><small class="fine">${ME.handle ? 'House: @' + esc(ME.handle) + ' · level ' + ME.level : 'No house linked yet'}</small></div><button class="btn mini alt" id="s-out">Sign out</button></div>${ME.handle ? '' : `<div class="dcard"><b>Link your house</b><p class="fine" style="margin:4px 0">Type the @ that has a house on the map. One account per @, can't be changed later.</p><div class="row"><input id="s-h" maxlength="31" placeholder="@yourname" autocapitalize="none"><button class="btn mini" id="s-link">Link</button></div></div>`}`
      : `<div class="dcard"><b>Already bought something?</b><p class="fine" style="margin:4px 0">Sign in with the recovery code you got after your first purchase.</p><div class="row"><input id="s-code" maxlength="29" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autocapitalize="characters"><button class="btn mini" id="s-login">Sign in</button></div></div>`;
    let body = '';
    if (tab === 'gems') body = `<p class="fine" style="margin-top:0">Gems only buy looks: lots, decorations and house styles. They never buy coins, levels, votes or offices.</p>${Object.entries(CAT.packs).map(([k, p]) => `<div class="mrow"><div><b>💎 ${p.gems}</b><small> gems</small></div><button class="btn mini" data-pack="${k}">${usd(p.cents)}</button></div>`).join('')}<label class="fine" style="display:flex;gap:8px;align-items:flex-start;margin:8px 0"><input type="checkbox" id="g-ok" style="margin-top:3px"><span>I am 18 or older, or have a parent or guardian's permission, and I accept the <a href="terms.html" target="_blank" rel="noopener">Terms</a> and <a href="refunds.html" target="_blank" rel="noopener">Refund Policy</a>.</span></label><p class="fine">Paid securely on Stripe. <b>Refunds:</b> a pack you haven't used at all can be refunded within 7 days. Spent gems, and any pack with gems already spent, <b>can't be refunded</b>. Refunds are handled by hand: send a DM to <b>@fillthemap.usa</b> on Instagram with the email you used at checkout.</p>`;
    if (tab === 'items') {
      const inv = new Set(ME?.inventory ?? []), lot = ME?.layout?.lot_level ?? 1, cap = CAT.lots[lot].slots, eq = new Set(ME?.layout?.items ?? []);
      const used = [...eq].reduce((a, s) => a + (CAT.items[s]?.slots ?? 0), 0);
      body = `<div class="dcard"><b>Your lot: level ${lot}</b> · ${used}/${cap} spaces used<div class="bar"><i style="width:${Math.min(100, used / cap * 100)}%"></i></div>${lot < 5 ? `<div class="mrow"><div>Upgrade to lot ${lot + 1} (${CAT.lots[lot + 1].slots} spaces) <small>· needs house level ${CAT.lots[lot + 1].minLevel}</small></div><button class="btn mini" data-buy="lot${lot + 1}">💎 ${CAT.lots[lot + 1].gems}</button></div>` : ''}</div>`
        + Object.entries(CAT.items).map(([k, it]) => `<div class="mrow"><div><b>${esc(it.name)}</b><small> · ${it.slots} space${it.slots === 1 ? '' : 's'}${it.minLevel ? ' · level ' + it.minLevel + '+' : ''}</small></div>${inv.has(k) ? `<label style="margin:0;text-transform:none"><input type="checkbox" data-eq="${k}" ${eq.has(k) ? 'checked' : ''}> on my lot</label>` : `<button class="btn mini" data-buy="${k}">💎 ${it.gems}</button>`}</div>`).join('')
        + (ME ? '<button class="btn full" id="s-save" style="margin-top:10px">Save my lot</button>' : '');
    }
    if (tab === 'skins') { const inv = new Set(ME?.inventory ?? []), cur = ME?.layout?.skin ?? null;
      body = `<p class="fine" style="margin-top:0">Replace your house with another style. Each style unlocks at a house level.</p><div class="mrow"><div><b>Classic house</b></div><button class="btn mini alt" data-skin="" ${cur === null ? 'disabled' : ''}>${cur === null ? 'Using' : 'Use'}</button></div>`
        + Object.entries(CAT.skins).map(([k, s]) => `<div class="mrow"><div><b>${esc(s.name)}</b><small> · house level ${s.minLevel}+</small></div>${inv.has(k) ? `<button class="btn mini alt" data-skin="${k}" ${cur === k ? 'disabled' : ''}>${cur === k ? 'Using' : 'Use'}</button>` : `<button class="btn mini" data-buy="${k}">💎 ${s.gems}</button>`}</div>`).join(''); }
    if (tab === 'biz') body = (ME?.businesses ?? []).map(b => `<div class="mrow" data-biz="${esc(b.id)}"><div><b>${esc(b.name)}</b><small> · ${esc(CAT.biz[b.type]?.label ?? b.type)} · ${esc(b.city)}, ${esc(b.st)}</small></div><span class="pts">${esc(b.status)}</span></div>`).join('')
      + `<h4 class="sec">Open a business</h4><p class="spots-line" style="margin:0 0 6px;font-weight:800">${spotsText()}</p><p class="fine" style="margin-top:0">Your business stays on the map for good, it is never removed for low results. Max ${CAT.maxBizPerAccount} per person. Price depends on the city size.</p>
      <p class="fine" style="margin:0 0 6px"><b>1. Pick your store</b></p><div class="bizpick">${Object.entries(CAT.biz).map(([k, v], i) => `<button type="button" class="bzp${i ? '' : ' on'}" data-bt="${k}" aria-pressed="${!i}"><img src="img/biz/${k}.jpg" alt="" width="140" height="140" loading="lazy"><b>${esc(v.label)}</b><small>from ${usd(v.small)}</small></button>`).join('')}</div><input type="hidden" id="b-type" value="${Object.keys(CAT.biz)[0]}">
      <p class="fine" style="margin:10px 0 4px"><b>2. Your details</b></p>
      <label>Business name<input id="b-name" maxlength="40"></label><label>Instagram of the business<input id="b-ig" maxlength="31" placeholder="@yourbusiness" autocapitalize="none"></label>
      <label>City (as on the map)<input id="b-city" placeholder="Houston, TX or Houston, Texas"></label><label>Color<input type="color" id="b-color" value="#e0483e"></label>
      <label class="chk"><input type="checkbox" id="b-ok"><span>Not betting, adult, piracy, weapons, political or controlled medicine (otherwise it is refused and refunded). I am 18 or older, or have a parent or guardian's permission, and I accept the <a href="terms.html" target="_blank" rel="noopener">Terms</a> and <a href="refunds.html" target="_blank" rel="noopener">Refund Policy</a>: business purchases are final. Refund requests are handled by DM to @fillthemap.usa.</span></label>
      <button class="btn full" id="b-pay" style="margin-top:10px">Continue to payment</button>`;
    shell('🛍 Shop', head + tabs() + body); wire();
  }
  function wire() {
    m.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
    m.querySelectorAll('[data-pack]').forEach(b => b.onclick = () => { if (!$('g-ok')?.checked) return toast('Tick the box to confirm your age and accept the terms'); b.disabled = true; pay({ kind: 'gems', sku: b.dataset.pack, terms: true }).finally(() => { b.disabled = false; }); });
    m.querySelectorAll('[data-buy]').forEach(b => b.onclick = async () => { if (!ME) return toast('Buy gems first to create your account'); b.disabled = true; try { await api('buy', { sku: b.dataset.buy }); toast('Bought ✓'); await open(); } catch (e) { toast(e.message); b.disabled = false; } });
    m.querySelectorAll('[data-skin]').forEach(b => b.onclick = async () => { try { await api('layout', { skin: b.dataset.skin || null, items: ME.layout?.items ?? [] }); toast('Saved ✓'); await open(); } catch (e) { toast(e.message); } });
    m.querySelectorAll('[data-biz]').forEach(r => r.onclick = () => openBiz(r.dataset.biz));
    m.querySelectorAll('[data-bt]').forEach(b => b.onclick = () => { m.querySelectorAll('[data-bt]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); $('b-type').value = b.dataset.bt; });
    $('s-save') && ($('s-save').onclick = async () => { const items = [...m.querySelectorAll('[data-eq]:checked')].map(x => x.dataset.eq); try { await api('layout', { skin: ME.layout?.skin ?? null, items }); toast('Lot saved ✓'); await open(); } catch (e) { toast(e.message); } });
    $('s-link') && ($('s-link').onclick = async () => { try { await api('link', { handle: $('s-h').value }); toast('Linked ✓'); await open(); } catch (e) { toast(e.message); } });
    $('s-login') && ($('s-login').onclick = async () => { try { await api('login', { code: $('s-code').value }); toast('Signed in ✓'); await open(); } catch (e) { toast(e.message); } });
    $('s-out') && ($('s-out').onclick = async () => { await api('logout', {}).catch(() => {}); ME = null; render(); });
    $('b-pay') && ($('b-pay').onclick = () => { if (!$('b-ok').checked) return toast('Tick the box to continue'); pay({ kind: 'biz', type: $('b-type').value, name: $('b-name').value.trim(), ig: $('b-ig').value.trim(), city: $('b-city').value.trim(), color: $('b-color').value, terms: true }); });
  }
  async function openBiz(id) {
    let s; try { s = await api('biz', null, 'GET', '&id=' + encodeURIComponent(id)); } catch (e) { return toast(e.message); }
    const star = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
    shell(`🏪 ${esc(s.name)}`, `<p class="fine" style="margin-top:0">${esc(s.city)}, ${esc(s.st)} · day ${s.day} · <b>${esc(s.status)}</b></p>
      <div class="d3"><div><b>🪙 ${s.cash}</b><span>CASH</span></div><div><b>${star(s.stars)}</b><span>${s.stars} STARS</span></div><div><b>${s.todayCustomers}</b><span>CUSTOMERS TODAY${s.todayLost ? ` · ${s.todayLost} LOST` : ''}</span></div></div>
      <h4 class="sec">Staff ${s.staff.length}/${s.slots}</h4>${s.staff.map(x => `<div class="mrow"><div><b>${esc(x.name)}</b><small> · skill ${x.skill} · reliability ${x.rel} · 🪙 ${x.wage}/day<br>${esc(x.story)}</small></div>${x.canFire ? `<button class="btn mini alt" data-fire="${esc(x.id)}">Let go</button>` : '<small>new</small>'}</div>`).join('') || '<p class="hint">No staff yet: you serve alone, and lose customers at rush hour.</p>'}
      <h4 class="sec">Candidates this hour ${s.hireIn ? `<small>· next hire in ${s.hireIn} h</small>` : ''}</h4>${s.market.map(c => `<div class="mrow"><div><b>${esc(c.name)}</b><small> · skill ${c.skill} · reliability ${c.rel} · 🪙 ${c.wage}/day<br>${esc(c.story)}</small></div><button class="btn mini" data-hire="${esc(c.id)}" ${s.hireIn || s.staff.length >= s.slots ? 'disabled' : ''}>Hire</button></div>`).join('')}
      <h4 class="sec">Withdraw coins to your house</h4><p class="fine" style="margin-top:0">Up to 🪙 ${s.withdrawToday} today. The rest stays to pay staff and upkeep.</p><div class="row"><input id="w-amt" type="number" min="1" max="${s.withdrawToday}" value="${s.withdrawToday}"><button class="btn mini" id="w-go" ${s.withdrawToday < 1 ? 'disabled' : ''}>Withdraw</button></div>
      <button class="btn alt full" id="b-back" style="margin-top:10px">Back to shop</button>`);
    const act = async (a, body) => { try { await api(a, { id, nonce: nonce(), ...body }); toast('Done ✓'); } catch (e) { toast(e.message); } openBiz(id); };
    m.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => act('hire', { arg: b.dataset.hire }));
    m.querySelectorAll('[data-fire]').forEach(b => b.onclick = () => act('fire', { arg: b.dataset.fire }));
    $('w-go').onclick = () => act('withdraw', { amount: Math.floor(+$('w-amt').value) });
    $('b-back').onclick = () => { tab = 'biz'; open(); };
  }
  // volta da Stripe: entra na conta, mostra o código de recuperação UMA vez
  (async () => {
    const q = new URLSearchParams(location.search), sid = q.get('session'); if (q.get('paid') !== '1' || !sid) return;
    history.replaceState(null, '', location.pathname);
    for (let i = 0; i < 6; i++) { try { const r = await api('claim', { session: sid });
        if (r.refunded) toast('Payment refunded automatically: ' + String(r.refunded).replace(/_/g, ' '));
        if (r.recovery) { shell('✅ Payment received', `<p>Your account is ready. <b>Save this recovery code</b>: it is the only way to sign in on another phone. We can't show it again.</p><div class="pricebig" style="font-size:22px;letter-spacing:.05em">${esc(r.recovery)}</div><button class="btn full" id="r-copy">Copy code</button><button class="btn alt full" id="r-shop" style="margin-top:8px">Go to my shop</button>`); $('r-copy').onclick = () => navigator.clipboard?.writeText(r.recovery).then(() => toast('Copied')); $('r-shop').onclick = () => open('items'); }
        else if (r.needLogin) { toast('Payment received ✓ Sign in with your recovery code to use it.'); open(); }
        else { toast('Payment received ✓'); open(); }
        return; } catch (e) { if (e.status !== 409 || i === 5) { toast(e.message); return; } await new Promise(res => setTimeout(res, 2000)); } }
  })();
  // contador de vagas: 30 até terça 12h de Nova York, depois abre para todos (o servidor manda os números)
  let SP = null;
  function spotsText(now = Date.now()) {
    if (!SP) return '';
    const left = Math.max(0, SP.max - SP.used), ms = Date.parse(SP.phase2At) - now;
    if (ms <= 0) return `🏪 Store spots are open to everyone · ${left} left`;
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, mi = Math.floor(ms / 6e4) % 60;
    return left ? `🏪 Only ${left} of ${SP.max} early spots left · ${d ? d + 'd ' : ''}${h}h ${mi}m` : `🏪 All ${SP.max} early spots taken · more open in ${d ? d + 'd ' : ''}${h}h ${mi}m`;
  }
  const paint = () => { const t = spotsText(); const chip = $('spots'); if (chip) { chip.textContent = t; chip.hidden = !t; } m.querySelectorAll('.spots-line').forEach(e => e.textContent = t); };
  const loadSpots = () => fetch('api/game?a=businesses').then(r => r.ok ? r.json() : null).then(j => { if (j?.spots) { SP = j.spots; paint(); } }).catch(() => {});
  loadSpots(); setInterval(loadSpots, 60e3); setInterval(paint, 30e3);
  $('spots')?.addEventListener('click', () => { tab = 'biz'; open(); });
  return { open };
}
