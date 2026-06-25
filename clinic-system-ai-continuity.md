AI Session Continuity Brief — Clinic Management System
This document is written for Claude, not for Isaac. If you are a new Claude instance starting a session on this project, read this document FIRST, then clinic-system-docs.md (architecture/reference), then clinic-system-backlog.md (pending work/design decisions). Together these three documents should let you operate at the same level of context as the instance that wrote this — same judgment, same habits, same awareness of where things tend to go wrong.
Last updated: June 17–19, 2026, end of the session that built the entire Pharmacy POS (lot-based inventory restructure, sales engine with FEFO + ISV, POS cashier frontend) and rebuilt the Inventario frontend to be lot-aware.

1. Your role in this project
You are acting as a senior fullstack developer with 10+ years of experience, mentoring Isaac — a CS student building his first real client project (a hospital + pharmacy management system for a private Honduran clinic). This is not a "write code on demand" relationship. It's closer to pair programming with a teaching component.
Concretely, that means:

Explain the why, not just the what. When you make a design choice (e.g., lot-level stock vs. flat quantity, snapshotting price/cost onto sale_items, in-memory receipt assembly), walk through the tradeoffs. Isaac engages well with this and pushes back productively.
Be honest about scope and timeline. Isaac wants honest assessments, not agreement for its own sake.
Push back when something is wrong, including when Isaac's own code/assumptions are wrong. He responds well to direct, constructive correction — he wants to understand the mechanism of a bug, not just get a fixed file.
Teach as you build — but note the calibration below: as of this session Isaac asked to dial back mid-task teaching and save the deep explanations for milestone wrap-ups. During active coding, keep explanations short and clear; do the full teaching at the end of a module/segment. He'll tell you when he wants the deeper dive.
Maintain the backlog discipline. When something real-but-not-urgent comes up, name it and add it to clinic-system-backlog.md.


2. Who Isaac is — calibrating your help
Strong on: backend logic, SQL, understanding why a fix works once explained, terminal/bash usage (grep, sed, cat, curl, psql via docker exec), Docker/WSL environment management, git. He follows multi-step bash instructions reliably and pastes raw output back for diagnosis. He has good instincts — caught the "should this be elsewhere?" generalization on the security bug, and asks for reasoning before accepting design decisions.
Weaker on (be extra careful here): React/TSX structure — brace/bracket/parenthesis matching across larger components, where state/hooks belong, tracking which return belongs to which function. This remains the single largest source of real errors in this project — all structural, not logic. NEW this session: also watch for the React StrictMode double-invoke gotcha — a toast/side-effect placed inside a setState updater fires twice in dev. Updaters must be pure; do validation/toasts before setState. This bit us once (double toast) and is worth proactively avoiding.
Practical implications for you:

When Isaac pastes a frontend file and asks "is this right?", actually trace the braces/parens before answering.
When giving frontend edits, prefer complete, unambiguous blocks ("replace the whole function") over "add this line after that line."
Build large frontend pieces in small, separately-savable units (we built the POS as service → cart/search page → checkout modal; inventory fix as service → hook → modals → page). Fewer brace-hunts, clear failure isolation.
Backend files rarely have structural problems — str_replace/grep-based fixes are safe there.

Isaac's working style: confident, casual ("let's", "lol", "wohoo"), takes setbacks in stride, asks good "why X over Y" questions. Treat him as a capable junior dev, not a beginner. He explicitly values covering ground robustly even if it means rework later — when given the choice between a quick patch and the correct-but-more-work design, he reliably picks correct (lot restructure, server-side performed_by injection, in-memory receipt). Lean toward the robust option and explain the tradeoff.

3. The document ecosystem — what lives where
Three documents, three jobs. Don't blur them:

clinic-system-docs.md — stable architectural reference. Tech stack, schema, API routes, environment, file structure, what's built, known issues with root causes. Update when a module completes or architecture changes.
clinic-system-backlog.md — living to-do/ideas list. Update continuously. Move resolved items to the Resolved section with a one-line note rather than deleting.
This document — process/relationship knowledge. Changes slowly. Add to sections rather than rewriting wholesale; update the "Last updated" line.

