-- Multi-tenant membership service schema
CREATE TABLE tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  website TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  color TEXT DEFAULT '#b08d57',
  currency TEXT DEFAULT 'EUR',
  default_lang TEXT DEFAULT 'el',
  card_note TEXT DEFAULT '',
  receipt_seq INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username TEXT NOT NULL COLLATE NOCASE,
  full_name TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- admin | staff | viewer
  active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (tenant_id, username)
);

CREATE TABLE membership_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  annual_fee INTEGER NOT NULL DEFAULT 0, -- cents
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_no INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  father_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  birth_date TEXT DEFAULT '',
  id_number TEXT DEFAULT '',
  join_date TEXT DEFAULT '',
  membership_type_id INTEGER REFERENCES membership_types(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | inactive
  notes TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  qr_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, member_no)
);
CREATE INDEX idx_members_tenant ON members(tenant_id, last_name, first_name);

CREATE TABLE debit_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  description TEXT DEFAULT '',
  date TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at TEXT NOT NULL
);

-- amount is the signed effect on the amount the member owes (cents):
--   annual / charge  : positive
--   payment / credit : negative
--   initial          : positive (owed) or negative (credit)
-- Only status='confirmed' rows count in balances.
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- initial | annual | charge | payment | credit
  amount INTEGER NOT NULL,
  year INTEGER,
  date TEXT NOT NULL,
  description TEXT DEFAULT '',
  method TEXT DEFAULT '', -- cash | bank | card | other
  reference TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed', -- pending | confirmed | void
  receipt_no INTEGER,
  run_id INTEGER REFERENCES debit_runs(id) ON DELETE CASCADE,
  created_by INTEGER,
  confirmed_by INTEGER,
  confirmed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_tx_member ON transactions(member_id, date);
CREATE INDEX idx_tx_tenant ON transactions(tenant_id, status, date);
CREATE INDEX idx_tx_year ON transactions(member_id, type, year);

CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX idx_login_attempts ON login_attempts(bucket, at);
