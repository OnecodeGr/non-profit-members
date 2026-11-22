import { t } from '../i18n.js';
import { api, esc, icon, toast, errText, can, empty, parseAmount, state } from '../core.js';
import { setPage } from '../main.js';
import { downloadBlob } from '../print.js';

export const FIELDS = [
  'member_no', 'last_name', 'first_name', 'father_name', 'phone', 'email', 'address', 'city', 'postal_code',
  'birth_date', 'id_number', 'join_date', 'membership_type', 'status', 'notes', 'initial_balance',
];

const SYNONYMS = {
  member_no: ['member_no', 'no', 'number', 'αμ', 'α/μ', 'αρ. μητρώου', 'αριθμός μητρώου', 'αριθμός μέλους', 'αρ. μέλους', 'αριθμος', 'κωδικός', 'numéro', 'n°', 'numero', 'membre n°'],
  last_name: ['last_name', 'last name', 'surname', 'lastname', 'επώνυμο', 'επωνυμο', 'nom'],
  first_name: ['first_name', 'first name', 'firstname', 'name', 'όνομα', 'ονομα', 'prénom', 'prenom'],
  father_name: ['father_name', 'father', "father's name", 'πατρώνυμο', 'πατρωνυμο', 'όνομα πατρός', 'ονομα πατρος', 'nom du père'],
  phone: ['phone', 'mobile', 'telephone', 'tel', 'τηλέφωνο', 'τηλεφωνο', 'κινητό', 'κινητο', 'τηλ', 'téléphone', 'portable'],
  email: ['email', 'e-mail', 'mail', 'courriel'],
  address: ['address', 'street', 'διεύθυνση', 'διευθυνση', 'οδός', 'adresse'],
  city: ['city', 'town', 'πόλη', 'πολη', 'ville'],
  postal_code: ['postal_code', 'zip', 'postcode', 'postal code', 'τκ', 'τ.κ.', 'ταχ. κώδικας', 'ταχυδρομικός κώδικας', 'code postal'],
  birth_date: ['birth_date', 'birthdate', 'date of birth', 'dob', 'ημερομηνία γέννησης', 'ημ. γέννησης', 'γέννηση', 'date de naissance'],
  id_number: ['id_number', 'id', 'id number', 'αδτ', 'α.δ.τ.', 'αρ. ταυτότητας', 'ταυτότητα', 'cni', "pièce d'identité"],
  join_date: ['join_date', 'joined', 'member since', 'ημερομηνία εγγραφής', 'εγγραφή', 'ημ. εγγραφής', "date d'adhésion", 'adhésion'],
  membership_type: ['membership_type', 'type', 'category', 'κατηγορία', 'κατηγορια', 'τύπος', 'τύπος μέλους', 'catégorie'],
  status: ['status', 'κατάσταση', 'κατασταση', 'statut'],
  notes: ['notes', 'comments', 'σημειώσεις', 'σημειωσεις', 'παρατηρήσεις', 'remarques'],
  initial_balance: ['initial_balance', 'balance', 'opening balance', 'αρχικό υπόλοιπο', 'υπόλοιπο', 'οφειλή', 'solde', 'solde initial'],
};

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\s.]+/g, ' ').trim();

function guessField(header) {
  const h = norm(header);
  for (const [f, list] of Object.entries(SYNONYMS)) if (list.some((x) => norm(x) === h)) return f;
  for (const [f, list] of Object.entries(SYNONYMS)) if (list.some((x) => norm(x).length > 3 && h.includes(norm(x)))) return f;
  return '';
}

export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/)[0] || '';
  const delim = [';', ',', '\t'].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => String(v).trim()));
}

function decode(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1253').decode(buf); // Greek Excel default
  }
}

function toIso(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += y > 40 ? 1900 : 2000;
    return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  return null;
}

function normStatus(v) {
  const s = norm(v);
  if (!s) return 'active';
  if (['inactive', 'ανενεργο', 'ανενεργος', 'inactif', 'no', 'οχι', '0'].includes(s)) return 'inactive';
  return 'active';
}

export async function importView(el, _p) {
  setPage(t('nav.import'));
  if (!can('admin')) return (el.innerHTML = empty(t('err.forbidden'), 'shield'));
  el.innerHTML = `
  <section class="panel intro">
    <span class="eyebrow">${esc(t('import.eyebrow'))}</span>
    <h2 class="display">${esc(t('import.title'))}</h2>
    <p class="muted">${esc(t('import.text'))}</p>
    <button class="btn btn-ghost btn-sm" data-template>${icon('download')}<span>${esc(t('import.template'))}</span></button>
  </section>
  <label class="dropzone panel">
    ${icon('upload')}
    <b>${esc(t('import.drop'))}</b>
    <small class="muted">${esc(t('import.drop_hint'))}</small>
    <input type="file" accept=".csv,text/csv,text/plain" hidden>
  </label>
  <div class="import-step"></div>`;

  el.querySelector('[data-template]').onclick = () => {
    const headers = FIELDS.map((f) => t(`field.${f}`));
    const sample = ['1', 'Παπαδόπουλος', 'Γιώργος', 'Νικόλαος', '6900000000', 'g.pap@example.com', 'Ερμού 1', 'Αθήνα', '10563', '15/03/1980', 'ΑΒ123456', '01/01/2020', state.me.types[0]?.name || '', t('status.active'), '', '30,00'];
    downloadBlob(new Blob([`﻿${headers.join(';')}\r\n${sample.join(';')}\r\n`], { type: 'text/csv;charset=utf-8' }), 'members-template.csv');
  };

  const step = el.querySelector('.import-step');
  el.querySelector('input[type=file]').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const rows = parseCsv(decode(await file.arrayBuffer()));
    if (rows.length < 2) return toast(t('import.empty_file'), 'err');
    const headers = rows[0];
    const data = rows.slice(1);
    const mapping = headers.map(guessField);
    drawMapping(step, headers, data, mapping, file.name);
  };
}