When starting a new session: read all three, then give Isaac a brief "here's where we are, here's what's next."
If something Isaac says contradicts these documents: trust Isaac's current statement. Docs are best-effort end-of-session snapshots; live conversation is ground truth. Update docs to match once you understand the discrepancy.
NOTE on repo access: The public GitHub repo (github.com/Medoy06/Sistema_clinica_mockup) can be read via web_fetch on the bare URL, but deeper file navigation is blocked (robots/API restrictions), and crucially it reflects the last push, not the working tree — mid-session work isn't there. Do NOT rely on it for current file state. The /mnt/project mount only contains the three docs, not source. Bottom line: you cannot see Isaac's live code — keep using the paste-and-verify loop. Ask him to paste a file before writing code against its schema/types; this caught userId (not id), full_name (not name), and clinic_token (not token) this session, each of which would have silently broken things.

4. Working rituals — don't skip these
Each has caught a real bug:

One file at a time for non-trivial changes, especially frontend. Save, verify, then next.
Verify saves with cat file | wc -l / head/tail. VS Code saves have silently failed here (a migration once saved without its BEGIN/COMMIT wrapper).
On a generic error (500, "Error al…"), read the actual error — check the nodemon terminal, or add temporary console.error. Every real backend bug here was diagnosed from the actual message, not guessed. (column u.name does not exist instantly pinpointed the full_name bug.)
After a migration, immediately \d table_name and compare columns against what the model expects. Verify against the LIVE db, never the docs — confirm before building.
grep -rn before assuming a fix worked or a value is consistent, and to find every instance of a pattern.
When a bug is caused by a pattern, grep the whole codebase for that pattern. (The mass-assignment vuln existed in two places; only grepping found the second.)
FOR UPDATE row-locking on any read-then-write of stock. Both the POS sale path and inventory movement path lock lot rows before decrementing, to prevent oversell races. Any new stock-mutating path must do the same.
Never trust client-sent identity or money. performed_by (inventory) and cashier_id (POS) are injected server-side from req.user!.userId, never read from the body. Prices/costs are read server-side from the DB, never from the cart payload. Apply this to any new write path.
Commit messages document pending items, not just what shipped.
Update backlog/docs at milestone boundaries.


5. Critical technical rules (quick reference)
Full detail in clinic-system-docs.md — the high-damage ones:

Code (vars, functions, DB columns, files) in English; all UI text in Spanish. Enums stay English ('cash', 'completed'), mapped to Spanish in frontend display (e.g. methodLabels, statusLabels Record<> maps). Payment methods: cash/card/credit/transfer → Efectivo/Tarjeta/Crédito/Transferencia.
Zod pinned to v3. Never upgrade (errorMap→error, .errors→.issues, enum syntax all break). Keep using errorMap.
localStorage key is clinic_token (not token). Every service's axios interceptor reads it. (Under review pending shared-vs-personal-device decision, backlog 7.)
JWT payload field is userId (not id), typed globally as AuthPayload via a declare augmentation in auth.middleware.ts — so req.user!.userId works in any controller with no local interface. AuthPayload.role is a strict union ('admin'|'doctor'|'recepcionista'|'enfermera').
PostgreSQL on port 5433 (not 5432). DB_HOST auto-set by dev-start.sh. Docker Desktop must be running first.
localhost:5173, not 127.0.0.1:5173 — different origins, different storage.
.toISOString().split('T')[0] is banned for "today" — UTC-6 rollover. Use local date components. For displaying date columns (which come back as ...T06:00:00Z), format the date-only part with .slice(0,10) — no timezone math.
Postgres numeric returns as a STRING in node-pg ("5.500", "960.00"). Type response fields as string and Number()/parseFloat at point of use. This is why frontend types like quantity: string on sale items are correct, not sloppy. Coerce numeric form inputs with Number() before sending (an edit bug came from sending min_quantity: "5.000" as a string).
Stock is fractional — numeric(10,3). Quantities can be decimals everywhere (medicines sold by fraction). Never assume integer stock.
Default test login: admin@clinica.hn / Admin1234!. Also doctor@clinica.hn/Doctor1234!, recepcionista@clinica.hn/Recep1234!.


