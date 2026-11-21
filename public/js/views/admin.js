// Platform administration (/admin): create and manage tenants and their logins.
import { t, setLang, getLang, LANGS } from '../i18n.js';
import { api, esc, icon, toast, errText, formData, modal, confirmDialog, fmtDate, credit, parseAmount, loading } from '../core.js';
import { qrSvg } from '../qr.js';
import { todayIso } from '../core.js';

const eur = (c) => new Intl.NumberFormat(getLang() === 'en' ? 'en-IE' : getLang() === 'fr' ? 'fr-FR' : 'el-GR', { style: 'currency', currency: 'EUR' }).format((c || 0) / 100);
const tierLabel = (q) => `${t('bill.up_to', { n: q.member_limit })} · ${eur(q.net)} + ${t('bill.vat')} = ${eur(q.total)}`;
function yearFrom(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
function addDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function subPill(s) {
  const cls = { ok: 'pill-ok', expiring: 'pill-warn', grace: 'pill-bad', expired: 'pill-bad', none: '' }[s.status];
  const txt = s.status === 'none' ? t('bill.s_none') : s.status === 'ok' ? t('bill.s_ok', { date: fmtDate(s.paid_until) })
    : s.status === 'expiring' ? t('bill.s_expiring', { n: s.days_left }) : s.status === 'grace' ? t('bill.s_grace', { n: -s.days_left }) : t('bill.s_expired');
  return `<span class="pill ${cls}">${esc(txt)}</span>${s.over_limit ? ` <span class="pill pill-bad">${esc(t('bill.s_over'))}</span>` : ''}`;
}

// Subscription history, renewal recording and reminders for one tenant.
async function billingDialog(x, reload) {
  const [{ subscriptions: subs }, { tiers }] = await Promise.all([api(`admin/tenants/${x.id}/subscriptions`), api('admin/pricing')]);
  const suggestedLimit = tiers.find((q) => q.member_limit >= Math.max(x.active_count, x.member_limit || 0))?.member_limit || tiers[0].member_limit;
  const start = x.paid_until && x.paid_until >= todayIso() ? addDay(x.paid_until) : todayIso();
  const quoteFor = (lim) => tiers.find((q) => q.member_limit === +lim) || tiers[0];
  const next = quoteFor(suggestedLimit);
  const reminder = t('bill.reminder_text', { org: x.name, date: x.paid_until ? fmtDate(x.paid_until) : '—', net: eur(next.net), total: eur(next.total), limit: next.member_limit });
  const mail = x.billing_email || x.email;
  const phone = String(x.phone || '').replace(/[^\d]/g, '');
  await modal({
    title: `${t('bill.subscriptions')} · ${x.name}`,
    wide: true,
    body: `
      <div class="bill-now">${subPill(x.subscription)} <span class="muted small">${esc(t('bill.active_members', { n: x.active_count }))}${x.member_limit ? ` / ${x.member_limit}` : ''}</span></div>
      <form class="form bill-form" onsubmit="return false">
        <h4 class="sub-title">${esc(t('bill.record'))}</h4>
        <div class="grid-2">
          <label class="field"><span>${esc(t('bill.limit'))}</span><select name="member_limit">${tiers.map((q) => `<option value="${q.member_limit}" ${q.member_limit === suggestedLimit ? 'selected' : ''}>${esc(tierLabel(q))}</option>`).join('')}</select></label>
          <label class="field"><span>${esc(t('bill.net'))}</span><input name="net" inputmode="decimal" value="${esc((next.net / 100).toFixed(2))}"></label>
          <label class="field"><span>${esc(t('bill.period_start'))}</span><input type="date" name="period_start" value="${esc(start)}"></label>
          <label class="field"><span>${esc(t('bill.period_end'))}</span><input type="date" name="period_end" value="${esc(yearFrom(start))}"></label>
          <label class="field span-2"><span>${esc(t('bill.reference'))}</span><input name="reference" placeholder="${esc(t('bill.reference_ph'))}"></label>
        </div>
        <p class="bill-total"></p>
        <label class="switch"><input type="checkbox" name="paid" checked><span class="track"></span><span>${esc(t('bill.paid_now'))}</span></label>
        <div class="form-actions"><button class="btn btn-primary" data-save-sub>${icon('check')}<span>${esc(t('bill.save'))}</span></button></div>
      </form>
      <h4 class="sub-title">${esc(t('bill.remind'))}</h4>
      <div class="share-apps">
        ${mail ? `<a class="chip" href="mailto:${esc(mail)}?subject=${encodeURIComponent(t('bill.reminder_subject', { org: x.name }))}&body=${encodeURIComponent(reminder)}">Email · ${esc(mail)}</a>` : ''}
        ${phone ? `<a class="chip" target="_blank" rel="noopener" href="https://wa.me/${esc(phone.length === 10 ? `30${phone}` : phone)}?text=${encodeURIComponent(reminder)}">WhatsApp</a>
          <a class="chip" href="viber://forward?text=${encodeURIComponent(reminder)}">Viber</a>` : ''}
        <button class="chip" data-copy="${esc(reminder)}">${esc(t('bill.copy_text'))}</button>
      </div>
      <h4 class="sub-title">${esc(t('bill.history'))}</h4>
      ${subs.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>${esc(t('bill.period'))}</th><th class="r">${esc(t('bill.limit_short'))}</th><th class="r">${esc(t('bill.total'))}</th><th>${esc(t('bill.paid'))}</th><th></th></tr></thead><tbody>
        ${subs.map((sb) => `<tr><td>${esc(fmtDate(sb.period_start))} – ${esc(fmtDate(sb.period_end))}${sb.reference ? `<small class="muted block">${esc(sb.reference)}</small>` : ''}</td>
          <td class="r">${sb.member_limit}</td><td class="r">${esc(eur(sb.total))}<small class="muted block">${esc(eur(sb.net))} + ${esc(eur(sb.vat))}</small></td>
          <td>${sb.paid_at ? `<span class="pill pill-ok">${esc(fmtDate(sb.paid_at))}</span>` : `<button class="btn btn-ghost btn-sm" data-paid="${sb.id}">${esc(t('bill.mark_paid'))}</button>`}</td>
          <td><button class="icon-btn no" data-del-sub="${sb.id}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(t('bill.no_history'))}</p>`}`,
    onOpen: (box, close) => {
      bindCopy(box);
      const f = box.querySelector('.bill-form');
      const total = () => {
        const net = Math.round(parseFloat(String(f.net.value).replace(',', '.')) * 100) || 0;
        const vat = Math.round(net * 0.24);
        box.querySelector('.bill-total').innerHTML = `${esc(t('bill.net'))}: <b>${esc(eur(net))}</b> · ${esc(t('bill.vat'))} 24%: <b>${esc(eur(vat))}</b> · ${esc(t('bill.total'))}: <b>${esc(eur(net + vat))}</b>`;
        return net;
      };
      f.member_limit.onchange = () => {
        f.net.value = (quoteFor(f.member_limit.value).net / 100).toFixed(2);
        total();
      };
      f.period_start.onchange = () => (f.period_end.value = yearFrom(f.period_start.value));
      f.net.oninput = total;
      total();
      box.addEventListener('click', async (e) => {
        try {
          if (e.target.closest('[data-save-sub]')) {
            const d = formData(f);
            await api(`admin/tenants/${x.id}/subscriptions`, { method: 'POST', body: { ...d, net: total() } });
            toast(t('common.saved'));
            close();
            reload();
          }
          const p = e.target.closest('[data-paid]');
          if (p) {
            await api(`admin/subscriptions/${p.dataset.paid}/paid`, { method: 'POST' });
            p.outerHTML = `<span class="pill pill-ok">${esc(fmtDate(todayIso()))}</span>`;
            reload();
          }
          const del = e.target.closest('[data-del-sub]');
          if (del) {
            if (!(await confirmDialog(t('bill.delete_confirm'), { danger: true, ok: t('common.delete') }))) return;
            await api(`admin/subscriptions/${del.dataset.delSub}`, { method: 'DELETE' });
            del.closest('tr').remove();
            reload();
          }
        } catch (err) {
          toast(errText(err), 'err');
        }
      });
    },
    actions: [{ label: t('common.close'), kind: 'ghost' }],
  });
}

function genPassword() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(r, (b) => a[b % a.length]).join('');
}

