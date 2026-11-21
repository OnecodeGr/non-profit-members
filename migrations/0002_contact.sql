-- Messages sent from the public contact form (kept even if email delivery fails).
CREATE TABLE contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  org TEXT DEFAULT '',
  members TEXT DEFAULT '',
  message TEXT NOT NULL,
  lang TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  emailed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