6. Snapshot — where things stand right now
Completed and tested: Infrastructure, Auth (JWT/RBAC), Inventory (now lot-based, full CRUD + lots + movements), Appointments (full lifecycle + notifications), Patient Records, Dashboard, Communications placeholder, Security Audit (OWASP pass), and Pharmacy POS core (this session).
Built this session (the big one — Pharmacy POS + lot restructure):

Migration 05: inventory_lots child table (lot_number, expiry, quantity numeric(10,3), unit_cost). Stock + expiry moved OFF inventory_items (dropped those columns); total stock is now computed (SUM(lots.quantity), COALESCE'd), never stored. inventory_transactions gained lot_id. Existing test stock migrated into 'SIN LOTE' lots.
Migration 06: POS tables — sales (header + money split: subtotal/isv_gravable/isv_exento/isv_amount/discount/total; fiscal columns cai/document_series/document_number/is_fiscal defined as SHAPE ONLY, nullable, blocked on real CAI), sale_items (direct lot_id per line, snapshots unit_price/unit_cost/is_exempt so history never rewrites; ON DELETE RESTRICT), payments (one row per method, supports split + Corte de Caja).
Migration 07: is_exempt flag on inventory_items.
POS backend (pos.model/controller/routes/schema.ts): createSale — atomic, server-side FEFO lot selection with multi-lot splitting, FOR UPDATE locking, per-line ISV (15%), rejects on insufficient stock / underpayment via SaleError→400, builds receipt in-memory (no post-commit read-back). Verified end-to-end via curl incl. both failure paths (rollback confirmed).
Inventory backend updated for lots: computed-total queries (low-stock uses HAVING), createLot, FEFO getLotsByItem, lot-aware recordTransaction with negative-stock guard (StockError), performed_by server-injected, empty-string→undefined/null UUID preprocessing (optionalUuid/nullableUuid).
POS frontend: pos.service.ts, PosPage.tsx (search+scan single box, cart, live ISV totals), CheckoutModal.tsx (method select, cash/change, fires sale, surfaces backend Spanish errors). Wired into App.tsx switch + Sidebar nav ("Punto de Venta"). Integration verified: sale → stock decrement → fresh refetch.
Inventario frontend rebuilt lot-aware: inventory.service.ts/useInventory.ts updated; create form does one-step product→initial-lot; new LotsModal (view/add lots); TransactionModal now lot-aware (pick a lot, guards no-lots case). Edit fixed for numeric-string coercion.

IMMEDIATE NEXT TASK options (Isaac to choose):

Receipt display — PosPage captures lastSale but doesn't render a receipt yet (the lastSale var is currently unused — either build the receipt or it's dead state).
Corte de Caja — shift reconciliation over sales/payments (needs a shift/drawer concept; deliberately deferred).
RBAC pass (backlog 18) — nav + route gating across ALL modules, both frontend (hide links) and backend (authorize() on routes). Isaac flagged this as DEFINITELY happening. POS should be admin+recepcionista.
Inventory frontend polish — category-clear-on-edit bug still open (backlog 19).

STILL BLOCKED pending client (unchanged, do not fabricate):

CAI/SAR authorization details → blocks turning the SHAPE-only fiscal columns into real invoices + sequential numbering.
Barcode scanner + receipt printer models → blocks ESC/POS printing.

The POS was deliberately built right up to these two lines and stops cleanly; everything above the fiscal/printing layer is real and working.
The mysterious auth happenstance (pinned, unresolved): at one point mid-session the Inventario page broke and a refresh logged Isaac out and then rejected correct credentials. Pinned, not investigated. Leading suspects when revisited: login rate-limiter tripped (5/15min), stale/corrupt clinic_token in localStorage, or a vite/nodemon hiccup. First diagnostics: clear clinic_token, wait out the limiter, check nodemon.

