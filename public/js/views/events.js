// Events & general assemblies: QR check-in, manual add, live quorum, attendance list and signature sheet.
import { t } from '../i18n.js';
import {
  api, esc, icon, fmtDate, fmtDateTime, fullName, can, go, toast, errText, formData, debounce, avatar, balanceBadge,
  todayIso, empty, modal, confirmDialog, state,
} from '../core.js';
import { setPage } from '../main.js';
import { startScanner } from '../scanner.js';
import { shareSheet } from '../print.js';

export async function events(el, _p, stale) {
  setPage(t('nav.events'), {
    actions: can('staff') ? `<button class="btn btn-primary btn-sm" data-new aria-label="${esc(t('ev.new'))}">${icon('plus')}<span class="hide-sm">${esc(t('ev.new'))}</span></button>` : '',
  });
  const { events: list } = await api('events');
  if (stale()) return;
  const upcoming = list.filter((e) => e.date >= todayIso());
  const past = list.filter((e) => e.date < todayIso());
  const row = (e) => `<li><a class="row" href="#/events/${e.id}">
    <span class="date-chip"><b>${esc(e.date.slice(8, 10))}</b><small>${esc(new Date(`${e.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' }))}</small></span>
    <span class="row-main"><b>${esc(e.title)}</b><small>${esc(t(`ev.kind_${e.kind}`))}${e.location ? ` · ${esc(e.location)}` : ''}${e.closed ? ` · ${esc(t('ev.closed'))}` : ''}</small></span>
    <span class="row-end"><b>${e.present}</b><small class="muted">${esc(t('ev.present'))}</small></span></a></li>`;
  el.innerHTML = `
    <section class="panel intro">
      <span class="eyebrow">${esc(t('ev.eyebrow'))}</span>
      <h2 class="display">${esc(t('ev.title'))}</h2>
      <p class="muted">${esc(t('ev.text'))}</p>
    </section>
    ${list.length ? `
    ${upcoming.length ? `<section class="panel"><div class="panel-head"><h2>${esc(t('ev.upcoming'))}</h2></div><ul class="rows">${upcoming.reverse().map(row).join('')}</ul></section>` : ''}
    ${past.length ? `<section class="panel"><div class="panel-head"><h2>${esc(t('ev.past'))}</h2></div><ul class="rows">${past.map(row).join('')}</ul></section>` : ''}`
    : empty(t('ev.empty'), 'calendar')}`;
  const nb = document.querySelector('[data-new]');
  if (nb) nb.onclick = () => eventForm(null);
}

async function eventForm(ev) {
  const r = await modal({
    title: ev ? t('ev.edit') : t('ev.new'),
    body: `<form class="form" onsubmit="return false">
      <label class="field"><span>${esc(t('ev.f_title'))} *</span><input name="title" value="${esc(ev?.title || '')}" required placeholder="${esc(t('ev.f_title_ph'))}"></label>
      <div class="grid-2">
        <label class="field"><span>${esc(t('tx.date'))}</span><input type="date" name="date" value="${esc(ev?.date || todayIso())}"></label>
        <label class="field"><span>${esc(t('ev.f_location'))}</span><input name="location" value="${esc(ev?.location || '')}"></label>
      </div>
      <div class="seg" role="radiogroup">
        <label><input type="radio" name="kind" value="event" ${ev?.kind !== 'assembly' ? 'checked' : ''}><span>${esc(t('ev.kind_event'))}</span></label>
        <label><input type="radio" name="kind" value="assembly" ${ev?.kind === 'assembly' ? 'checked' : ''}><span>${esc(t('ev.kind_assembly'))}</span></label>
      </div>
      <div class="assembly-opts">
        <label class="field"><span>${esc(t('ev.f_quorum'))}</span><input name="quorum_percent" type="number" min="1" max="100" value="${esc(ev?.quorum_percent ?? 50)}"></label>
        <label class="switch"><input type="checkbox" name="only_good_standing" ${ev?.only_good_standing ? 'checked' : ''}><span class="track"></span><span>${esc(t('ev.f_good'))}<small class="muted">${esc(t('ev.f_good_hint'))}</small></span></label>
      </div>
      <label class="field"><span>${esc(t('member.notes'))}</span><textarea name="notes" rows="2">${esc(ev?.notes || '')}</textarea></label>
    </form>`,
    onOpen: (box) => {
      const sync = () => (box.querySelector('.assembly-opts').hidden = box.querySelector('[name=kind]:checked').value !== 'assembly');
      box.querySelectorAll('[name=kind]').forEach((r2) => (r2.onchange = sync));
      sync();
    },
    actions: [
      { label: t('common.cancel'), kind: 'ghost', value: false },
      {
        label: t('common.save'), kind: 'primary', onClick: async (box) => {
          const d = formData(box.querySelector('form'));
          if (!d.title.trim()) {
            toast(t('err.title_required'), 'err');
            return false;
          }
          const res = await api(ev ? `events/${ev.id}` : 'events', { method: ev ? 'PUT' : 'POST', body: d });
          return res.event?.id || ev.id;
        },
      },
    ],
  });
  if (r) go(`/events/${r}`);
}

export async function eventDetail(el, { id }, stale) {
  let data = await api(`events/${id}`);
  if (stale()) return;
  const ev = data.event;
  const assembly = ev.kind === 'assembly';
  setPage(ev.title, {
    back: '#/events',
    actions: can('staff') ? `<button class="icon-btn" data-edit title="${esc(t('common.edit'))}" aria-label="${esc(t('common.edit'))}">${icon('edit')}</button>` : '',
  });
  el.innerHTML = `
  <section class="panel event-head">
    <div>
      <span class="eyebrow">${esc(t(`ev.kind_${ev.kind}`))} · ${esc(fmtDate(ev.date))}${ev.location ? ` · ${esc(ev.location)}` : ''}</span>
      <h2 class="display">${esc(ev.title)}</h2>
      ${ev.notes ? `<p class="muted">${esc(ev.notes)}</p>` : ''}
    </div>
    <div class="quorum"></div>
    <div class="action-bar">
      ${can('staff') && !ev.closed ? `<button class="btn btn-primary" data-scan>${icon('scan')}<span>${esc(t('ev.checkin'))}</span></button>
        <button class="btn btn-ghost" data-manual>${icon('plus')}<span>${esc(t('ev.manual'))}</span></button>` : ''}
      <button class="btn btn-ghost" data-list>${icon('list')}<span>${esc(t('ev.attendance_list'))}</span></button>
      <button class="btn btn-ghost" data-sheet>${icon('edit')}<span>${esc(t('ev.sheet'))}</span></button>
      ${can('staff') ? `<button class="btn btn-ghost" data-close>${icon(ev.closed ? 'clock' : 'check')}<span>${esc(ev.closed ? t('ev.reopen') : t('ev.close'))}</span></button>` : ''}
    </div>
  </section>
  <section class="checkin" hidden>
    <div class="checkin-grid">
      <div class="scan-host"></div>
      <div class="checkin-side">
        <form class="scan-manual"><label class="field"><span>${esc(t('scan.manual'))}</span>
          <div class="input-group"><input name="code" inputmode="numeric" placeholder="${esc(t('scan.manual_placeholder'))}" autocomplete="off"><button class="btn btn-primary">${icon('check')}</button></div></label></form>
        <div class="scan-result" aria-live="polite"></div>
      </div>
    </div>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>${esc(t('ev.attendees'))} <span class="pill">${data.attendees.length}</span></h2></div>
    <ul class="rows attendees"></ul>
  </section>
  ${can('admin') ? `<div class="danger-zone"><span></span><button class="btn btn-danger-ghost btn-sm" data-delete>${icon('trash')}<span>${esc(t('ev.delete'))}</span></button></div>` : ''}`;

  const drawStats = () => {
    const s = data.stats;
    const pct = s.eligible ? Math.min(100, Math.round((s.present_eligible / s.eligible) * 100)) : 0;
    el.querySelector('.quorum').innerHTML = assembly ? `
      <div class="quorum-box ${s.quorum_met ? 'met' : ''}">
        <span class="eyebrow">${esc(t('ev.quorum'))} · ${ev.quorum_percent}%</span>
        <span class="quorum-value">${s.present_eligible}<small> / ${s.required}</small></span>
        <span class="quorum-verdict">${icon(s.quorum_met ? 'check' : 'clock')} ${esc(s.quorum_met ? t('ev.quorum_met') : t('ev.quorum_missing', { n: Math.max(0, s.required - s.present_eligible) }))}</span>
        <span class="meter"><span style="width:${pct}%"></span><i style="left:${ev.quorum_percent}%"></i></span>
        <small class="muted">${esc(t('ev.eligible_info', { n: s.eligible }))}${ev.only_good_standing ? ` · ${esc(t('ev.f_good'))}` : ''}</small>
      </div>` : `
      <div class="quorum-box met"><span class="eyebrow">${esc(t('ev.present'))}</span><span class="quorum-value">${s.present}</span>
        <small class="muted">${esc(t('ev.of_active', { n: s.eligible }))}</small></div>`;
    el.querySelector('.attendees').innerHTML = data.attendees.length ? data.attendees.map((a) => `<li class="row">
      ${avatar(a)}<span class="row-main"><b>${esc(fullName(a))}</b><small>№ ${a.member_no} · ${esc(fmtDateTime(a.checked_at))} · ${esc(t(`ev.method_${a.method}`))}${a.checked_by_name ? ` · ${esc(a.checked_by_name)}` : ''}</small></span>
      <span class="row-end">${assembly && !a.eligible ? `<span class="pill pill-warn">${esc(t('ev.not_eligible'))}</span>` : ''}
      ${can('staff') && !ev.closed ? `<button class="icon-btn no" data-remove="${a.member_id}" title="${esc(t('common.remove'))}">${icon('x')}</button>` : ''}</span></li>`).join('')
      : `<li class="muted pad">${esc(t('ev.none_yet'))}</li>`;
    el.querySelector('.panel-head .pill').textContent = data.attendees.length;
  };
  drawStats();

  // Keep in sync with other devices checking people in.
  const poll = setInterval(async () => {
    if (!document.body.contains(el)) return clearInterval(poll);
    try {
      const fresh = await api(`events/${id}`);
      if (fresh.attendees.length !== data.attendees.length) {
        data = fresh;
        drawStats();
      }
    } catch { /* ignore */ }
  }, 8000);

  const result = el.querySelector('.scan-result');
  let busy = false;
  const checkin = async (payload) => {
    if (busy) return;
    busy = true;
    try {
      const r = await api(`events/${id}/checkin`, { method: 'POST', body: payload });
      data = { event: ev, attendees: r.attendees, stats: r.stats };
      drawStats();
      const m = r.member;
      const cls = r.duplicate ? 'warnc' : assembly && !r.eligible ? 'bad' : 'good';
      result.innerHTML = `<div class="scan-card ${cls}"><div class="scan-card-head">${avatar(m, 'lg')}<div>
        <span class="eyebrow">№ ${esc(m.member_no)}</span><h3>${esc(fullName(m))}</h3>
        <span class="verdict">${icon(r.duplicate ? 'clock' : cls === 'good' ? 'check' : 'x')} ${esc(r.duplicate ? t('ev.already') : assembly && !r.eligible ? t('ev.checked_not_eligible') : t('ev.welcome'))}</span>
        ${assembly && !r.eligible ? `<div class="small">${balanceBadge(m.balance)}</div>` : ''}</div></div></div>`;
    } catch (e) {
      result.innerHTML = `<div class="scan-card bad"><p>${icon('x')} ${esc(errText(e))}</p></div>`;
    } finally {
      setTimeout(() => (busy = false), 600);
    }
  };

  let stopScan = null;
  el.onclick = async (e) => {
    if (e.target.closest('[data-scan]')) {
      const box = el.querySelector('.checkin');
      box.hidden = !box.hidden;
      if (!box.hidden && !stopScan) stopScan = startScanner(box.querySelector('.scan-host'), (code) => checkin({ code }));
      if (box.hidden && stopScan) {
        stopScan();
        stopScan = null;
        box.querySelector('.scan-host').innerHTML = '';
      }
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (e.target.closest('[data-manual]')) manualAdd(id, (memberId) => checkin({ member_id: memberId }));
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      if (!(await confirmDialog(t('ev.remove_confirm')))) return;
      await api(`events/${id}/attendance/${rm.dataset.remove}`, { method: 'DELETE' });
      data = await api(`events/${id}`);
      drawStats();
    }
    if (e.target.closest('[data-list]')) {
      shareSheet({ title: `${t('ev.attendance_list')} · ${ev.title}`, spec: attendanceSpec(ev, data) });
    }
    if (e.target.closest('[data-sheet]')) {
      const sh = await api(`events/${id}/sheet`);
      shareSheet({ title: `${t('ev.sheet')} · ${ev.title}`, spec: signatureSpec(ev, sh.members) });
    }
    if (e.target.closest('[data-close]')) {
      await api(`events/${id}`, { method: 'PUT', body: { closed: !ev.closed } });
      eventDetail(el, { id }, stale);
    }
    if (e.target.closest('[data-delete]')) {
      if (!(await confirmDialog(t('ev.delete_confirm'), { danger: true, ok: t('common.delete') }))) return;
      await api(`events/${id}`, { method: 'DELETE' });
      go('/events');
    }
  };
  const editBtn = document.querySelector('.top-actions [data-edit]');
  if (editBtn) editBtn.onclick = () => eventForm(ev);
  el.querySelector('.scan-manual').onsubmit = (e) => {
    e.preventDefault();
    const code = e.target.code.value.trim();
    if (code) checkin({ code });
    e.target.code.value = '';
  };
}

function manualAdd(eventId, onPick) {
  modal({
    title: t('ev.manual'),
    body: `<div class="search">${icon('search')}<input data-q placeholder="${esc(t('member.search'))}" autocomplete="off"></div><ul class="rows suggest"></ul>`,
    onOpen: (box, close) => {
      const input = box.querySelector('[data-q]');
      const ul = box.querySelector('.suggest');
      input.focus();
      input.oninput = debounce(async () => {
        if (!input.value.trim()) return (ul.innerHTML = '');
        const r = await api('members', { query: { q: input.value.trim(), limit: 10 } });
        ul.innerHTML = r.members.map((m) => `<li><button class="row" data-pick="${m.id}">${avatar(m)}<span class="row-main"><b>${esc(fullName(m))}</b><small>№ ${m.member_no}</small></span>${balanceBadge(m.balance)}</button></li>`).join('')
          || `<li class="muted pad">${esc(t('member.no_results'))}</li>`;
      }, 200);
      ul.onclick = (e) => {
        const b = e.target.closest('[data-pick]');
        if (!b) return;
        onPick(+b.dataset.pick);
        close();
      };
    },
  });
}

function attendanceSpec(ev, data) {
  const s = data.stats;
  return {
    title: t('ev.attendance_list'),
    subtitle: [`${ev.title} · ${fmtDate(ev.date)}${ev.location ? ` · ${ev.location}` : ''}`],
    columns: [
      { label: '#', w: 0.35 },
      { label: t('member.no_short'), w: 0.5 },
      { label: t('member.name'), w: 2 },
      { label: t('ev.time'), w: 1.1 },
      ...(ev.kind === 'assembly' ? [{ label: t('ev.eligible_col'), w: 0.8 }] : []),
    ],
    rows: data.attendees.slice().reverse().map((a, i) => [i + 1, a.member_no, fullName(a), fmtDateTime(a.checked_at), ...(ev.kind === 'assembly' ? [a.eligible ? '✓' : '—'] : [])]),
    totals: ev.kind === 'assembly'
      ? [[t('ev.present'), String(s.present)], [t('ev.eligible_present'), String(s.present_eligible)], [t('ev.required'), `${s.required} (${ev.quorum_percent}% · ${s.eligible})`], [t('ev.quorum'), s.quorum_met ? t('ev.quorum_met') : t('ev.quorum_not_met')]]
      : [[t('ev.present'), String(s.present)]],
    filename: `${t('ev.attendance_list')}_${ev.date}`,
  };
}

function signatureSpec(ev, members) {
  return {
    title: t('ev.sheet'),
    subtitle: [`${ev.title} · ${fmtDate(ev.date)}${ev.location ? ` · ${ev.location}` : ''}`, t('ev.sheet_sub', { n: members.length })],
    columns: [
      { label: t('member.no_short'), w: 0.5 },
      { label: t('member.name'), w: 2 },
      { label: t('ev.present_col'), w: 0.7 },
      { label: t('ev.signature'), w: 2 },
    ],
    rows: members.map((m) => [m.member_no, fullName(m), m.checked_at ? '✓' : '', '']),
    note: `${state.me.tenant.name} · ${t('ev.sheet_note')}`,
    tall: true,
    filename: `${t('ev.sheet')}_${ev.date}`,
  };
}