export async function adminApp(app) {
  document.title = `${t('admin.title')} · ${t('app.name')}`;
  app.innerHTML = `<div class="splash">${loading()}</div>`;
  let me;
  try {
    me = await api('admin/me');
  } catch {
    return adminLogin(app);
  }
  adminHome(app, me);
}

function adminLogin(app, error = '') {
  app.innerHTML = `
  <div class="auth">
    <div class="auth-hero" aria-hidden="true"><div class="auth-hero-inner"><span class="eyebrow">OneCode</span><h2>${esc(t('admin.hero'))}</h2><p>${esc(t('admin.hero_text'))}</p></div></div>
    <div class="auth-panel">
      <div class="auth-lang">${LANGS.map((l) => `<button class="${l === getLang() ? 'on' : ''}" data-l="${l}">${l.toUpperCase()}</button>`).join('')}</div>
      <form class="auth-form">
        <div class="auth-brand"><span class="brand-mono lg">${icon('shield')}</span><span class="eyebrow">${esc(t('admin.title'))}</span><h1>${esc(t('app.name'))}</h1></div>
        <label class="field"><span>${esc(t('auth.username'))}</span><div class="input-icon">${icon('users')}<input name="username" autocomplete="username" autocapitalize="none" required></div></label>
        <label class="field"><span>${esc(t('auth.password'))}</span><div class="input-icon">${icon('shield')}<input name="password" type="password" autocomplete="current-password" required></div></label>
        ${error ? `<p class="alert">${esc(error)}</p>` : ''}
        <button class="btn btn-primary btn-lg btn-block">${esc(t('auth.login'))}</button>
      </form>
      ${credit()}
    </div>
  </div>`;
  app.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => {
    setLang(b.dataset.l);
    adminLogin(app);
  }));
  const f = app.querySelector('form');
  f.username.focus();
  f.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('admin/login', { method: 'POST', body: formData(f) });
      adminApp(app);
    } catch (err) {
      adminLogin(app, errText(err));
    }
  };
}

