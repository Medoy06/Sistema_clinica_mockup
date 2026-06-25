# Clinic Management System — Backlog & Pending Ideas
 
**Last Updated:** June 14, 2026
**Companion to:** `clinic-system-docs.md` (main project documentation)
 
---
 
## How to use this document
 
This is a **living backlog** — a running list of deferred features, design decisions made but not yet implemented, and issues found during development that aren't urgent enough to stop and fix immediately.
 
When adding an item:
- Give it a short title and a status (`💡 Idea`, `📐 Designed`, `🔧 In Progress`, `✅ Done`)
- If a design/approach was discussed and agreed on, write it down in enough detail that a future session can implement it without re-deriving the reasoning
- When an item is completed, move it to the "Resolved" section at the bottom with a brief note — don't just delete it, since it's useful history (especially for things that took real debugging time)
---
 
## Active Backlog
 
### 1. Doctor name shows "Dr. —" on Citas page appointment cards
**Status:** 💡 Idea — needs investigation
 
The `doctor_name` field doesn't always populate correctly on the AppointmentsPage list. It works correctly on `PatientProfilePage` (appointment history tab), so the join query that works there should be compared against the one used in `getAllAppointments` (AppointmentsPage's data source).
 
**New observation (June 13):** Inconsistent — 3 of 4 test appointments showed "Dr. Administrador" correctly, but a newly-created 4th appointment showed "Dr. —". This suggests it might not be a query issue at all, but possibly a frontend state/refetch issue (stale doctor list, or the new appointment object returned from `createAppointment` not including `doctor_name`/`specialty` the way `getAllAppointments` does). Worth checking what fields `POST /api/appointments` actually returns vs. what `GET /api/appointments` returns — if `createAppointment` in the model returns a raw `INSERT ... RETURNING *` without the joins, the newly-created appointment object in frontend state would be missing `doctor_name`/`specialty` until the next full refetch.
 
---
 
### 2. Timezone — date filtering bug (RESOLVED June 13) + display offset (needs reverification)
**Status:** ✅ Date bug fixed / ⚠️ Display offset needs reverification
 
**Fixed:** `toDateInputValue()` was using `date.toISOString().split('T')[0]`, which converts to UTC. Honduras/El Salvador is UTC-6 with no DST, so any local time after 6:00 PM rolls over to "tomorrow" in UTC. This caused "Citas de hoy" to show 0 on the dashboard and appointments to "disappear" from the Citas page after 6 PM, because the date filter (`DATE(a.scheduled_at) = $1`) was being compared against tomorrow's date.
 
**Fix applied** in both `AppointmentsPage.tsx` and `DashboardPage.tsx`:
```typescript
const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```
This uses local date components instead of UTC, eliminating the rollover.
 
**Needs reverification:** The originally reported symptom was different — "entered 2:24pm, appeared as 9:20pm" (a ~7 hour *time-of-day* display offset, not a date rollover). After the fix, four new test appointments displayed at the exact times they were entered (9:27pm, 9:58pm, 10:59pm, 6:25pm — all matched). It's unclear whether:
- (a) the original time-offset symptom was actually the same date-bug manifesting differently, and is now resolved as a side effect, or
- (b) it was a one-off data-entry/reading mistake during initial testing, or
- (c) there's still a separate, real offset bug that just hasn't reappeared in this test batch
**Action:** Next time appointments are created/tested, deliberately note the entered time vs. displayed time for a few appointments at different times of day (morning, afternoon, evening) to confirm there's no remaining `pg` timestamp-to-JS-Date conversion issue. If it doesn't reproduce after a few more tests, downgrade this to closed.
 
---
 
### 3. Rescheduling option for existing appointments
**Status:** 💡 Idea
 
Currently appointments can only have their *status* changed (Confirmar/Completar/No asistió/Cancelar). There's no way to change the date/time of an existing appointment — to reschedule, staff would currently have to cancel and create a new one, which loses continuity (the cancelled one shows up in history as "Cancelada" even though it was really just moved).
 
**Possible approach (not yet designed in detail):** an "Reprogramar" action that opens a date/time picker, runs the same conflict-detection logic as creation, and updates `scheduled_at` in place — possibly logging the change (old time → new time) somewhere for audit purposes, since this is medical scheduling.
 
---
 
### 4. Loading skeletons instead of blank "Cargando..." text
**Status:** 💡 Idea
 
