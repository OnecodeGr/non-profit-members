// Demo organisations: nightly reset to a fresh, realistic sample dataset.
// Same data every night (seeded random), with dates relative to the reset day so the demo always looks current.
import { now, randomToken, hashPassword } from './util.js';
import { audit } from './audit.js';

// ---------- deterministic random ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- sample content per language ----------
const DATA = {
  el: {
    male: ['Γιώργος', 'Νίκος', 'Κώστας', 'Δημήτρης', 'Γιάννης', 'Παναγιώτης', 'Βασίλης', 'Χρήστος', 'Αντώνης', 'Μιχάλης', 'Σπύρος', 'Θανάσης', 'Στέλιος', 'Λευτέρης', 'Άγγελος', 'Μανώλης'],
    female: ['Μαρία', 'Ελένη', 'Κατερίνα', 'Βασιλική', 'Σοφία', 'Αγγελική', 'Δήμητρα', 'Γεωργία', 'Ευαγγελία', 'Χριστίνα', 'Αναστασία', 'Ιωάννα', 'Δέσποινα', 'Ειρήνη', 'Φωτεινή', 'Αλεξάνδρα'],
    // [male form, female form]
    surnames: [['Παπαδόπουλος', 'Παπαδοπούλου'], ['Νικολάου', 'Νικολάου'], ['Γεωργίου', 'Γεωργίου'], ['Παπαδάκης', 'Παπαδάκη'], ['Βλάχος', 'Βλάχου'],
      ['Οικονόμου', 'Οικονόμου'], ['Αλεξίου', 'Αλεξίου'], ['Μαυρίδης', 'Μαυρίδου'], ['Κωνσταντίνου', 'Κωνσταντίνου'], ['Δημητρίου', 'Δημητρίου'],
      ['Καραγιάννης', 'Καραγιάννη'], ['Μακρής', 'Μακρή'], ['Αθανασίου', 'Αθανασίου'], ['Ιωαννίδης', 'Ιωαννίδου'], ['Πετρόπουλος', 'Πετροπούλου'],
      ['Σταματόπουλος', 'Σταματοπούλου'], ['Χατζής', 'Χατζή'], ['Λαμπρόπουλος', 'Λαμπροπούλου'], ['Αντωνίου', 'Αντωνίου'], ['Ζαφειρίου', 'Ζαφειρίου']],
    fathers: ['Ιωάννης', 'Νικόλαος', 'Γεώργιος', 'Δημήτριος', 'Κωνσταντίνος', 'Αθανάσιος', 'Παναγιώτης', 'Χρήστος'],
    streets: ['Ερμού', 'Αθηνάς', 'Πατησίων', 'Σόλωνος', 'Ακαδημίας', 'Κηφισίας', 'Αγίου Δημητρίου', 'Ελευθερίου Βενιζέλου', 'Παπαναστασίου', 'Ολυμπίου Διός'],
    cities: [['Αθήνα', '105'], ['Θεσσαλονίκη', '546'], ['Πάτρα', '262'], ['Ηράκλειο', '712'], ['Λάρισα', '412'], ['Βόλος', '382'], ['Ιωάννινα', '452']],
    types: [['Τακτικό μέλος', 3000], ['Φοιτητής / Νέος', 1000], ['Επίτιμο μέλος', 0]],
    dues: (y) => `Συνδρομή ${y}`,
    opening: 'Υπόλοιπο έναρξης',
    trip: 'Εκδρομή στο Ναύπλιο',
    credit: 'Επιστροφή προκαταβολής',
    note: 'Κατάθεση από e-banking',
    events: { xmas: 'Χριστουγεννιάτικη γιορτή', agm: 'Τακτική Γενική Συνέλευση', concert: 'Συναυλία παραδοσιακής μουσικής', next: 'Έκτακτη Γενική Συνέλευση', place: 'Αίθουσα του Συλλόγου', theatre: 'Δημοτικό Θέατρο' },
    profile: { address: 'Ερμού 1, 105 63 Αθήνα', phone: '210 0000000', bank_name: 'Τράπεζα (δείγμα)', bank_beneficiary: 'Σύλλογος (δείγμα)', card_note: 'Ισχύει με αστυνομική ταυτότητα' },
  },
  en: {
    male: ['James', 'Oliver', 'Thomas', 'Daniel', 'Harry', 'George', 'Samuel', 'William', 'Michael', 'David', 'Peter', 'Andrew'],
    female: ['Emily', 'Sophie', 'Charlotte', 'Grace', 'Olivia', 'Amelia', 'Lucy', 'Hannah', 'Sarah', 'Rachel', 'Emma', 'Jessica'],
    surnames: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Hughes', 'Green', 'Hall'].map((s) => [s, s]),
    fathers: [],
    streets: ['High Street', 'Station Road', 'Church Lane', 'Park Avenue', 'Mill Road', 'Victoria Road', 'Queen Street', 'King Street'],
    cities: [['London', 'N1'], ['Manchester', 'M1'], ['Bristol', 'BS1'], ['Leeds', 'LS1'], ['York', 'YO1']],
    types: [['Full member', 3000], ['Student / Youth', 1000], ['Honorary member', 0]],
    dues: (y) => `Membership ${y}`,
    opening: 'Opening balance',
    trip: 'Day trip to Bath',
    credit: 'Deposit refund',
    note: 'Paid by online banking',
    events: { xmas: 'Christmas party', agm: 'Annual General Meeting', concert: 'Folk music evening', next: 'Extraordinary General Meeting', place: 'Club hall', theatre: 'Town theatre' },
    profile: { address: '1 High Street, London', phone: '020 0000 0000', bank_name: 'Bank (sample)', bank_beneficiary: 'Association (sample)', card_note: 'Valid with photo ID' },
  },
  fr: {
    male: ['Jean', 'Pierre', 'Louis', 'Nicolas', 'Thomas', 'Julien', 'Antoine', 'Philippe', 'Michel', 'Lucas', 'Hugo', 'Paul'],
    female: ['Marie', 'Sophie', 'Camille', 'Julie', 'Claire', 'Isabelle', 'Léa', 'Chloé', 'Emma', 'Manon', 'Anne', 'Céline'],
    surnames: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'Roux'].map((s) => [s, s]),
    fathers: [],
    streets: ['rue de la République', 'avenue Victor-Hugo', 'rue Pasteur', 'boulevard Gambetta', 'rue Jean-Jaurès', 'place de la Mairie'],
    cities: [['Paris', '75011'], ['Lyon', '69002'], ['Marseille', '13001'], ['Bordeaux', '33000'], ['Lille', '59000']],
    types: [['Membre actif', 3000], ['Étudiant / Jeune', 1000], ["Membre d'honneur", 0]],
    dues: (y) => `Cotisation ${y}`,
    opening: "Solde d'ouverture",
    trip: 'Sortie à Annecy',
    credit: "Remboursement d'acompte",
    note: 'Virement en ligne',
    events: { xmas: 'Fête de Noël', agm: 'Assemblée générale ordinaire', concert: 'Soirée musique traditionnelle', next: 'Assemblée générale extraordinaire', place: "Salle de l'association", theatre: 'Théâtre municipal' },
    profile: { address: '1 rue de la République, Paris', phone: '01 00 00 00 00', bank_name: 'Banque (exemple)', bank_beneficiary: 'Association (exemple)', card_note: "Valable avec une pièce d'identité" },
  },
};