async function adminHome(app, me) {
  app.innerHTML = `
  <div class="admin">
    <header class="admin-top">
      <div class="brand"><span class="brand-mono">${icon('shield')}</span><span class="brand-name">${esc(t('admin.title'))}</span></div>
      <div class="admin-top-actions">
        <div class="lang-switch">${LANGS.map((l) => `<button class="${l === getLang() ? 'on' : ''}" data-l="${l}">${l.toUpperCase()}</button>`).join('')}</div>
        <button class="btn btn-ghost btn-sm" data-out>${icon('logout')}<span class="hide-sm">${esc(t('auth.logout'))}</span></button>
      </div>
    </header>
    <main class="admin-main">
      <section class="hero-card">
        <div><span class="eyebrow">${esc(me.username)}</span><h2 class="display">${esc(t('admin.tenants'))}</h2><p class="muted">${esc(t('admin.tenants_text'))}</p></div>
        <div class="hero-actions"><button class="btn btn-primary" data-new>${icon('plus')}<span>${esc(t('admin.new_tenant'))}</span></button></div>
      </section>
      <section class="stats billing-stats"></section>
      <div class="toolbar"><div class="search">${icon('search')}<input type="search" placeholder="${esc(t('admin.search'))}"></div>
        <div class="chips">${['', 'expiring', 'lapsed', 'over', 'none'].map((f) => `<button class="chip ${f === '' ? 'on' : ''}" data-filter="${f}">${esc(t(`bill.f_${f || 'all'}`))}</button>`).join('')}</div></div>
      <ul class="rows tenant-list panel"><li class="loading"><span class="spinner"></span></li></ul>
    </main>
    ${credit()}
  </div>`;
  app.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => {
    setLang(b.dataset.l);
    adminHome(app, me);
  }));
  app.querySelector('[data-out]').onclick = async () => {
    await api('admin/logout', { method: 'POST' });
    adminLogin(app);
  };
  let tenants = [];
  let filter = '';
  const list = app.querySelector('.tenant-list');
  const match = (x) => {
    const st = x.subscription.status;
    if (filter === 'expiring') return st === 'expiring';
    if (filter === 'lapsed') return st === 'grace' || st === 'expired';
    if (filter === 'over') return x.subscription.over_limit;
    if (filter === 'none') return st === 'none';
    return true;
  };
  const draw = () => {
    const q = app.querySelector('input[type=search]').value.toLowerCase().trim();
    const shown = tenants.filter((x) => match(x) && (!q || `${x.name} ${x.key} ${x.email} ${x.admin_username}`.toLowerCase().includes(q)));
    list.innerHTML = shown.map((x) => `<li><button class="row" data-id="${x.id}">
      <span class="tx-ic">${icon('building')}</span>
      <span class="row-main"><b>${esc(x.name)} ${x.active ? '' : `<span class="pill">${esc(t('status.inactive'))}</span>`}</b>
        <small>?soc=<b>${esc(x.key)}</b> · ${esc(x.admin_username || '—')} · ${esc(fmtDate(x.created_at))}</small></span>
      <span class="row-end">${subPill(x.subscription)}<small class="${x.subscription.over_limit ? 'warn' : 'muted'}">${x.active_count}${x.member_limit ? ` / ${x.member_limit}` : ''} ${esc(t('bill.members_short'))}</small></span>
      ${icon('chevron')}</button></li>`).join('') || `<li class="muted pad">${esc(t('admin.no_tenants'))}</li>`;
  };
  const drawSummary = (sm) => {
    app.querySelector('.billing-stats').innerHTML = `
      <div class="stat"><span class="stat-label">${esc(t('bill.revenue', { year: sm.revenue.year }))}</span><span class="stat-value">${esc(eur(sm.revenue.net))}</span><span class="stat-sub">${esc(t('bill.with_vat', { amount: eur(sm.revenue.total) }))} · ${sm.revenue.n}</span></div>
      <div class="stat"><span class="stat-label">${esc(t('admin.tenants'))}</span><span class="stat-value">${sm.active}</span><span class="stat-sub">${esc(t('bill.members_total', { n: sm.members }))}</span></div>
      <div class="stat ${sm.expiring ? 'stat-attn' : ''}"><span class="stat-label">${esc(t('bill.f_expiring'))}</span><span class="stat-value">${sm.expiring}</span><span class="stat-sub">${esc(t('bill.in_30'))}</span></div>
      <div class="stat ${sm.grace + sm.expired + sm.over_limit ? 'stat-attn' : ''}"><span class="stat-label">${esc(t('bill.f_lapsed'))}</span><span class="stat-value">${sm.grace + sm.expired}</span><span class="stat-sub">${esc(t('bill.over_n', { n: sm.over_limit }))}${sm.unpaid.n ? ` · ${esc(t('bill.unpaid', { amount: eur(sm.unpaid.total) }))}` : ''}</span></div>`;
  };
  const load = async () => {
    const [tl, sm] = await Promise.all([api('admin/tenants'), api('admin/summary')]);
    tenants = tl.tenants;
    drawSummary(sm);
    draw();
  };
  app.querySelector('.toolbar .chips').onclick = (e) => {
    const c = e.target.closest('[data-filter]');
    if (!c) return;
    filter = c.dataset.filter;
    app.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('on', b === c));
    draw();
  };
  app.querySelector('input[type=search]').oninput = draw;
  app.querySelector('[data-new]').onclick = () => createTenant(load);
  list.onclick = (e) => {
    const b = e.target.closest('[data-id]');
    if (b) tenantDialog(tenants.find((x) => x.id === +b.dataset.id), load);
  };
  await load();
}