function drawMapping(step, headers, data, mapping, filename) {
  step.innerHTML = `
  <section class="panel">
    <div class="panel-head"><h2>${esc(t('import.mapping'))}</h2><span class="muted small">${esc(filename)} · ${esc(t('import.rows', { n: data.length }))}</span></div>
    <p class="muted small pad-x">${esc(t('import.mapping_hint'))}</p>
    <div class="table-scroll"><table class="table map-table">
      <thead><tr>${headers.map((h, i) => `<th><select data-col="${i}"><option value="">${esc(t('import.ignore'))}</option>${FIELDS.map((f) => `<option value="${f}" ${mapping[i] === f ? 'selected' : ''}>${esc(t(`field.${f}`))}</option>`).join('')}</select><small>${esc(h)}</small></th>`).join('')}</tr></thead>
      <tbody>${data.slice(0, 5).map((r) => `<tr>${headers.map((_, i) => `<td>${esc(r[i] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <div class="form import-opts">
      <div class="field"><span>${esc(t('import.existing'))}</span>
        <div class="seg"><label><input type="radio" name="mode" value="skip" checked><span>${esc(t('import.skip'))}</span></label>
        <label><input type="radio" name="mode" value="update"><span>${esc(t('import.update'))}</span></label></div></div>
      <p class="muted small">${esc(t('import.balance_hint'))}</p>
      <div class="form-actions"><button class="btn btn-primary btn-lg" data-run>${icon('upload')}<span>${esc(t('import.run', { n: data.length }))}</span></button></div>
    </div>
    <div class="progress" hidden><span></span></div>
    <div class="import-report"></div>
  </section>`;

  step.querySelectorAll('[data-col]').forEach((s) => (s.onchange = () => (mapping[+s.dataset.col] = s.value)));
  step.querySelector('[data-run]').onclick = async (ev) => {
    const btn = ev.currentTarget;
    if (!mapping.includes('last_name') || !mapping.includes('first_name')) return toast(t('import.need_names'), 'err');
    const errors = [];
    const rows = [];
    data.forEach((r, idx) => {
      const o = {};
      mapping.forEach((f, i) => {
        if (f) o[f] = String(r[i] ?? '').trim();
      });
      for (const df of ['birth_date', 'join_date']) {
        if (o[df] !== undefined) {
          const iso = toIso(o[df]);
          if (iso === null) {
            errors.push({ row: idx + 2, error: `${t(`field.${df}`)}: ${o[df]}` });
            o[df] = '';
          } else o[df] = iso;
        }
      }
      if (o.status !== undefined) o.status = normStatus(o.status);
      if (o.initial_balance !== undefined) {
        const c = parseAmount(o.initial_balance);
        if (Number.isNaN(c)) {
          errors.push({ row: idx + 2, error: `${t('field.initial_balance')}: ${o.initial_balance}` });
          delete o.initial_balance;
        } else if (o.initial_balance === '') delete o.initial_balance;
        else o.initial_balance = c;
      }
      if (o.member_no && !/^\d+$/.test(o.member_no)) {
        errors.push({ row: idx + 2, error: `${t('field.member_no')}: ${o.member_no}` });
        delete o.member_no;
      }
      rows.push(o);
    });
    btn.disabled = true;
    const mode = step.querySelector('[name=mode]:checked').value;
    const prog = step.querySelector('.progress');
    prog.hidden = false;
    const total = { created: 0, updated: 0, skipped: 0, errors: [...errors] };
    try {
      for (let i = 0; i < rows.length; i += 200) {
        const r = await api('members/import', { method: 'POST', body: { rows: rows.slice(i, i + 200), mode, offset: i + 1 } });
        total.created += r.created;
        total.updated += r.updated;
        total.skipped += r.skipped;
        total.errors.push(...r.errors.map((x) => ({ ...x, row: x.row + 1 })));
        prog.firstElementChild.style.width = `${Math.round(((i + 200) / rows.length) * 100)}%`;
      }
      const me = await api('me');
      state.me.types = me.types;
      step.querySelector('.import-report').innerHTML = `
        <div class="report-ok">${icon('check')}<div><b>${esc(t('import.done'))}</b>
        <p>${esc(t('import.summary', { created: total.created, updated: total.updated, skipped: total.skipped }))}</p></div></div>
        ${total.errors.length ? `<details class="errors"><summary>${esc(t('import.errors', { n: total.errors.length }))}</summary><ul>${total.errors.map((x) => `<li>${esc(t('import.row', { n: x.row }))}: ${esc(x.error.startsWith?.('name_required') ? t('err.name_required') : x.error)}</li>`).join('')}</ul></details>` : ''}
        <a class="btn btn-ghost" href="#/members">${icon('users')}<span>${esc(t('nav.members'))}</span></a>`;
      toast(t('import.done'));
    } catch (err) {
      toast(errText(err), 'err');
      btn.disabled = false;
    }
  };
}
