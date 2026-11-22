-- Demo organisations (credentials prefilled on ?soc=<key>, protected settings) and per-organisation e-mail switch.
ALTER TABLE tenants ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN demo_username TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN demo_password TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN email_enabled INTEGER NOT NULL DEFAULT 1;