function linkBlock(link) {
  return `<div class="link-block">
    <div class="link-qr">${qrSvg(link)}</div>
    <div class="link-info"><span class="eyebrow">${esc(t('admin.tenant_link'))}</span>
      <div class="input-group"><input readonly value="${esc(link)}"><button type="button" class="btn btn-ghost" data-copy="${esc(link)}">${icon('copy')}</button></div>
      <a class="link" href="${esc(link)}" target="_blank" rel="noopener">${esc(t('admin.open_link'))} ↗</a></div>
  </div>`;
}

function bindCopy(box) {
  box.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-copy]');
    if (!c) return;
    await navigator.clipboard.writeText(c.dataset.copy).catch(() => {});
    toast(t('share.copied'));
  });
}

async function createTenant(reload) {
  const [{ key }, { tiers: pricing }] = await Promise.all([api('admin/suggest-key'), api('admin/pricing')]);
  const pw = genPassword();
  const result = await modal({
    title: t('admin.new_tenant'),
    wide: true,
    body: `<form class="form" onsubmit="return false">
      <div class="grid-2">
        <label class="field span-2"><span>${esc(t('settings.name'))} *</span><input name="name" required></label>
        <label class="field"><span>${esc(t('auth.tenant_key'))} *</span><input name="key" value="${esc(key)}" pattern="[a-z0-9-]{3,40}" autocapitalize="none" spellcheck="false"><small class="muted">${esc(t('admin.key_hint'))}</small></label>
        <label class="field"><span>${esc(t('settings.default_lang'))}</span><select name="default_lang">${LANGS.map((l) => `<option value="${l}">${esc(t(`lang.${l}`))}</option>`).join('')}</select></label>
        <label class="field"><span>${esc(t('admin.admin_username'))} *</span><input name="username" value="admin" autocapitalize="none" required></label>
        <label class="field"><span>${esc(t('auth.password'))} *</span><div class="input-group"><input name="password" value="${esc(pw)}" required minlength="8"><button type="button" class="btn btn-ghost" data-gen title="${esc(t('admin.generate'))}">${icon('sparkle')}</button></div></label>
        <label class="field"><span>${esc(t('member.email'))}</span><input name="email" type="email"></label>
        <label class="field"><span>${esc(t('member.phone'))}</span><input name="phone"></label>
        <label class="field"><span>${esc(t('settings.annual_fee'))}</span><input name="annual_fee" inputmode="decimal" placeholder="0,00"></label>
        <label class="field"><span>${esc(t('member.notes'))}</span><input name="notes"></label>
      </div>
      <h4 class="sub-title">${esc(t('bill.title'))}</h4>
      <div class="grid-2">
        <label class="field"><span>${esc(t('bill.limit'))}</span><select name="member_limit">${pricing.map((q) => `<option value="${q.member_limit}">${esc(tierLabel(q))}</option>`).join('')}<option value="">${esc(t('bill.unlimited'))}</option></select></label>
        <label class="field"><span>${esc(t('bill.paid_until'))}</span><input type="date" name="paid_until" value="${esc(yearFrom(todayIso()))}"></label>
        <label class="field"><span>${esc(t('bill.billing_email'))}</span><input type="email" name="billing_email" placeholder="${esc(t('bill.billing_email_ph'))}"></label>
        <label class="field"><span>${esc(t('bill.reference'))}</span><input name="reference" placeholder="${esc(t('bill.reference_ph'))}"></label>
      </div>
      <label class="switch"><input type="checkbox" name="record_payment"><span class="track"></span><span>${esc(t('bill.record_now'))}<small class="muted">${esc(t('bill.record_now_hint'))}</small></span></label>
      <p class="muted small">${esc(t('admin.password_note'))}</p>
    </form>`,
    onOpen: (box) => {
      box.querySelector('[data-gen]').onclick = () => (box.querySelector('[name=password]').value = genPassword());
      box.querySelector('[name=name]').focus();
    },
    actions: [
      { label: t('common.cancel'), kind: 'ghost', value: false },
      {
        label: t('admin.create'), kind: 'primary', onClick: async (box) => {
          const d = formData(box.querySelector('form'));
          const fee = parseAmount(d.annual_fee);
          d.annual_fee = Number.isNaN(fee) ? 0 : fee;
          const r = await api('admin/tenants', { method: 'POST', body: d });
          return { ...r, username: d.username, password: d.password, name: d.name };
        },
      },
    ],
  });
  if (!result) return;
  reload();
  const credsText = `${result.name}\n${t('admin.tenant_link')}: ${result.link}\n${t('auth.tenant_key')}: ${result.key}\n${t('auth.username')}: ${result.username}\n${t('auth.password')}: ${result.password}`;
  modal({
    title: t('admin.created'),
    wide: true,
    body: `<p class="lead">${esc(t('admin.created_text'))}</p>
      ${linkBlock(result.link)}
      <dl class="info-list"><div><dt>${esc(t('auth.tenant_key'))}</dt><dd><code>${esc(result.key)}</code></dd></div>
      <div><dt>${esc(t('auth.username'))}</dt><dd><code>${esc(result.username)}</code></dd></div>
      <div><dt>${esc(t('auth.password'))}</dt><dd><code>${esc(result.password)}</code></dd></div></dl>
      <button class="btn btn-ghost" data-copy="${esc(credsText)}">${icon('copy')}<span>${esc(t('admin.copy_all'))}</span></button>`,
    onOpen: bindCopy,
    actions: [{ label: t('common.done'), kind: 'primary' }],
  });
}

