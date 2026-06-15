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

### 15. Inventory FRONTEND not yet lot-aware (DEFERRED — must fix)
**Status:** 🔧 Deferred — backend done, frontend broken until addressed

The lot restructure (migration 05) changed the backend completely but the
Inventario frontend still assumes the old flat shape:
- Create-item form still sends `quantity`/`expiry_date` (now rejected/ignored)
- No lot UI exists: no create-lot form, no per-product lot list, no FEFO display
- Item list reads `quantity` — still works (it's now computed server-side) but
  there's no way to ADD stock from the UI anymore (stock = lots, lots have no UI)

Planned to be built together with the POS lot-picker (shared component) rather
than twice. Until then the Inventario page can view products but not manage stock.

### 16. Lot expiry date display offset (UTC-6)
**Status:** 💡 Idea — cosmetic, fix at UI build time

`date` columns return as `...T06:00:00.000Z` (local midnight rendered in UTC-6).
Harmless in storage/queries. But when displaying lot expiry in the UI, format the
date portion only — do NOT pass through anything timezone-shifting. Same family as
the banned `.toISOString().split('T')[0]` trap. Format from the `YYYY-MM-DD` part
directly.

### 17. recordTransaction / createLot hardening (deferred)
**Status:** 💡 Idea — not exploitable in normal flow, harden later
- `recordTransaction` doesn't verify the passed `lot_id` actually belongs to the
  passed `item_id` — a mismatched pair would update the wrong lot's stock. Add a
  guard (check lot.item_id === item_id) before the update.
- `createLot` and the createLot-internal transaction hardcode `performed_by: 'system'`.
  Should pass the authenticated user (req.user) from the controller down, like the
  other audited operations.
 
---
 
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