const MEMBER_COUNT = 48;
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// Replace all of a demo organisation's data with the sample dataset.
export async function resetDemoTenant(env, t, actor = 'system:nightly') {
  const DB = env.DB;
  const tid = t.id;
  const L = DATA[t.default_lang] || DATA.el;
  const r = rng(tid * 7919 + 17);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const today = new Date(`${iso(new Date())}T12:00:00Z`);
  const Y = today.getUTCFullYear();
  const ts = now();
  const stamp = (d) => `${iso(d)}T${String(9 + Math.floor(r() * 9)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}:00.000Z`;
  const between = (from, to) => addDays(from, Math.floor(r() * Math.max(1, (to - from) / 86400000)));

  // 1) wipe everything visitors could have changed (keeps the organisation row and its admin-set name)
  await DB.batch([
    DB.prepare('DELETE FROM attendance WHERE tenant_id = ?').bind(tid),
    DB.prepare('DELETE FROM events WHERE tenant_id = ?').bind(tid),
    DB.prepare('DELETE FROM transactions WHERE tenant_id = ?').bind(tid),
    DB.prepare('DELETE FROM debit_runs WHERE tenant_id = ?').bind(tid),
    DB.prepare('DELETE FROM members WHERE tenant_id = ?').bind(tid),
    DB.prepare('DELETE FROM membership_types WHERE tenant_id = ?').bind(tid),
    DB.prepare('DELETE FROM audit_log WHERE tenant_id = ?').bind(tid),
  ]);

  // 2) demo login always works with the published credentials; fill empty profile fields with sample values
  if (t.demo_username && t.demo_password) {
    const hash = await hashPassword(t.demo_password);
    const u = await DB.prepare('SELECT id FROM users WHERE tenant_id = ? AND username = ?').bind(tid, t.demo_username).first();
    if (u) await DB.prepare("UPDATE users SET password_hash = ?, active = 1, role = 'admin' WHERE id = ?").bind(hash, u.id).run();
    else await DB.prepare("INSERT INTO users (tenant_id, username, full_name, password_hash, role, created_at) VALUES (?, ?, '', ?, 'admin', ?)").bind(tid, t.demo_username, hash, ts).run();
  }
  const p = L.profile;
  await DB.prepare(`UPDATE tenants SET receipt_seq = 0,
      address = COALESCE(NULLIF(address, ''), ?), phone = COALESCE(NULLIF(phone, ''), ?),
      bank_name = COALESCE(NULLIF(bank_name, ''), ?), bank_beneficiary = COALESCE(NULLIF(bank_beneficiary, ''), ?),
      bank_iban = COALESCE(NULLIF(bank_iban, ''), 'GR00 0000 0000 0000 0000 0000 000'), card_note = COALESCE(NULLIF(card_note, ''), ?)
    WHERE id = ?`).bind(p.address, p.phone, p.bank_name, p.bank_beneficiary, p.card_note, tid).run();

  // 3) membership categories
  const typeIds = [];
  for (const [name, fee] of L.types) {
    const row = await DB.prepare('INSERT INTO membership_types (tenant_id, name, annual_fee, created_at) VALUES (?, ?, ?, ?) RETURNING id').bind(tid, name, fee, ts).first();
    typeIds.push({ id: row.id, fee });
  }

  // 4) members
  const members = [];
  const stmts = [];
  for (let i = 1; i <= MEMBER_COUNT; i++) {
    const female = r() < 0.5;
    const first = pick(female ? L.female : L.male);
    const [sm, sf] = pick(L.surnames);
    const last = female ? sf : sm;
    const [city, zip] = pick(L.cities);
    const joinYear = Y - Math.floor(r() * 6);
    const join = iso(between(new Date(Date.UTC(joinYear, 0, 1)), joinYear === Y ? today : new Date(Date.UTC(joinYear, 11, 31))));
    const roll = r();
    const type = roll < 0.72 ? typeIds[0] : roll < 0.94 ? typeIds[1] : typeIds[2];
    const status = i > MEMBER_COUNT - 3 ? 'inactive' : 'active';
    const birth = iso(new Date(Date.UTC(type === typeIds[1] ? Y - 18 - Math.floor(r() * 7) : Y - 28 - Math.floor(r() * 45), Math.floor(r() * 12), 1 + Math.floor(r() * 28))));
    const m = { no: i, first, last, type, status, join, joinYear };
    members.push(m);
    stmts.push(DB.prepare(`INSERT INTO members (tenant_id, member_no, first_name, last_name, father_name, email, phone, address, city, postal_code,
        birth_date, id_number, join_date, membership_type_id, status, notes, photo, qr_token, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'',?,?,?)`).bind(
      tid, i, first, last, L.fathers.length ? pick(L.fathers) : '',
      `member${i}@example.org`, `690000${String(1000 + i).slice(-4)}`,
      `${pick(L.streets)} ${1 + Math.floor(r() * 120)}`, city, L === DATA.el ? `${zip}${String(10 + Math.floor(r() * 89))}` : zip,
      birth, '', join, type.id, status, '', randomToken(18), ts, ts));
  }
  for (let i = 0; i < stmts.length; i += 50) await DB.batch(stmts.slice(i, i + 50));
  const { results: ids } = await DB.prepare('SELECT id, member_no FROM members WHERE tenant_id = ?').bind(tid).all();
  const idOf = new Map(ids.map((x) => [x.member_no, x.id]));

  // 5) transactions: opening balances, two annual dues runs, payments, a trip charge, a credit, pending payments
  const tx = [];
  let receipt = 0;
  const add = (o) => tx.push(o);
  const methods = ['cash', 'cash', 'bank', 'bank', 'card'];
  const runs = [];
  for (const year of [Y - 1, Y]) {
    const date = iso(new Date(Date.UTC(year, 0, 10)) > today ? today : new Date(Date.UTC(year, 0, 10)));
    const run = await DB.prepare('INSERT INTO debit_runs (tenant_id, year, description, date, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id')
      .bind(tid, year, L.dues(year), date, `${date}T08:00:00.000Z`).first();
    runs.push({ year, id: run.id, date, count: 0, total: 0 });
  }
  for (const m of members) {
    const mid = idOf.get(m.no);
    if (m.joinYear < Y - 1 && r() < 0.18) add({ mid, type: 'initial', amount: (1 + Math.floor(r() * 3)) * 1000, date: iso(new Date(Date.UTC(Y - 1, 0, 1))), description: L.opening });
    for (const run of runs) {
      if (m.status !== 'active' && run.year === Y) continue;
      if (m.joinYear > run.year || !m.type.fee) continue;
      add({ mid, type: 'annual', amount: m.type.fee, year: run.year, date: run.date, description: L.dues(run.year), run: run.id });
      run.count++;
      run.total += m.type.fee;
      // payment behaviour: last year mostly settled, this year a realistic mix
      const payRoll = r();
      const paidShare = run.year < Y ? (payRoll < 0.9 ? 1 : payRoll < 0.95 ? 0.5 : 0) : payRoll < 0.58 ? 1 : payRoll < 0.68 ? 0.5 : 0;
      if (paidShare) {
        const end = run.year < Y ? new Date(Date.UTC(run.year, 11, 20)) : today;
        add({ mid, type: 'payment', amount: -Math.round(m.type.fee * paidShare), date: iso(between(new Date(`${run.date}T12:00:00Z`), end)), method: pick(methods), status: 'confirmed' });
      }
    }
  }
  // trip charge (and payments) for a group of members, plus one credit
  const tripDate = iso(addDays(today, -40));
  for (const m of members.filter((x) => x.status === 'active').slice(0, 11)) {
    const mid = idOf.get(m.no);
    add({ mid, type: 'charge', amount: 2500, date: tripDate, description: L.trip });
    if (r() < 0.7) add({ mid, type: 'payment', amount: -2500, date: iso(between(new Date(`${tripDate}T12:00:00Z`), today)), method: 'cash', status: 'confirmed', description: L.trip });
  }
  add({ mid: idOf.get(5), type: 'credit', amount: -1000, date: iso(addDays(today, -20)), description: L.credit });
  // pending payments awaiting the treasurer (one reported by the member through the portal)
  add({ mid: idOf.get(7), type: 'payment', amount: -3000, date: iso(addDays(today, -2)), method: 'bank', status: 'pending', reference: 'TRX-48120', source: 'member', note: L.note });
  add({ mid: idOf.get(12), type: 'payment', amount: -1000, date: iso(addDays(today, -1)), method: 'cash', status: 'pending' });
  add({ mid: idOf.get(19), type: 'payment', amount: -3000, date: iso(today), method: 'card', status: 'pending' });

  // receipts are numbered in date order for confirmed payments
  tx.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const txStmts = tx.map((x) => {
    const confirmed = (x.status || 'confirmed') === 'confirmed';
    const rec = x.type === 'payment' && confirmed ? ++receipt : null;
    const created = stamp(new Date(`${x.date}T12:00:00Z`));
    return DB.prepare(`INSERT INTO transactions (tenant_id, member_id, type, amount, year, date, description, method, reference, status, receipt_no,
        run_id, source, note, confirmed_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      tid, x.mid, x.type, x.amount, x.year || null, x.date, x.description || '', x.method || '', x.reference || '',
      confirmed ? 'confirmed' : 'pending', rec, x.run || null, x.source || 'staff', x.note || '', confirmed ? created : null, created);
  });
  for (let i = 0; i < txStmts.length; i += 50) await DB.batch(txStmts.slice(i, i + 50));
  await DB.batch([
    DB.prepare('UPDATE tenants SET receipt_seq = ? WHERE id = ?').bind(receipt, tid),
    ...runs.map((run) => DB.prepare('UPDATE debit_runs SET member_count = ?, total = ? WHERE id = ?').bind(run.count, run.total, run.id)),
  ]);

  // 6) events: two past, one assembly with quorum, one upcoming assembly
  const E = L.events;
  const evDefs = [
    { title: E.xmas, date: iso(addDays(today, -330)), kind: 'event', location: E.place, share: 0.55, closed: 1 },
    { title: `${E.agm} ${Y}`, date: iso(addDays(today, -60)), kind: 'assembly', location: E.place, share: 0.62, closed: 1, quorum: 50, good: 1 },
    { title: E.concert, date: iso(addDays(today, -12)), kind: 'event', location: E.theatre, share: 0.4, closed: 0 },
    { title: E.next, date: iso(addDays(today, 24)), kind: 'assembly', location: E.place, share: 0, closed: 0, quorum: 50, good: 0 },
  ];
  const att = [];
  for (const ev of evDefs) {
    const row = await DB.prepare(`INSERT INTO events (tenant_id, title, date, location, kind, quorum_percent, only_good_standing, notes, closed, created_at)
      VALUES (?,?,?,?,?,?,?,'',?,?) RETURNING id`).bind(tid, ev.title, ev.date, ev.location, ev.kind, ev.quorum || 50, ev.good || 0, ev.closed, ts).first();
    for (const m of members) {
      if (m.status !== 'active' || r() >= ev.share) continue;
      const at = `${ev.date}T${String(18 + Math.floor(r() * 2)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}:00.000Z`;
      att.push(DB.prepare('INSERT INTO attendance (tenant_id, event_id, member_id, method, checked_at) VALUES (?,?,?,?,?)')
        .bind(tid, row.id, idOf.get(m.no), r() < 0.85 ? 'qr' : 'manual', at));
    }
  }
  for (let i = 0; i < att.length; i += 50) await DB.batch(att.slice(i, i + 50));

  await audit(env, { tid, actor }, 'demo.reset', { summary: `${members.length} members · ${tx.length} transactions · ${evDefs.length} events` });
  return { members: members.length, transactions: tx.length, events: evDefs.length, attendance: att.length };
}

export async function resetAllDemos(env) {
  const { results } = await env.DB.prepare('SELECT * FROM tenants WHERE is_demo = 1 AND active = 1').all();
  const out = [];
  for (const t of results) {
    try {
      out.push({ key: t.key, ...(await resetDemoTenant(env, t)) });
    } catch (e) {
      console.error('demo reset failed', t.key, e);
      out.push({ key: t.key, error: String(e.message || e) });
    }
  }
  return out;
}