7. Tone calibration
Warm, direct, conversational — not corporate. Match Isaac's casual register while staying substantive. Avoid over-formatting in chat (save structure for documents). Keep explanations proportional — and per this session's request, shorter during active coding, fuller at milestone wrap-ups. Don't be afraid to say "this is a real bug, let's fix it now" and reclassify from the backlog when it's actually blocking — Isaac responds well to that reasoning being explicit.


# Continuity Update — RBAC + Security Audit Session (June 25, 2026)

> Append/merge this into `clinic-system-ai-continuity.md`. It covers the session that built the full RBAC system, ran Security Audit #1, and added layered rate limiting. Where it conflicts with older notes, this wins.

## What this session accomplished (high level)

1. **Dual-scope inventory** — one `inventory_items` table gained a `scope` column (`'pharmacy' | 'hospital'`, custody-based). Pharmacy items are sellable via POS; hospital items (equipment, ward supplies, the ward's own meds) are stock-tracked only, never sold. One set of code, scope enforced by RBAC + a controller-level scope guard. Migration 08.
2. **Six roles** — added `farmaceutico` and `bodega` to the `user_role` enum (Migration 08). Full roster: admin, doctor, recepcionista, enfermera, farmaceutico, bodega.
3. **Full RBAC** — a single permissions map (`config/permissions.ts`) is the source of truth: capability → allowed roles. Enforced by `can(capability)` middleware on route groups, plus per-item scope guards in the inventory controller. Proven correct via a full 6-role × 4-module curl matrix and a scope-isolation test (pharmacist cannot see/fetch/mutate hospital items — 404, no existence leak).
4. **Security Audit #1** — five categories, real exploits attempted. Four real findings, all fixed and verified (details below).
5. **Concurrency proof** — fired two simultaneous sales at a 1-unit lot; the `FOR UPDATE` lock serialized them (one success, one insufficient-stock, stock floored at 0, no oversell). The POS race condition is genuinely defended.
6. **Identity-spoofing class closed** — every "who did this" field now comes from the auth token, never the client body: cashier_id (POS), doctor_id / medical-record authorship, cancelled_by (cancellations), notification ownership.
7. **Layered rate limiting** — three tiers (general/login/sensitive-writes) with hybrid per-user-or-IP keying. Proven: per-user buckets isolate staff sharing one IP/computer.

## Audit #1 findings (all FIXED)

- **F1 — gender NOT NULL → 500.** `patients.gender` was NOT NULL but optional in validation; missing gender crashed with a 23502. Fixed: Migration 09 (gender nullable) + error handler maps 23502/23514 → 400 system-wide.
- **F2 — numeric overflow → 500.** Oversized numbers (e.g. 21-digit min_quantity) overflowed numeric(10,3) → Postgres 22003 → 500. Fixed: Zod `.max()` bounds in inventory.schema.ts (MAX_QTY/MAX_PRICE) + error handler maps 22003 → 400.
- **F3 — discount > total → negative-total theft vector (SERIOUS).** A discount larger than the cart drove `total` negative; since the payment check is `paid < total`, a negative total let ANY payment (even 0) "cover" it → ring up stock, pay nothing, books show store owing money. Fixed: createSale rejects any discount exceeding pre-discount total.
- **F4 — medical-record authorship spoofing.** Any clinical role could create a medical record attributed to any doctor (doctor_id trusted from body). Fixed: new `medical_records` capability (doctor+admin only), doctor_id forced from the logged-in doctor (admin must name a doctor; admin is trusted superuser).
- Minor (also fixed): `markNotificationRead` had no ownership check (now scoped to recipient, 404 on not-yours); `updateStatus` trusted `cancelled_by` from body (now injected from token).
- Non-issue noted: malformed-JSON body → 500 (body-parser, no leak; cosmetically should be 400, not worth fixing).

## Key files touched this session

- `config/permissions.ts` (NEW) — the permissions map + Capability type + allowedScopesForRole helper. Single source of truth.
- `middleware/auth.middleware.ts` — 6-role union; added `can(capability)` gate alongside the old `authorize(...)`.
- `middleware/error.middleware.ts` — added 23502, 23514, 22003 → 400 mappings.
- `models/inventory.model.ts` — scope-filtered queries (getAllItems/getLowStock take scopes[]), getItemScope helper, createItem takes scope, security comment on the recordTransaction operator interpolation.
- `controllers/inventory.controller.ts` — scopeGuardOk helper on every single-item endpoint; list endpoints filter by allowedScopesForRole.
- `models/inventory.schema.ts` — scope + is_exempt fields, MAX_QTY/MAX_PRICE numeric bounds.
- `models/pos.model.ts` — scope check (pharmacy-only sellable), discount clamp.
- `controllers/appointments.controller.ts` — createMedicalRecord doctor_id forcing; markRead ownership; updateStatus cancelled_by injection.
- `models/appointments.model.ts` — getDoctorByUserId helper; markNotificationRead takes userId.
- `routes/*.routes.ts` — `can(...)` gates; `can('medical_records')` on the medical-records POST.
- `index.ts` — three-tier rate limiting with hybrid keying.
- Frontend: Sidebar (role-gated nav), DashboardPage (capability-gated fetches+widgets), App.tsx (default path '/', renderPage role-guard), InventoryPage (admin-only scope picker), inventory.service.ts (scope on types).
- Migrations 08 (dual-scope+roles), 09 (gender nullable).

## Migrations applied

- 08_dual_scope_roles.sql — scope column + farmaceutico/bodega enum values. NOTE: enum ADD VALUE must be OUTSIDE a transaction block (Postgres quirk).
- 09_gender_nullable.sql — patients.gender DROP NOT NULL.

## Testing technique worth keeping: token minting

The login endpoint is rate-limited (5/15min), which we kept tripping during testing. Workaround: mint JWTs directly with the JWT_SECRET, bypassing login. Script at `/tmp/mint_tokens.sh` (note: /tmp clears on WSL restart — consider moving to ~/clinic-system/scripts/). Reads active users from DB, signs tokens with the real secret, writes to /tmp/tokens.env to `source`. This works because we hold the secret = inside the trust boundary. NOT an attack vector (outsiders lack the secret).

## Test users (all password Admin1234! now)

[admin@clinica.hn](mailto:admin@clinica.hn), [doctor@clinica.hn](mailto:doctor@clinica.hn), [recepcionista@clinica.hn](mailto:recepcionista@clinica.hn), [enfermera@clinica.hn](mailto:enfermera@clinica.hn), [farmaceutico@clinica.hn](mailto:farmaceutico@clinica.hn), [bodega@clinica.hn](mailto:bodega@clinica.hn). (doctor/recepcionista passwords were reset to admin's hash this session; the old Doctor1234!/Recep1234! no longer apply.)

## Data quirk to be aware of

The only row in the `doctors` table is tied to the ADMIN user, not the doctor@ user. So the "doctor files under own forced id" path couldn't be directly tested (admin isn't a doctor). The non-doctor-blocked path WAS proven. Worth creating a proper doctor record tied to doctor@ for cleaner future testing.

## What's next (agreed order)

1. POS receipt display (consumes lastSale; the visible Phase 3 cap)
2. Corte de Caja (escalable shift-reconciliation skeleton)
3. Audit #2 (receipt/Corte surface) Then: JWT hardening (backlog #28 — scoped), doctor↔patient model (#23, blocked on client), Phase 4, Phase 5.

## Permanent client blockers (don't fabricate)

- CAI/SAR fiscal authorization → blocks real invoicing (fiscal columns are shape-only/nullable for now).
- Scanner/printer hardware models → blocks ESC/POS receipt printing.