Developer README — dashboard-alco-reg-sulteng

This repository is a Next.js (App Router) dashboard that visualizes and manages regional fiscal and macroeconomic datasets. It uses Supabase as the primary data backend and includes an admin panel for CRUD and CSV uploads.

Contents

- app/ — Next.js app routes and components (UI, dashboards, admin)
- public/assets/... — CSV templates and static assets (see template-upload-\*.xlsx)
- package.json — project scripts and dependencies

Quick start (development)

1. Install dependencies

```bash
npm install
# or: pnpm install
```

2. Set environment variables (see list below)

3. Run dev server

```bash
npm run dev
```

4. Open http://localhost:3000

Required environment variables
Set these in your local environment or in a .env.local file at the project root.

- NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon/public key
- NEXT_PUBLIC_BPS_KEY — (optional) API key for BPS if using the BPS integration

Notes on runtime and deployments

- The app uses public Supabase keys (anon). For production, consider using Supabase Auth, server-side role-based access, and server-only secrets (not exposed to the client).
- Admin panel routes are protected client-side via sessionStorage — this is not secure. See the Security section below.

Database tables referenced (high-level)

- pdrb_sulteng_agg — aggregated PDRB records used in dashboards
- inflasi — inflation records
- fiskal_apbn — APBN time series and components
- fiskal_pemda — APBD (Pemda) time series
- makro_kesra_indicators — macro/kesra indicators used in cards
- rincian_belanja_negara — raw detailed spending rows (Aplikasi Sintesa export)
- users — admin users (used by admin login/registration)
- analisis_tematik_data — thematic analyses (admin managed)

CSV upload expectations and templates
The UI provides expected headers and there are template files in `public/assets/template-data/`.

Important header expectations shown in the app:

- APBN (fiskal_apbn): the app UI describes required columns and the add page uses upsert with onConflict: `tgl_cutoff, komp_ang`.
- APBD (fiskal_pemda): expected headers include `tgl_cutoff`, `nama_pemda`, `pendapatan`, `belanja`, `pembiayaan`, `SILPA`. Upsert uses onConflict: `tgl_cutoff,nama_pemda`.
- Belanja Negara (rincian_belanja_negara): expected headers (case-sensitive): `KDKABKOTA`, `NMKABKOTA`, `KDKPPN`, `NMKPPN`, `KDFUNGSI`, `NMFUNGSI`, `KDSFUNG`, `NMSFUNG`, `JENBEL`, `NMGBKPK`, `PAGU_DIPA`, `REALISASI`, `BLOKIR`. Upload UI also asks for THANG (year) and BULAN (month); `waktu` is computed as the last day of the month. Upsert uses a composite onConflict: `THANG,BULAN,KDKABKOTA,KDKPPN,KDFUNGSI,KDSFUNG,JENBEL`.
- PDRB (pdrb_sulteng_agg): the PDRB add/upload page contains logic to transform BPS-styled variable rows into aggregated rows (fields like `daerah`, `waktu`, `adhb`, `adhk`, etc.). If you prefer CSV, ensure columns match the target table's schema.

CSV upload implementation notes

- The admin upload pages use PapaParse for parsing and Supabase JS `upsert()` for batch writes. Batches are chunked (e.g., 1000 records) to avoid large single requests.
- Header matching is case-sensitive and enforced by the UI. Use the templates in `public/assets/template-data/` as a starting point.

Security notes (must-read)

- Admin auth is client-side: the login page queries the `users` table and stores a JSON object in `sessionStorage.loginInfo`. This approach is not secure for production.
- Password hashing in the client uses MD5 (weak). Move authentication and password verification server-side and use modern hashing (bcrypt / Argon2).
- Public Supabase anon key is embedded in the client — for admin-only operations you should gate them via server endpoints or Row-Level Security (RLS) policies that require authenticated users with secure tokens.

Suggested improvements (small/medium/urgent)

- Urgent: Move admin authentication server-side or use Supabase Auth; remove client-side password verification and sessionStorage reliance.
- Replace MD5 with bcrypt/argon2 and verify on the server. Consider migrating existing hashed passwords by forcing a reset or re-hashing on first login.
- Add server-side route protection (middleware) for admin routes or server-rendered checks.
- Add tests for CSV-parsing and sample upload flows (unit test that header validation works and that transformation functions for PDRB behave as intended).
- Add a small script to validate CSV header correctness against templates before upload.

Developer workflow hints

- Run lint/type checks (if configured) and then `npm run build` to validate production build.
- To iterate on admin uploads, use small CSVs (10–100 rows) while testing before larger batches.

Where to look next in the code

- UI/Navigation: `app/components/Layout.js`, `Header.js`, `Sidebar.js`.
- Main dashboards: `app/page.js`, `app/fiskal/page.js`, `app/ekonomi/page.js`, `app/makro/page.js`.
- Admin logic and CSV uploads: `app/admin/panel/kelola-data/*` (each data type has a `page.js` and `tambah/page.js` for add/upload).
- Supabase client: `app/lib/supabaseClient.js`.

If you want, I can next:

- Add a dedicated `DEVELOPER.md` with expanded run/debug instructions and example curl or Supabase queries.
- Implement a small server API route to move the login verification server-side (minimal change to keep the UI working but improve security).
- Generate machine-readable mapping (CSV headers → DB columns → onConflict keys) as JSON.

Todo status

- Read all files under `app/` — completed
- Produce per-file summary — completed
- Generate developer README — completed (this file)

Contact & attribution
This README was generated/updated automatically during a codebase audit. If anything looks incorrect (mismatched headers, or missing table names), tell me which page to re-check and I'll extract exact header names and DB keys.
