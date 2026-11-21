# Members · OneCode

Multi-tenant membership management for associations, clubs and non-profits — hosted on a
Cloudflare Worker (`members.onecode.win`) with a D1 (SQLite) database. Mobile-first, works on desktop,
installable as a PWA. Languages: Greek (default), English, French.

## What's inside

| Area | Features |
|---|---|
| **Landing** (`/`, `/en`, `/fr`) | Server-rendered presentation for SEO (meta, Open Graph, hreflang, JSON-LD SoftwareApplication + FAQ, `robots.txt`, `sitemap.xml`), sign-in (tenant key + username + password), pricing + calculator, FAQ, contact form → `sales@onecode.gr` (Turnstile + honeypot + rate limit, saved in D1), suggestion button (WhatsApp / Viber / Telegram / email). |
| **Tenant sign-in** | `members.onecode.win/?soc=<tenantkey>` opens the organisation's branded sign-in (username + password only). |
| **Platform admin** (`/admin`) | Create tenants (name, key, admin username/password), copy link + QR, edit/deactivate, reset credentials, delete (type the key to confirm). |
| **Members** | Register with categories, photo, notes; search/filter/sort; roster export to PDF / XLSX / CSV (`;`). |
| **Cards & QR** | Luxury member card; print on A4 (10/page with crop marks) or CR80 card printer; PDF; digital card link. QR opens a public verification page; in-app scanner (BarcodeDetector + jsQR fallback) or member-number lookup. |
| **Annual dues** | One-click yearly charge per category with preview, duplicate protection, "joined by year" rule, undo. |
| **Opening balances** | Per-member grid (positive = owed, negative = credit), also via CSV import. |
| **Bulk import** | CSV with auto-detected `;`/`,`/tab separator, UTF-8 or Windows-1253 (Greek Excel), auto column mapping (el/en/fr headers), update or skip existing numbers. |
| **Payments** | No gateway: operators record cash/bank/card payments → pending; administrators confirm (single or bulk) → receipt number assigned. Void/reject supported. |
| **Documents** | Member statement, receipt, all-member balances, transactions: print, PDF (text-based, embedded Greek font), XLSX, CSV, and 30-day signed share links (WhatsApp / Viber / email / SMS). |
| **Users & roles** | Administrator / Operator / View only per tenant. |
| **Member portal** (`/m/<token>`) | Private per-member link (create / share via WhatsApp·Viber·SMS·email / regenerate / revoke): card + wallet buttons, balance, statement & receipt PDFs, bank details with copyable IBAN and reference, report a bank transfer with photo/PDF proof (stored in R2) → arrives as *pending* for the treasurer. |
| **Wallet passes** | Apple Wallet `.pkpass` (CMS-signed in the Worker) and Google Wallet "save" link (RS256 JWT), from the portal and the public QR page. Shown only when configured. |
| **Events & assemblies** | QR check-in from several phones at once (live sync), manual add, duplicate detection, live quorum meter for general assemblies (optionally only members in good standing), attendance list and signature sheet (print / PDF / XLSX / CSV). |
| **Audit log** | Every change (who, what, when, IP, before → after for member edits), including member-portal submissions and OneCode admin actions; filter, search, export. |
| **Data export** | One click: ZIP with `data.json` + one CSV per table (GDPR portability / backup). |
| **Billing** (admin) | Paid-until and member limit per tenant, renewals with automatic price/VAT by tier, mark paid, history, revenue summary, filters (expiring / expired / over limit), reminder via email / WhatsApp / Viber, weekly digest e-mail to sales. Tenants see a banner and status; member limit is enforced; after a 30-day grace period the app becomes read-only. |

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars    # then edit the values
npm run db:migrate:local
npm run dev                        # http://localhost:8787  (admin panel: /admin)
```

## Deploying to Cloudflare

1. Create the database and put its id into `wrangler.jsonc` (`database_id`):
   ```bash
   npx wrangler d1 create members-db
   npm run db:migrate
   ```
2. Secrets:
   ```bash
   npx wrangler secret put ADMIN_USERNAME
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SESSION_SECRET      # long random string
   npx wrangler secret put TURNSTILE_SECRET    # from Cloudflare dashboard → Turnstile
   ```
3. In `wrangler.jsonc → vars` set `TURNSTILE_SITE_KEY`, and the suggestion channels
   `CONTACT_WHATSAPP` (international digits, e.g. `3069…`), `CONTACT_VIBER`, `CONTACT_TELEGRAM` (username).
4. Contact-form e-mail uses Cloudflare Email Routing (`send_email` binding):
   enable Email Routing on the sender domain of `MAIL_FROM` (default `noreply@onecode.win`) and add
   `sales@onecode.gr` as a **verified destination address**. Messages are always stored in the
   `contact_messages` table even if delivery fails. (Optional fallback: set a `RESEND_API_KEY` secret.)
5. Payment proofs: create the R2 bucket `npx wrangler r2 bucket create members-proofs`.
6. Wallet passes (optional — buttons stay hidden until configured):
   - **Apple:** Apple Developer account → Identifiers → *Pass Type ID* (e.g. `pass.win.onecode.members`) → create its certificate, export as `.p12`, then:
     ```bash
     openssl pkcs12 -in pass.p12 -clcerts -nokeys -out pass.pem -legacy
     openssl pkcs12 -in pass.p12 -nocerts -nodes -out pass.key -legacy
     curl -O https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer && openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem
     npx wrangler secret put APPLE_PASS_CERT < pass.pem
     npx wrangler secret put APPLE_PASS_KEY < pass.key
     npx wrangler secret put APPLE_WWDR_CERT < wwdr.pem
     ```
     and set `APPLE_PASS_TYPE_ID` and `APPLE_TEAM_ID` in `wrangler.jsonc`.
   - **Google:** Google Pay & Wallet Console → issuer account (note the Issuer ID) → Google Cloud service account with the Wallet API enabled → JSON key:
     `npx wrangler secret put GOOGLE_WALLET_SERVICE_ACCOUNT < key.json`, and set `GOOGLE_WALLET_ISSUER_ID`.
7. Deploy: `npm run deploy`. The custom domain `members.onecode.win` is attached by the `routes` entry
   (the `onecode.win` zone must be on the same Cloudflare account).
8. Submit `https://members.onecode.win/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Pricing (shown on the landing page)

| Members | Net / year | With 24% VAT |
|---|---|---|
| up to 100 | 35 € | 43,40 € |
| up to 500 | 90 € | 111,60 € |
| each extra 200 above 500 | +10 € | +12,40 € |

## Structure

```
src/            Worker: index.js (routing), tenant.js, admin.js, features.js (portal, events, audit, export),
                wallet.js (Apple/Google passes), billing.js, audit.js, contact.js, landing.js (SSR), util.js
migrations/     D1 schema
public/         SPA (vanilla ES modules, no build step), CSS, self-hosted fonts, vendor libs, images
```

Third-party libraries (vendored in `public/vendor`): qrcode-generator (MIT), jsQR (Apache-2.0),
jsPDF + jspdf-autotable (MIT). Fonts: Manrope, Noto Serif Display (SIL OFL), subset and self-hosted.

Created by [OneCode](https://onecode.gr).