async function tenantDialog(x, reload) {
  const r = await modal({
    title: x.name,
    wide: true,
    body: `${linkBlock(x.link)}
    <form class="form" onsubmit="return false">
      <div class="grid-2">
        <label class="field"><span>${esc(t('settings.name'))}</span><input name="name" value="${esc(x.name)}"></label>
        <label class="field"><span>${esc(t('auth.tenant_key'))}</span><input name="key" value="${esc(x.key)}" autocapitalize="none"><small class="muted">${esc(t('admin.key_change_hint'))}</small></label>
        <label class="field"><span>${esc(t('member.email'))}</span><input name="email" value="${esc(x.email)}"></label>
        <label class="field"><span>${esc(t('member.phone'))}</span><input name="phone" value="${esc(x.phone)}"></label>
        <label class="field"><span>${esc(t('settings.default_lang'))}</span><select name="default_lang">${LANGS.map((l) => `<option value="${l}" ${x.default_lang === l ? 'selected' : ''}>${esc(t(`lang.${l}`))}</option>`).join('')}</select></label>
        <label class="field"><span>${esc(t('member.notes'))}</span><input name="notes" value="${esc(x.notes)}"></label>
      </div>
      <h4 class="sub-title">${esc(t('bill.title'))} ${subPill(x.subscription)}</h4>
      <div class="grid-2">
        <label class="field"><span>${esc(t('bill.paid_until'))}</span><input type="date" name="paid_until" value="${esc(x.paid_until || '')}"></label>
        <label class="field"><span>${esc(t('bill.limit'))}</span><input name="member_limit" type="number" min="1" value="${esc(x.member_limit ?? '')}" placeholder="${esc(t('bill.unlimited'))}"></label>
        <label class="field span-2"><span>${esc(t('bill.billing_email'))}</span><input type="email" name="billing_email" value="${esc(x.billing_email || '')}"></label>
      </div>
      <label class="switch"><input type="checkbox" name="active" ${x.active ? 'checked' : ''}><span class="track"></span><span>${esc(t('admin.active'))}<small class="muted">${esc(t('admin.active_hint'))}</small></span></label>
      <p class="muted small">${esc(t('admin.stats', { m: x.member_count, u: x.user_count }))} · ${esc(t('bill.active_members', { n: x.active_count }))}</p>
    </form>`,
    onOpen: bindCopy,
    actions: [
      { label: t('common.delete'), kind: 'danger-ghost', value: 'delete' },
      { label: t('admin.credentials'), kind: 'ghost', icon: 'key', value: 'creds' },
      { label: t('bill.subscriptions'), kind: 'ghost', icon: 'calendar', value: 'billing' },
      {
        label: t('common.save'), kind: 'primary', onClick: async (box) => {
          await api(`admin/tenants/${x.id}`, { method: 'PUT', body: formData(box.querySelector('form')) });
          toast(t('common.saved'));
          return 'saved';
        },
      },
    ],
  });
  if (r === 'saved') reload();
  if (r === 'billing') return billingDialog(x, reload);
  if (r === 'creds') {
    const pw = genPassword();
    const c = await modal({
      title: t('admin.credentials'),
      body: `<form class="form" onsubmit="return false">
        <p class="muted small">${esc(t('admin.credentials_hint'))}</p>
        <label class="field"><span>${esc(t('auth.username'))}</span><input name="username" value="${esc(x.admin_username || 'admin')}" autocapitalize="none"></label>
        <label class="field"><span>${esc(t('settings.new_password'))}</span><input name="password" value="${esc(pw)}" minlength="8"></label>
      </form>`,
      actions: [
        { label: t('common.cancel'), kind: 'ghost', value: false },
        {
          label: t('common.save'), kind: 'primary', onClick: async (box) => {
            const d = formData(box.querySelector('form'));
            await api(`admin/tenants/${x.id}/credentials`, { method: 'POST', body: d });
            return d;
          },
        },
      ],
    });
    if (c) {
      const txt = `${x.name}\n${x.link}\n${t('auth.username')}: ${c.username}\n${t('auth.password')}: ${c.password}`;
      modal({ title: t('admin.credentials_saved'), body: `<pre class="creds">${esc(txt)}</pre><button class="btn btn-ghost" data-copy="${esc(txt)}">${icon('copy')}<span>${esc(t('admin.copy_all'))}</span></button>`, onOpen: bindCopy, actions: [{ label: t('common.done'), kind: 'primary' }] });
      reload();
    }
  }
  if (r === 'delete') {
    const typed = await modal({
      title: t('admin.delete_title'),
      body: `<p class="lead">${esc(t('admin.delete_text', { name: x.name, m: x.member_count }))}</p>
        <label class="field"><span>${esc(t('admin.delete_type_key', { key: x.key }))}</span><input name="confirm_key" autocapitalize="none" autocomplete="off"></label>`,
      actions: [
        { label: t('common.cancel'), kind: 'ghost', value: false },
        {
          label: t('common.delete'), kind: 'danger', onClick: async (box) => {
            await api(`admin/tenants/${x.id}`, { method: 'DELETE', body: { confirm_key: box.querySelector('[name=confirm_key]').value.trim() } });
            return true;
          },
        },
      ],
    });
    if (typed) {
      toast(t('admin.deleted'));
      reload();
    }
  }
  void confirmDialog;
}
