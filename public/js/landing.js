// Landing page behaviour: sign-in, price calculator, contact form (Turnstile), suggestion channels.
(function () {
  const { i18n, cfg } = window.LP || { i18n: {}, cfg: {} };
  const $ = (s, r = document) => r.querySelector(s);
  const fmt = (n) => new Intl.NumberFormat(i18n.lang === 'en' ? 'en-IE' : i18n.lang === 'fr' ? 'fr-FR' : 'el-GR', { style: 'currency', currency: 'EUR' }).format(n);
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* ignore */ } return null; };

  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
    let data = {};
    try { data = await r.json(); } catch (e) { /* empty */ }
    if (!r.ok) throw Object.assign(new Error(data.error || 'error'), { code: data.error });
    return data;
  }

  // ---- sign in ----
  const login = $('.lp-login');
  if (login) {
    const last = store('last_tenant');
    if (last) login.tenant_key.value = last;
    login.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = $('.alert', login);
      alert.hidden = true;
      const d = { tenant_key: login.tenant_key.value.trim().toLowerCase(), username: login.username.value.trim(), password: login.password.value };
      if (!d.tenant_key || !d.username || !d.password) { alert.textContent = i18n.err_fill; alert.hidden = false; return; }
      const btn = $('[type=submit]', login);
      btn.classList.add('busy');
      try {
        await post('/api/login', d);
        store('last_tenant', d.tenant_key);
        if (!store('lang')) store('lang', i18n.lang);
        location.href = '/app';
      } catch (err) {
        alert.textContent = err.code === 'too_many_attempts' ? i18n.err_many : err.code === 'tenant_inactive' ? i18n.err_inactive : i18n.err_login;
        alert.hidden = false;
        btn.classList.remove('busy');
      }
    });
  }

  // ---- price calculator ----
  const range = $('[data-calc]');
  const price = (n) => (n <= 100 ? 35 : n <= 500 ? 90 : 90 + Math.ceil((n - 500) / 200) * 10);
  function calc() {
    const n = +range.value;
    const net = price(n);
    $('[data-calc-n]').textContent = n.toLocaleString();
    $('[data-calc-out]').textContent = `${fmt(net)} ${i18n.per_year}`;
    $('[data-calc-vat]').textContent = `${i18n.vat} · ${fmt(Math.round(net * 124) / 100)} ${i18n.total}`;
    range.style.setProperty('--p', `${((n - range.min) / (range.max - range.min)) * 100}%`);
  }
  if (range) { range.addEventListener('input', calc); calc(); }

  // ---- contact form ----
  const form = $('.lp-form');
  let tsWidget = null;
  function renderTurnstile() {
    const box = $('.ts', form);
    if (!box || !box.dataset.sitekey || !window.turnstile || tsWidget !== null) return;
    tsWidget = window.turnstile.render(box, { sitekey: box.dataset.sitekey, theme: 'auto', language: i18n.lang });
  }
  if (form) {
    const wait = setInterval(() => { if (window.turnstile) { clearInterval(wait); renderTurnstile(); } }, 300);
    setTimeout(() => clearInterval(wait), 20000);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = $('.alert', form), ok = $('.lp-ok', form);
      alert.hidden = true;
      const d = Object.fromEntries(new FormData(form));
      if (!d.name.trim() || !d.email.trim() || !d.message.trim() || !form.email.checkValidity()) { alert.textContent = i18n.err_fill; alert.hidden = false; return; }
      d.turnstile = window.turnstile && tsWidget !== null ? window.turnstile.getResponse(tsWidget) : '';
      d.lang = i18n.lang;
      const btn = $('[type=submit]', form);
      btn.classList.add('busy');
      try {
        await post('/api/public/contact', d);
        form.reset();
        ok.textContent = i18n.f_sent;
        ok.hidden = false;
        [...form.querySelectorAll('.field, .lp-form-foot, .ts')].forEach((x) => (x.hidden = true));
      } catch (err) {
        alert.textContent = i18n.f_error;
        alert.hidden = false;
        if (window.turnstile && tsWidget !== null) window.turnstile.reset(tsWidget);
      } finally {
        btn.classList.remove('busy');
      }
    });
  }

  // ---- suggestions ----
  const dlg = $('[data-suggest-dialog]');
  const ch = $('[data-channels]');
  if (dlg && ch) {
    const text = encodeURIComponent(i18n.suggest_msg);
    const links = [];
    if (cfg.whatsapp) links.push(['WhatsApp', `https://wa.me/${cfg.whatsapp}?text=${text}`]);
    if (cfg.viber) links.push(['Viber', `viber://chat?number=${encodeURIComponent(cfg.viber)}`]);
    if (cfg.telegram) links.push(['Telegram', `https://t.me/${cfg.telegram}`]);
    links.push(['Email', `mailto:${cfg.email}?subject=${encodeURIComponent('Members — suggestion')}&body=${text}`]);
    ch.innerHTML = links.map(([n, h]) => `<a class="lp-channel" href="${h}" target="_blank" rel="noopener">${n}</a>`).join('');
    $('[data-suggest]').addEventListener('click', () => (dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '')));
  }

  // ---- nav shadow ----
  const nav = $('.lp-nav');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), { passive: true });
})();