Every page currently shows a centered "Cargando..." text while fetching. A skeleton UI (gray placeholder shapes matching the eventual layout) would feel more polished and reduce perceived load time. Applies to: InventoryPage, AppointmentsPage, PatientsPage, PatientProfilePage, DashboardPage.
 
This is purely cosmetic — good candidate for the dedicated UI/UX polish pass (see item 8).
 
---
 
### 5. Auto-select doctor in medical record form for logged-in doctor role
**Status:** 💡 Idea
 
In `PatientProfilePage.tsx`, the "Nuevo Registro" (medical record) form has a free dropdown to select which doctor the record belongs to. This is correct for admin/recepcionista entering on behalf of a doctor, but if the logged-in user's role is `doctor`, the form should auto-select (and possibly lock) their own doctor record as the default.
 
**Implementation note:** this requires re-adding `useAuth()` to `PatientProfilePage.tsx` (it was removed earlier as unused — see Resolved section). When implementing, match `user.id` against `doctors.user_id` (same pattern used in `DashboardPage.tsx`'s role-aware appointment filtering) to find the doctor's own `doctor_id`.
 
---
 
### 6. Medical records: editable vs. append-only (design decision needed)
**Status:** 💡 Idea — needs a decision, not just code
 
Currently medical records can be created but not edited. Industry standard for medical records is **append-only with addendums** — you never silently edit a past diagnosis/treatment, you add a new entry that supersedes or corrects it, preserving the original for legal/audit reasons.
 
**Decision needed:** do we formalize this as the actual design (and maybe add an "addendum to record X" relationship), or do we want a true edit capability for the mockup phase with the understanding that production will need the addendum model? This affects the data model (`medical_records` table may need a `supersedes_id` or `amendment_of` column) so worth deciding before too much UI is built around either assumption.
 
---
 
### 7. sessionStorage vs. localStorage — pending client input
**Status:** 💡 Idea — blocked on client answer
 
Currently using `localStorage` for the JWT and user object (see main docs "Critical rules"). This was a pragmatic choice during development (avoids the origin/session quirks we hit early on), but the *correct* choice depends on whether devices are shared between staff (favors `sessionStorage` — logs out when the browser tab/session ends) or personal-to-each-staff-member (favors `localStorage` — persists across sessions, less friction).
 
This is question #2 in the roadmap's "Decisiones Pendientes del Cliente" — blocked until the client meeting.
 
---
 
### 8. General UI/UX prettification pass
**Status:** 💡 Idea
 
The current UI is intentionally functional/basic — Tailwind defaults, minimal custom styling, no animations beyond basic `transition-colors`. Once all core modules are functionally complete (after Pharmacy POS, ideally), a dedicated pass to:
- Improve visual hierarchy and spacing
- Add subtle animations/transitions
- Possibly introduce a more distinctive visual identity (the client may want branding — colors, logo — once official hospital name/branding is confirmed)
- Mobile responsiveness (this one isn't purely cosmetic — it's a hard requirement, see main docs)
---
 
### 9. Past-due appointment indicator + creation-time warning (DESIGNED — ready to implement)
**Status:** 📐 Designed — full approach agreed, not yet implemented
 
**Problem:** Nothing currently prevents creating a `scheduled` appointment for a date/time that has already passed (e.g., accidentally booking "today at 2pm" when it's currently 9pm). Once created, such an appointment just sits there indefinitely with status `scheduled`, which is misleading on the day's schedule.
 
**Agreed design — two independent pieces, both frontend-only:**
 
**Piece 1 — Creation-time warning (not a hard block):**
When submitting "Nueva Cita" in `AppointmentsPage.tsx`, if the chosen `scheduled_at` is earlier than `new Date()`, show a confirmation dialog before submitting: *"Esta cita es para una hora que ya pasó. ¿Desea continuar?"* If confirmed, proceed with creation as normal — no backend changes needed. This gives staff freedom for legitimate cases (e.g., backfilling a walk-in) while catching likely typos.
 
**Piece 2 — Display-time "Atrasada" badge (derived, not stored):**
Add a helper function `isPastDue(appointment)`:
```typescript
const isPastDue = (appt: Appointment) =>
  appt.status === 'scheduled' && new Date(appt.scheduled_at) < new Date();
```
Anywhere appointment status badges are rendered (AppointmentsPage list, DashboardPage preview, PatientProfilePage history tab), if `isPastDue(appt)` is true, render an additional "Atrasada" badge **alongside** (not replacing) the "Programada" badge.
 
**Why this approach and not a stored status:** Explicitly rejected storing "past_due" as an enum value or boolean column requiring a cron job / background process to "promote" appointments. That introduces timing edge cases (race conditions between a cron job and a staff member clicking "Confirmar" at nearly the same moment) for something that's a pure function of data we already have. The derived approach means the badge appears/disappears automatically the instant `status` changes via the existing Confirmar/Completar/No asistió/Cancelar buttons — zero extra state to manage.
 
**Implementation scope when picked up:** small — one shared helper function (could live in a shared utils file since it's needed across 3 pages now — first genuinely shared appointment-related helper, might be a good moment to create `frontend/src/utils/appointments.ts` or similar rather than duplicating in each page), one confirmation dialog in the creation form, one new badge render in 3 places.
 
---
 
### 10. Rate limiter uses in-memory store — needs Redis (or similar) before horizontal scaling
**Status:** 💡 Idea — production blocker if scaling horizontally
 
`express-rate-limit` is currently using its default **in-memory store**. The counters live in the Node process's memory, which means:
- Restarting the backend resets all rate-limit counters (noticed during security testing June 14 — restarting the backend cleared a login lockout)
- **More importantly:** if production ever runs more than one backend instance (load balancer, or PM2 cluster mode — which IS in the Phase 5 plan), each instance keeps its own separate counter. An attacker's requests get spread across instances, so the effective limit becomes `5 × number_of_instances` instead of `5`. The protection silently weakens.
**Fix before production (if scaling horizontally):** back the rate limiter with a shared store, typically **Redis**, via `rate-limit-redis`. All instances then share one counter. Not needed for single-instance dev, but must be done before any multi-instance deploy. Tie this to the Phase 5 PM2/production work in the roadmap.
 
---
 
### 11. Standardize error handling — forward to global handler via next(error) in ALL controllers
**Status:** 📐 Designed — pattern established, partially applied
 
**Context:** During the security audit (June 14), injection tests on inventory surfaced that `getItem` and `createItem` were catching DB errors locally and blanket-returning HTTP 500, even for client-input errors (malformed UUID → Postgres `22P02`; nonexistent FK → `23503`). These should be 400s, not 500s.
 
**Fix applied to `getItem` and `createItem` only:** changed signature to include `next: NextFunction`, replaced the local `console.error` + `res.status(500)` with `next(error)`, letting the global error handler (`error.middleware.ts`) decide the status from the Postgres code. Also extended the global handler to map `22P02` → 400 (it already handled `23505` → 409 and `23503` → 400).
 
**Still to do (the pattern, applied everywhere):** every other controller still uses the old swallow-into-500 pattern — `getItems`, `getLowStock`, all of `appointments.controller.ts` (patients/doctors/appointments/medical records), `auth.controller.ts`. During the dedicated code-cleanup/polish pass, convert them all to the `next(error)` pattern so error responses are consistent and accurate across the whole API. The global handler already has the logic; controllers just need to forward.
 
**Why not do it all now:** not blocking, and it's a mechanical repetitive change best done as one focused pass rather than interleaved with feature work. The two we fixed prove the pattern; the rest can follow the same template.
 
**Note:** the temporary `console.error('GET ITEM ERROR'/'CREATE ITEM ERROR', ...)` debug lines added during diagnosis were replaced by `next(error)` — so they're gone from those two. If other controllers still have temporary debug logging from earlier sessions, clean those up in the same pass.
 
---
 
### 12. `patients.gender` is NOT NULL in DB but optional in the frontend form
**Status:** 💡 Idea — minor bug, found during audit
 
While testing patient creation, a payload without `gender` produced a `23502 null value in column "gender" violates not-null constraint` → currently surfaces as a 500. Two parts to fix:
1. **Robustness:** this should be a 400, not 500 — part of the broader backlog item 11 (`next(error)` + possibly teach the global handler about `23502`).
2. **Actual decision:** either make `gender` nullable in the DB (if it's genuinely optional info, like `date_of_birth` already is — see the precedent from earlier), or make it required in the frontend "Nuevo Paciente" form with a clear `*`. Right now the DB and the UI disagree about whether this field is required, and a real user leaving it blank would currently get a confusing 500.
---
 
### 13. Inconsistent soft-delete conventions across tables
**Status:** 💡 Idea — consistency/design note, found during audit
 
`patients` uses a `status` enum (`active`/`inactive`/...) for soft-delete. `inventory_items` uses a separate `is_active` boolean. Both achieve the same goal (hide without hard-deleting) but with different column shapes — `appointments` has its own `appointment_status` enum for a different purpose (lifecycle, not soft-delete) which adds a third pattern to keep straight.
 
Not urgent — both whitelisted `update*` functions now correctly exclude their respective soft-delete field, so there's no security issue. But worth deciding on one convention (probably `is_active boolean` everywhere, since "active/inactive" doesn't need the flexibility of an enum) before more tables are added in Phase 3/4 — retrofitting later means another migration + model sweep.
 
---
 
### 14. `updateStatus` always overwrites `cancelled_by`/`cancellation_reason`/notes regardless of new status
**Status:** 💡 Idea — minor logic quirk, found during audit (not a security issue)
 
`updateStatus` in `appointments.model.ts` always runs:
```sql
SET status = $2, cancelled_by = $3, cancellation_reason = $4, notes = COALESCE($5, notes), updated_at = NOW()
```
This is explicit-column and parameterized, so it's **safe** — but `cancelled_by`/`cancellation_reason` get set (likely to `NULL`) even when the new status is `confirmed` or `completed`, not just `cancelled`. Currently harmless since the frontend only sends those fields on actual cancellation, but worth tightening — e.g. only include those columns in the SET when `status === 'cancelled'` — so the function's behavior matches its name regardless of what the frontend sends.

15. Inventory FRONTEND lot-awareness — RESOLVED this session

Status: ✅ Done (was deferred during POS build, now fixed)

The lot restructure broke the Inventario page (it spoke the old flat shape).
Rebuilt fully: service/hook updated, one-step create (product → initial lot),
new LotsModal (view/add lots), lot-aware TransactionModal (pick a lot, guards
no-lots case), edit fixed for numeric-string coercion. Move to Resolved.


16. Lot expiry date display offset (UTC-6)

Status: ✅ Handled via convention — keep in mind for new UI

date columns return as ...T06:00:00.000Z (local midnight in UTC-6). Solution
applied: display date-only via .slice(0,10) — never pass through timezone-
shifting logic. Same family as the banned .toISOString().split('T')[0]. Any
NEW place that displays a lot/expiry date must follow this.


17. recordTransaction / lot hardening

Status: 🔧 Partially done — one item remains

DONE: negative-stock guard added (subtraction movements lock the lot with
FOR UPDATE, verify sufficient quantity, reject via StockError→400).
performed_by now server-injected.
REMAINING: recordTransaction still doesn't verify the passed lot_id
actually belongs to the passed item_id. Not exploitable in normal UI flow
(the modal only offers that item's lots), but a hand-crafted request could
pass a mismatched pair. Add a guard (lot.item_id === item_id) when hardening.
Also: zero-quantity lots are never deactivated/swept — they accumulate. FEFO
correctly skips them (quantity > 0), so cosmetic, but consider an
auto-deactivate or periodic sweep.


18. Role-based access control pass — nav + routes (COMMITTED, not optional)

Status: 📐 Planned — Isaac confirmed this WILL happen, as one coordinated pass

Currently neither the sidebar nav nor most module routes are role-gated.
Must be done across BOTH layers — a hidden menu item is NOT security:

FRONTEND (cosmetic/UX): add roles?: string[] to Sidebar NavItem; filter
navItems by user.role. Hide POS/Inventario from purely clinical roles, etc.

BACKEND (actual enforcement): apply authorize(...) middleware per module
route group. A hidden link still leaves the endpoint callable.


POS (/api/pos): admin + recepcionista (cashier). NOT doctor/enfermera.
Map the four roles (admin/doctor/recepcionista/enfermera) to module access
deliberately — may need client input on who-does-what.


Do as ONE pass for consistency, not piecemeal per module.


19. Clearing a category on edit doesn't persist (PINNED)

Status: 🔧 Known bug, low priority — pinned, move on

Editing a product and clearing its category "succeeds" but reverts to the
previous category on reload. Setting/changing works; only clearing to empty
fails. Attempted fix (didn't fully resolve): UpdateItemSchema uses nullableUuid
(""→null); model update filter drops undefined but keeps null; frontend sends
category_id: form.category_id || null. Something still isn't writing NULL —
re-check F12 payload to see if null actually reaches the backend or gets
stripped (possible Zod .partial()/.extend() interaction, or the select value
arriving as "" and the preprocessor producing null but the model still not
including it). Impact: minor — reassigning categories works; only
un-categorizing is stuck.


20. POS receipt display (next-task candidate)

Status: 💡 Idea — lastSale is captured but unused

PosPage.tsx stores the completed sale in lastSale state but renders nothing.
Either build a receipt view/modal (consume lastSale — show lines, lots, ISV
breakdown, payment, change) or remove the dead state. Natural lead-in to the
eventual ESC/POS thermal printing (blocked on printer model).


21. Corte de Caja (shift reconciliation)

Status: 💡 Idea — deferred, needs a shift/drawer concept

payments table supports it (GROUP BY method, SUM over a time window), but a
real Corte ties to an explicit shift (open drawer → close drawer). Needs its
own table/concept. Must match the client's existing report format. Build when
the reporting layer is tackled.

22. Multi-role / capability-preset upgrade path (future)

Status: 💡 Idea — architecture note, not needed yet

Current RBAC is single-role: user.role is one value, PERMISSIONS maps
capability→[roles]. Adding/removing roles is trivial (edit the map). But
HYBRID roles (one person who is e.g. both farmaceutico AND bodega) don't fit
— you'd have to create a combined role, which causes combinatorial explosion.

Upgrade path when needed: flip to permission-centric model.


user.roles becomes string[] (was string)
map becomes ROLE_PRESETS: role→[capabilities] (named bundles)
can(cap) checks if cap is in the UNION of the user's roles' presets
Call sites (can('pos') on routes) DON'T change — only the helper resolution
and the AuthPayload type. Contained refactor, not a rewrite, BECAUSE the
logic is centralized. This is the payoff of the single-map design.


Trigger: first time the client says "person X does two jobs."
 
23. Doctor↔patient access model (DESIGNED, blocked on client policy)

Status: 📐 Designed / blocked — needs client decision

CURRENT BEHAVIOR: open — every clinical role (doctor/enfermera/recepcionista)
sees every patient. getPatients returns all; getPatient returns any by id.
No assignment/scoping exists.

CLIENT CONTEXT (important for framing the question): today patient records are
PAPER-ONLY. A doctor who wants a record must REQUEST it and have it sent. So
their real-world model is request-based / gated access, not open access. When
asking the client, frame it as: "replicate the controlled request-based access
you have now, or open it up since digital makes sharing trivial?" — they may
instinctively want to preserve controlled access.

TWO MODELS:


Open: any doctor sees any patient (simple, good for small cover-for-each-other
clinics). Current behavior.
Assignment: patients linked to one OR SEVERAL doctors (many-to-many); a doctor
sees only their patients; admin/reception see all.


IMPLEMENTATION IF ASSIGNMENT CHOSEN (clean, mirrors the inventory scope pattern
we already built and proved):


New doctor_patients join table (doctor_id, patient_id) — many-to-many.
Patient queries gain a scope filter: WHERE patient is assigned to req.user
(for doctors) OR req.user is admin/recepcionista (see all). Same
filter-in-query approach as inventory scope — disallowed rows never leave the
DB. Single-patient endpoints get a guard like scopeGuardOk → 404 on
unassigned (no existence leak).
This is the SAME pattern as inventory dual-scope, so it's well-understood work.


DO NOT build until client answers. Building the wrong model is harmful either
way (doctors can't see needed patients, OR compliance gap).

24. Persist last route across refresh (with role validation)

Status: 💡 Idea — UX nicety, do properly later

Currently refresh resets to a default path. Nicer: remember the screen the user
was on (persist currentPath to localStorage, restore on load). CATCH: must
validate the restored path against the current role before restoring — a stored
'/inventario' from a previous session/role must NOT drop a doctor onto a
forbidden page. Restore saved path ONLY IF role is allowed to see it, else
fall back to '/'. Tie the allowed-path check to the same role→page map used by
the renderPage guard (item 25) so there's one source of truth.

25. Proper route guarding / React Router migration

Status: 💡 Idea — partially mitigated now, full fix in Phase 5

App uses a hand-rolled state router (currentPath + switch in App.tsx), not React
Router. A real router gives URL handling, refresh persistence, and declarative
route guards for free. Phase 5 migration item. For now we added: (a) default
path '/' instead of '/inventario', (b) a renderPage role-guard that redirects
forbidden paths to '/' (belt-and-suspenders; sidebar already hides links and
backend 403s data). When migrating to React Router, fold these into proper
route guards and retire the manual checks.

26. Dashboard / page error toasts on 403 (minor polish)

Status: 💡 Idea — low priority
With RBAC live, if a role ever does reach a forbidden page (or a stale fetch
fires), the page shows "Error al cargar ...". Mostly prevented now by sidebar
hiding + renderPage guard + capability-gated dashboard fetches. But individual
pages could distinguish 403 ("no access") from real errors and show a cleaner
"no tiene acceso" state instead of a generic load error. Cosmetic.


27. Categories are not scope-aware (data hygiene / UX)

Status: 💡 Idea — design decision, possibly needs client input. NOT a security issue.

The category list (cleaning, consumables, equipment, medication, office supplies)
is global — shown for both pharmacy and hospital items. So a pharmacy item can be
filed under "office supplies" and a hospital item under "medication". Categories
are cosmetic (the scope column enforces the real boundary; categories never
gate access), so this is data hygiene + UX polish, not a vulnerability.

Three options:


Global categories (current) — loose, allows nonsensical pairings.
Scope-scoped categories — each category belongs to a scope; create form only
shows categories matching the chosen scope. Cleaner, more structure.
Treat categories as free labels, don't care.


Open question for client: what categories do they actually use per inventory
(pharmacy vs hospital)? The listed ones may be placeholder/mockup seed data, not
real client categories — confirm before investing in option 2.

Defer until client confirms their real category taxonomy.

28. JWT hardening (scoped — next security session)

Status: 📐 Scoped / not started — the last item from the security pass

The whole auth system rests on JWT_SECRET. Currently the secret is the literal
'clinic_super_secret_change_this_in_production_2024' and tokens can't be revoked
before natural expiry. Four pieces, roughly in order:


CHANGE JWT_SECRET to a strong random value (trivial; invalidates all live
tokens, so do it deliberately — everyone re-logs in). Pure win, no design
needed. Could even be done standalone before the rest.
TOKEN REVOCATION — the real design decision. Need: a fired/disabled employee's
token must stop working immediately, not at expiry. Options to weigh:

token_version: int column on users, embedded in the JWT; bump it to
invalidate all that user's tokens. Simple, one extra check per auth, no
storage. Good default for a single-clinic system.
short access token + refresh token: industry standard, limits blast radius,
but more moving parts (refresh endpoint, rotation, storage).
revocation blocklist: most flexible, needs a store (Redis/db).
Lean: token_version for this system's scale. Decide fresh.



SHORTER EXPIRY paired with refresh (if we go that route) to limit how long a
leaked token is usable. Current expiry is long-ish.
PRODUCTION NOTES: secret via env (never committed); if the app ever scales to
multiple backend instances, both rate-limiting AND token revocation need a
shared store (Redis) instead of in-memory/per-instance. Phase 5.


Why deferred: revocation is a genuine architecture choice, not a quick fix —
deserves a fresh head, not the tail of a marathon session.

## Resolved
 
Items completed, with a brief note for historical reference.
 
### ✅ Mass-assignment + column-name SQL-injection in dynamic UPDATE helpers (CRITICAL — found & fixed June 14-15)
**The most serious vulnerability found in the security audit.** Two model functions — `updatePatient` (appointments.model.ts) and `updateItem` (inventory.model.ts) — built their SQL `SET` clause dynamically from `Object.keys(data)`, where `data` was the raw client request body. Two distinct problems:
 
1. **Mass assignment:** any client could update *any* column by including it in the JSON body, regardless of what the UI form exposed. Confirmed by exploit: sent `{"status": "inactive"}` to `PUT /api/appointments/patients/:id` and successfully soft-deleted a patient (it vanished from the list) — `status` is not a field any form exposes. Same hole existed in `updateItem` (could inject `quantity`, bypassing the `recordTransaction` audit trail, or `is_active` to soft-delete).
2. **Column-name SQL injection:** every other query in the codebase parameterizes *values* (`$1`, `$2`), but here the column *names* came from `Object.keys(req.body)` and were concatenated straight into the SQL string. Values were parameterized, but keys were not — a malicious key could break out of the intended query structure.
**Fix:** rewrote both functions to use a hardcoded **whitelist** of editable columns. Client input is filtered against the whitelist (`Object.entries(data).filter(([key]) => allowedFields.includes(key))`) before building the query, so column names can only ever come from our own constant, never from client input. This closes both the mass-assignment hole and the column-name injection vector at once. Added an empty-guard (if no whitelisted fields remain after filtering, return the record unchanged rather than building broken SQL).
- `updatePatient` whitelist: the 12 demographic fields only — excludes `status`, `id`, `created_at`, `updated_at`.
- `updateItem` whitelist: 10 editable attributes — excludes `id`, `created_at`, `updated_at`, `is_active` (soft-delete is `deleteItem`'s job), and critically `quantity` (stock changes ONLY through `recordTransaction` to preserve the audit trail).
**How it was found:** SQL-injection testing surfaced unrelated 500s on inventory; investigating those led to noticing the `Object.keys(data)` pattern, then a `grep -rn "Object.keys\|Object.entries"` across the backend found both instances. **Lesson reinforced:** when you find a vulnerability that came from a *pattern*, grep the whole codebase for that pattern immediately — fixing only the first instance found would have left the inventory hole open. The other dynamic UPDATEs in the codebase (`updateStatus`, `deleteItem`, `recordTransaction` stock update, `auth last_login`, notifications) were all checked and confirmed safe (explicit hardcoded columns, parameterized values).
 
### ✅ Inventory controller error handling → next(error) (June 14)
See active item 11 for the broader pattern. `getItem` and `createItem` were converted from swallow-into-500 to `next(error)`, and the global handler learned `22P02` (malformed UUID → 400). Remaining controllers still to convert in the cleanup pass.
 
 
### ✅ Notifications badge in sidebar
Implemented — red badge with unread count next to "Citas" nav item, polled every 60s at App level, passed down through Layout → Sidebar.
 
### ✅ "Today" date filtering UTC bug
See item 2 above — `toDateInputValue` now uses local date components instead of `.toISOString()`. Fixed June 13, 2026.
 
### ✅ Removed unused `useAuth()` import from PatientProfilePage
Was destructured but never used. Removed deliberately rather than left as a placeholder — the reasoning was that unused variables should be added back *when* the feature that needs them is built (see item 5 above, which will need to re-add this), with the import living next to the code that uses it rather than sitting unused for an indeterminate time.
 
### ✅ Category required validation on inventory creation
Initially looked like a bug (empty `category_id` → "Categoría inválida" error), but on discussion this is correct behavior — category is intentionally required. No fix needed, just confirmed as intentional.

### ✅ Lot-based inventory restructure + Pharmacy POS core (June 17–19, 2026)

Replaced flat per-product stock with per-lot tracking (migration 05): each lot
has its own expiry + cost; product total is computed (SUM of lots), never
stored. Built the POS data layer (migration 06: sales/sale_items/payments) and
the is_exempt flag (07). POS sale engine: atomic createSale with server-side
FEFO multi-lot splitting, FOR UPDATE oversell protection, per-line ISV,
SaleError→400 on insufficient stock/underpayment, in-memory receipt (no
post-commit read-back — fixed a bug where a committed sale could report failure
via a stale read query using a nonexistent u.name column). Verified end-to-end
incl. both rollback paths. POS cashier frontend (PosPage + CheckoutModal) and a
fully lot-aware Inventario rebuild. Fiscal columns are SHAPE-ONLY, blocked on
client CAI. Several bugs squashed along the way: StrictMode double-toast
(side-effect in setState updater), negative stock (no floor check on
subtraction), numeric-string coercion on edit, empty-string UUID rejection.

Lot-based inventory restructure + Pharmacy POS core (June 17–19, 2026)

Replaced flat per-product stock with per-lot tracking (migration 05): each lot
has its own expiry + cost; product total is computed (SUM of lots), never
stored. Built the POS data layer (migration 06: sales/sale_items/payments) and
the is_exempt flag (07). POS sale engine: atomic createSale with server-side
FEFO multi-lot splitting, FOR UPDATE oversell protection, per-line ISV,
SaleError→400 on insufficient stock/underpayment, in-memory receipt (no
post-commit read-back — fixed a bug where a committed sale could report failure
via a stale read query using a nonexistent u.name column). Verified end-to-end
incl. both rollback paths. POS cashier frontend (PosPage + CheckoutModal) and a
fully lot-aware Inventario rebuild. Fiscal columns are SHAPE-ONLY, blocked on
client CAI. Several bugs squashed along the way: StrictMode double-toast
(side-effect in setState updater), negative stock (no floor check on
subtraction), numeric-string coercion on edit, empty-string UUID rejection.