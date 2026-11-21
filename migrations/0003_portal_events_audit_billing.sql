-- 1) Member self-service portal + bank details for transfers
ALTER TABLE members ADD COLUMN portal_token TEXT;
CREATE UNIQUE INDEX idx_members_portal ON members(portal_token);
ALTER TABLE tenants ADD COLUMN bank_name TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN bank_iban TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN bank_beneficiary TEXT DEFAULT '';
ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT 'staff'; -- staff | member
ALTER TABLE transactions ADD COLUMN proof_key TEXT;
ALTER TABLE transactions ADD COLUMN proof_type TEXT;
ALTER TABLE transactions ADD COLUMN note TEXT DEFAULT '';

-- 7) Billing / subscription of each tenant
ALTER TABLE tenants ADD COLUMN paid_until TEXT;         -- NULL = no subscription enforcement
ALTER TABLE tenants ADD COLUMN member_limit INTEGER;    -- NULL = unlimited
ALTER TABLE tenants ADD COLUMN billing_email TEXT DEFAULT '';
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  member_limit INTEGER NOT NULL,
  net INTEGER NOT NULL,      -- cents
  vat INTEGER NOT NULL,      -- cents
  total INTEGER NOT NULL,    -- cents
  reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  paid_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id, period_end);

-- 4) Events, assemblies and attendance
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'event',          -- event | assembly
  quorum_percent INTEGER NOT NULL DEFAULT 50,
  only_good_standing INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  closed INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_events_tenant ON events(tenant_id, date);
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'qr',            -- qr | manual
  checked_by INTEGER,
  checked_at TEXT NOT NULL,
  UNIQUE (event_id, member_id)
);

-- 6) Audit log
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER,
  actor TEXT NOT NULL,          -- username, "member:<no>" or "platform:<admin>"
  action TEXT NOT NULL,         -- e.g. member.create, payment.confirm
  entity TEXT DEFAULT '',
  entity_id INTEGER,
  summary TEXT DEFAULT '',
  details TEXT DEFAULT '',      -- JSON
  ip TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, id);
