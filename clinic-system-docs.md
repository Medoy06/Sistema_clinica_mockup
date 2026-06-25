Clinic Management System — Project Documentation
Version: 0.4 (Mockup Phase)
Last Updated: June 14, 2026
Status: In active development

Table of Contents

Project Overview
Tech Stack
Architecture
What's Been Built
What's Pending
Security Measures
Polish List
Development Workflow
Environment Setup
Module Roadmap
Client Requirements Status
File Structure
Instructions for Continuing in a New Chat


Project Overview
A full-stack hospital management system being built for a private Honduran hospital — Hospital / Farmacia Vida (placeholder name, official name pending). The system covers two operational areas: the main hospital and an attached pharmacy. The current phase is a mockup/prototype — built with a general/multi-specialty structure that will be adapted to the final client's specific needs once all requirements are confirmed.
Client Context

Medium-sized private hospital in Honduras
Currently running two legacy systems: LisaSalud (hospital) and a2 Punto de Venta (pharmacy, ~1,888 products)
Staff communicates via WhatsApp — this system replaces that
Pharmacy serves hospital patients + general public, has barcode scanner and receipt printer (models TBD)
~12 doctors across pediatrics, general medicine, dentistry, and other specialties
Variable doctor schedules (not all doctors present every day)
Existing email domain (e.g. @nombredelhospital) — client wants to keep it if possible
Hardware: Windows 10/11 (some older machines, possibly Windows 8 in pharmacy)
LAN network in place, WiFi in necessary areas
Staff will use personal smartphones — mobile UX is mandatory, web app (not native)
System will likely be hosted externally (cloud)
SAR (Servicio de Administración de Rentas) fiscal compliance is legally required for all invoicing — current invoice series FARMMI000, ISV 15% with gravable/exento separation
a2 data is largely corrupted (broken delete function over years) — migration plan is a clean Excel import template, not data migration
LisaSalud migration unlikely — much data is on paper anyway; recommend starting fresh

Language Policy

All code, variable names, database columns, function names: English
All UI text, labels, error messages, notifications, receipts, reports: Spanish
Status enums stay in English (e.g., 'scheduled', 'confirmed') but are mapped to Spanish in the frontend

Project Scale & Approach
This is realistically a multi-phase, months-long project (hospital system + pharmacy POS + lab + comms), being built solo by a CS student (Isaac) as his first real client project. Phased delivery approach:

Phase 1 (Pharmacy POS + inventory with lots): POS core COMPLETE (engine +
cashier frontend, verified). Inventory now lot-based. SAR fiscal layer is
shape-only, BLOCKED on client CAI. ESC/POS printing BLOCKED on printer model.

Phase 2: Hospital clinical area — patient records, appointments, prescriptions to pharmacy
Phase 3: Laboratory, communications, reports/exports, data migration
Phase 4: Production hardening, mobile optimization, deployment

A full requirements document (requerimientos-sistema-hospitalario.docx) was generated in Spanish with ~80 questions across 13 sections (general, hospital clinical, lab, pharmacy, SAR/fiscal, communications, infrastructure, reports) — currently in clean/blank state (all "Pendiente") to be filled during the next client meeting.

Tech Stack
LayerTechnologyRuntimeNode.js v24 (via nvm)BackendTypeScript + ExpressDatabasePostgreSQL 16 (Docker)AuthJWT (JSON Web Tokens) + bcryptValidationZod v3 (pinned — v4 has breaking changes)FrontendReact + TypeScript + ViteStylingTailwind CSSHTTP ClientAxiosNotifications (UI)react-hot-toastContainerizationDocker + Docker ComposeVersion ControlGit + GitHubDev EnvironmentWSL2 (Ubuntu) on Windows

Architecture
Backend — Separation of Concerns
backend/src/
├── routes/         → URL paths and HTTP method definitions only
├── controllers/    → Request/response logic; calls models, sends responses
├── middleware/     → Auth checks, validation, error handling
├── models/         → All database queries (SQL lives here, nowhere else)
└── config/         → DB connection, environment setup
Frontend — Layered Structure
frontend/src/
├── components/
│   ├── layout/     → Sidebar, Layout shell
│   └── ui/         → Reusable components (ConfirmDialog, EditItemModal, TransactionModal)
├── pages/
│   ├── auth/       → LoginPage
│   ├── inventory/  → InventoryPage
│   ├── appointments/ → AppointmentsPage
│   └── patients/   → PatientsPage, PatientProfilePage
├── services/       → API call functions (auth, inventory, appointments)
├── hooks/          → Custom React hooks (useInventory, useAppointments)
└── context/        → AuthContext (global auth state)
Database Connection
PostgreSQL connections managed via a connection pool (pg library). All queries use parameterized queries ($1, $2) to prevent SQL injection.

Environment Details
Critical Environment Issue
The dev setup runs on Windows with WSL2 + Docker Desktop. The database IP must be set correctly in backend/.env:

DB_HOST should be set to the nameserver IP from /etc/resolv.conf inside WSL (typically 10.255.255.254)
Docker container exposes PostgreSQL on port 5433 (not 5432) because a native Windows PostgreSQL installation occupies 5432
A startup script handles this automatically

Startup Script
Located at ~/clinic-system/dev-start.sh:
bash#!/bin/bash
echo "🏥 Iniciando Sistema Clínica..."
cd ~/clinic-system
docker compose up -d
sleep 3
DB_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "📡 DB Host detectado: $DB_IP"
sed -i "s/^DB_HOST=.*/DB_HOST=$DB_IP/" ~/clinic-system/backend/.env
sed -i "s/^DB_PORT=.*/DB_PORT=5433/" ~/clinic-system/backend/.env
echo "✅ Backend .env actualizado"
echo ""
echo "▶  Inicia el backend:  cd ~/clinic-system/backend && npm run dev"
echo "▶  Inicia el frontend: cd ~/clinic-system/frontend && npm run dev"
Run this every morning before starting work: ~/clinic-system/dev-start.sh
IMPORTANT: Docker Desktop must be running on Windows (not just installed) before this script works. If you reboot Windows, Docker Desktop doesn't auto-start unless configured to. Always run docker compose ps from ~/clinic-system (not a subfolder) to verify the container state — running from the wrong directory gives "no configuration file provided".
Environment Variables (backend/.env)
PORT=3000
DB_HOST=10.255.255.254   ← auto-updated by startup script
DB_PORT=5433
DB_NAME=clinic_db
DB_USER=clinic_user
DB_PASSWORD=clinic_password
JWT_SECRET=clinic_super_secret_change_this_in_production_2024
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=12
Docker Compose (docker-compose.yml)
Located at project root ~/clinic-system/docker-compose.yml:
yamlservices:
  postgres:
    image: postgres:16
    container_name: clinic_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: clinic_db
      POSTGRES_USER: clinic_user
      POSTGRES_PASSWORD: clinic_password
    ports:
      - "0.0.0.0:5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d

volumes:
  postgres_data:
Note: ports must be a sibling of environment, NOT nested inside it — this caused a real bug once (YAML indentation).

What's Been Built
✅ Infrastructure & Environment

WSL2 + Ubuntu dev environment
Node.js v24 via nvm
PostgreSQL 16 in Docker with persistent storage
Automated startup script (dev-start.sh)
Git repository initialized and pushed to GitHub
TypeScript configured with strict mode

✅ Database Schema
Migration 01 — Inventory (database/init/01_inventory.sql):

suppliers — supplier management
categories — product categories (seeded: Medications, Consumables, Equipment, Office Supplies, Cleaning)
inventory_items — products with lot tracking, expiry dates, ISV exempt flag
inventory_transactions — append-only audit log of every stock movement

Migration 02 — Auth (database/migrations/02_auth.sql):

users — staff accounts with role-based access
audit_logs — security event logging (login attempts, user creation, etc.)
Default admin: admin@clinica.hn / Admin1234!
Roles: admin, doctor, recepcionista, enfermera

Migration 03 — Appointments (database/migrations/03_appointments.sql):

patients — patient profiles (date_of_birth is nullable — fixed post-migration)
doctors — doctor profiles linked to users table (is_active column, NOT is_available)
doctor_schedules — weekly availability per doctor
appointments — bookings with status tracking. appointment_status enum values: scheduled, confirmed, cancelled (two L's — was fixed from canceled), completed, no_show
appointment_notifications — notification log per user (column is is_sent, NOT is_read)
Seeded: one doctor (Medicina General) linked to admin user, Mon-Fri 8am-5pm schedule

Migration 04 — Medical Records (database/migrations/04_medical_records.sql):

medical_records — diagnosis, treatment, prescription, notes per visit; linked to patient, doctor, optionally an appointment
Indexes on patient_id, doctor_id, appointment_id

inventory_items (CHANGED)

Dropped quantity and expiry_date (moved to lots). min_quantity/max_quantity
are now numeric(10,3). Added is_exempt boolean NOT NULL DEFAULT false (ISV).
Total stock is computed at query time as COALESCE(SUM(lots.quantity), 0) — never
stored on the item.

inventory_lots (NEW — migration 05)

id           uuid PK
item_id      uuid FK → inventory_items (ON DELETE CASCADE)
lot_number   varchar(100) NOT NULL DEFAULT 'SIN LOTE'
expiry_date  date (nullable — SIN LOTE stock often has none)
quantity     numeric(10,3) NOT NULL DEFAULT 0
unit_cost    numeric(10,2) NOT NULL   (per-batch cost, for margin)
is_active    boolean DEFAULT true
created_at / updated_at
indexes: (item_id), (item_id, expiry_date)  ← FEFO ordering

FEFO order: ORDER BY expiry_date ASC NULLS LAST, created_at ASC.

as of 6/19/2026:

inventory_transactions (CHANGED)

Added lot_id uuid FK → inventory_lots (ON DELETE SET NULL). quantity now
numeric(10,3). Movements target a specific lot. performed_by is the user id,
server-injected. Negative-stock guard: subtractions lock the lot (FOR UPDATE) and
reject if insufficient (StockError).

sales (NEW — migration 06)

Header. cashier_id FK→users (SET NULL), patient_id FK→patients (SET NULL, nullable
for walk-ins). Money all numeric(12,2): subtotal, isv_gravable, isv_exento,
isv_amount, discount_amount, total. status CHECK('completed'|'cancelled'|'returned').
FISCAL (SHAPE ONLY, nullable, BLOCKED on CAI): cai, document_series,
document_number, is_fiscal (default false). indexes: cashier, created_at, status.

sale_items (NEW — migration 06)

sale_id FK→sales (CASCADE), item_id FK→inventory_items (RESTRICT), lot_id
FK→inventory_lots (RESTRICT). quantity numeric(10,3). Snapshots: unit_price,
unit_cost, is_exempt copied at sale time (history never rewrites). line_total,
isv_amount. One row per product-LOT (a cart line spanning 2 lots = 2 rows).

payments (NEW — migration 06)

sale_id FK→sales (CASCADE). method CHECK('cash'|'card'|'credit'|'transfer') —
English in DB, Spanish in UI (Efectivo/Tarjeta/Crédito/Transferencia). amount
numeric(12,2). amount_tendered, change_given (cash only). reference. Split payment
= multiple rows. Corte de Caja = GROUP BY method, SUM over shift window.

✅ Backend API
Auth routes (/api/auth):

POST /api/auth/login — returns JWT token (Zod validated via LoginSchema)
GET /api/auth/me — returns current user profile
POST /api/auth/users — create user (admin only, Zod validated via CreateUserSchema)

Inventory routes (/api/inventory) — all protected:

GET /api/inventory — all active items
GET /api/inventory/:id — single item
POST /api/inventory — create item (Zod validated — category_id required, not nullable)
PUT /api/inventory/:id — update item (Zod validated)
DELETE /api/inventory/:id — soft delete
GET /api/inventory/low-stock — items below minimum
GET /api/inventory/categories — all categories
GET /api/inventory/suppliers — all suppliers
POST /api/inventory/transactions — record stock movement (Zod validated)
GET /api/inventory/:id/transactions — item transaction history

Appointments routes (/api/appointments) — all protected:

GET /api/appointments/patients — all active patients
GET /api/appointments/patients/:id — single patient
POST /api/appointments/patients — create patient
PUT /api/appointments/patients/:id — update patient
GET /api/appointments/patients/:id/medical-records — patient's medical record history
POST /api/appointments/medical-records — create medical record entry
GET /api/appointments/patients/:id/history — patient's appointment history
GET /api/appointments/doctors — all available doctors
GET /api/appointments/doctors/:id — single doctor
GET /api/appointments/doctors/:id/schedule — doctor weekly schedule
GET /api/appointments — all appointments (filterable by doctor, patient, date, status)
GET /api/appointments/:id — single appointment
POST /api/appointments — create appointment (conflict detection included)
PATCH /api/appointments/:id/status — update appointment status
GET /api/appointments/notifications/me — current user's notifications
PATCH /api/appointments/notifications/:id/read — mark notification as read (sets is_sent = true)

✅ Middleware

authenticate — verifies JWT token, attaches req.user
authorize(...roles) — role-based access control
validate(schema) — Zod validation middleware factory
errorHandler — global error handler (catches PostgreSQL error codes 23505, 23503)

✅ Frontend
Auth flow:

LoginPage — email/password form, Enter key support
AuthContext — global auth state using localStorage (switched from sessionStorage — see Known Issues)
Token stored in localStorage as clinic_token, user as clinic_user
Axios interceptor attaches token to every request automatically (must read from localStorage — must match AuthContext's storage choice)
Protected routes — unauthenticated users see only login page
Logout clears localStorage and redirects to login

Inventory module (complete):

Table view with all items, search, low stock alerts
Create new item form (inline)
Edit item modal (EditItemModal.tsx)
Stock transaction modal (TransactionModal.tsx) — purchase, consumption, adjustment, return, expired
Confirm dialog before delete (ConfirmDialog.tsx)
Toast notifications for all actions
Status badges (Normal / Stock bajo)
Prices displayed in Lempiras (L)

Appointments module (complete):

AppointmentsPage.tsx (~600 lines) — date picker (defaults to today), appointment list for selected date
Inline "Nueva Cita" form — select patient/doctor, datetime-local, duration, consultation type, reason
Inline "Nuevo Paciente" form (triggered from within appointment form) — registers patient and auto-selects them
Status management buttons: Confirmar, Completar, No asistió, Cancelar (with reason dialog)
Status badges in Spanish: Programada, Confirmada, Cancelada, Completada, No asistió
Notifications panel (bell icon, toggleable) showing appointment notifications with mark-as-read

Patient records module (complete):

PatientsPage.tsx — searchable list (by name or identity number), shows age (calculated from DOB), blood type, phone
PatientProfilePage.tsx (~365 lines) — patient header card (demographics, allergies warning banner, blood type badge), two tabs:

Historial Médico — list of medical records (diagnosis/treatment/prescription/notes per visit), "Nuevo Registro" form with doctor dropdown
Historial de Citas — full appointment history with status badges


Navigation: clicking a patient row opens profile; "Volver a Pacientes" returns to list

Notifications badge (complete):

Sidebar shows red badge with unread count next to "Citas" nav item
App.tsx polls /api/appointments/notifications/me every 60 seconds
unreadCount lifted to App level, passed through Layout → Sidebar

Dashboard / Inicio (complete):

DashboardPage.tsx (216 lines) — quick stats grid: Citas de hoy, Stock bajo, Notificaciones, Pacientes registrados
Role-aware filtering: if logged-in user's role is doctor, "Citas de hoy" filters to appointments where doctor.user_id === user.id (matched via getDoctors()); all other roles see all appointments
Quick action buttons: + Nueva Cita, + Nuevo Artículo, Ver Pacientes (navigate via onNavigate prop)
Two preview lists: today's appointments (first 5, with status badges) and low-stock items (first 5)
Client-side aggregation only — no new backend endpoints, combines getAppointments({date: today}), inventoryService.getLowStock(), getNotifications(), getPatients(), getDoctors() via Promise.all

Communications placeholder (complete):

ComunicacionesPage.tsx (20 lines) — "Módulo en construcción" empty state matching the visual pattern used elsewhere (large icon, bold status, description)
Prevents the default case (generic welcome screen) from showing when navigating to Comunicaciones, which would have looked like a confusing duplicate of the dashboard

Layout:

Collapsible sidebar with navigation (Inicio, Inventario, Citas, Pacientes, Comunicaciones)
User name and role displayed at bottom
Cerrar sesión button
Responsive shell


What's Pending
Security Audit is complete — see "Security Measures" section below for full results. Test accounts (doctor@clinica.hn, recepcionista@clinica.hn) remain in the database for ongoing RBAC testing.
Communications Module

Internal messaging (replaces WhatsApp)
Email domain integration (keep existing domain if possible)
Doctor appointment notifications (backend done, UI in Citas done — broader internal messaging still pending)
Pharmacy-hospital prescription communication

Laboratory Module

Lab test ordering by doctors
Results entry
Integration with patient records
Lab receipts and audit

Pharmacy POS Module (most complex — Phase 1 priority for client)

Point of sale interface
Barcode scanner integration (model TBD — pending client visit)
Receipt printer integration via ESC/POS protocol (model TBD)
SAR-compliant invoicing with CAI number (legally required — CAI details pending from client/accountant)
ISV calculation (15% gravable + exento separation)
Cash/card/credit payment methods
Returns/devolutions
Corte de Caja (end of shift cash reconciliation) — must match client's existing report format
Sequential SAR document numbering (current series: FARMMI000)
Lot tracking per medicine (DB schema supports it — needs UI)
Commission system (client's current system has fixed commission fields — TBD if required)
Multiple price lists per product (seen in a2: "Precio 1")
Data import: Excel template for ~1,888 products (NOT migration from corrupted a2 data)

Reports & Exports

General de Ventas report (matches client's existing format — see reference photos)
Corte de Caja report (matches client's existing format)
Inventory reports (expiry alerts, valuation)
PDF and Excel export
Printer compatibility

Inventory Completion

Supplier CRUD
Category management UI
Export to PDF/Excel
Expiry date alerts (per-lot, since pharmacy needs lot-level expiry)
Decimal quantities support (medicines sold by fraction — seen in a2 "Existencias con decimales")

Frontend Improvements (Production)

React Router for URL-based navigation (currently manual state-based routing)
Loading skeletons instead of "Cargando..." text
Per-field form validation with inline error messages
Responsive/mobile design (mandatory — staff use personal phones)
sessionStorage vs localStorage decision (pending client confirmation on shared vs personal devices — currently localStorage)

Production (before deployment)

HTTPS via Let's Encrypt
Nginx as reverse proxy
PM2 process manager
Scheduled PostgreSQL backups
Separate docker-compose.prod.yml
Strong JWT_SECRET generation
Environment variable validation on startup
SAR compliance review by Honduran accountant/SAR-experienced developer before pharmacy POS goes live


Security Measures
Security Audit — Completed June 14, 2026
A full manual OWASP Top 10-style audit was performed, using test accounts for doctor and recepcionista roles created via /api/auth/users (doctor@clinica.hn / Doctor1234!, recepcionista@clinica.hn / Recep1234!, alongside admin@clinica.hn). Results:
CategoryResultBroken Access Control✅ Passed — non-admin roles get 403 on admin-only endpoints; no token gets 401; privilege escalation (doctor attempting to create an admin user) blockedJWT Tampering✅ Passed — garbage tokens, signature-tampered tokens, and malformed headers all rejected with 401SQL Injection (values)✅ Passed — parameterized queries hold; injection payloads treated as data, never executedMass Assignment + column-name injection🔴 CRITICAL — found, fixed, verified. updatePatient and updateItem built SQL SET clauses from Object.keys(req.body), allowing clients to write arbitrary columns (confirmed: soft-deleted a patient via {"status":"inactive"} on the demographics-edit endpoint) and inject column names into SQL. Fixed with hardcoded field whitelists in both functions — see clinic-system-backlog.md "Resolved" for full writeup.Sensitive Data Exposure✅ Passed — no password hashes in any response; JWT payload contains only userId/email/role/iat/exp, no secretsVerbose Error Leakage✅ Passed — clients receive generic Spanish messages only; Postgres error details/stack traces stay server-side
Security hardening added during this session:

helmet() — HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
express-rate-limit — general API limiter (200 req/15min per IP) + strict login limiter (5 attempts/15min per IP)
CORS locked to http://localhost:5173 (was *)
LoginPage.tsx now surfaces actual backend error messages (was previously hardcoded to always show "Credenciales incorrectas," which masked rate-limit/network errors)

Already Implemented
MeasureHowStatusSQL Injection preventionParameterized queries everywhere (values AND, since the audit fix, column names via whitelists)✅ ActiveMass assignment protectionHardcoded field whitelists in updatePatient/updateItem; whole codebase swept for the Object.keys(data) pattern✅ ActiveSecrets management.env file, never in source code✅ ActiveSoft deletesRecords marked inactive, never hard-deleted✅ ActiveUUID primary keysNon-sequential, non-guessable IDs✅ ActiveAudit trailEvery stock movement logged with user + timestamp; quantity only changes via recordTransaction, never via direct update✅ ActivePassword hashingbcrypt with 12 rounds✅ ActiveJWT expiryTokens expire after 8 hours (one shift)✅ ActiveRBAC middlewareauthorize(...roles) — tested with doctor and recepcionista against admin-only endpoints, correctly blocked✅ Active, testedInput validationZod schemas on all write endpoints✅ ActiveRate limitingexpress-rate-limit — general (200/15min) + strict login (5/15min)✅ ActiveHTTP security headershelmet()✅ ActiveCORS hardeningLocked to http://localhost:5173✅ ActiveGlobal error handlerCatches all unhandled errors, masks internals; extended to map 22P02 (malformed UUID) → 400✅ ActiveAudit loggingSecurity events logged to audit_logs table✅ ActiveSame error messageLogin returns identical message for wrong email OR password✅ Active
Planned / Pending (production-readiness — Phase 5)
MeasureStatusRate limiter Redis-backed store⬜ Needed before any multi-instance/PM2-cluster deploy — see backlog item 10next(error) pattern in all remaining controllers⬜ See backlog item 11 — two controllers converted, rest pending cleanup passHTTPS/TLS⬜ Before deployEncryption at rest (patient data)⬜ Patient records module hardeningField-level access control (doctor-patient permission model)⬜ Pending client answer on permission model

Polish List
As of v0.3, the detailed backlog has moved to a dedicated companion document: clinic-system-backlog.md. That file tracks deferred features, design decisions, and known issues with full context/reasoning, and is updated incrementally as items are resolved or new ones are found. Always check it alongside this document.
Current high-level summary (see backlog for full detail):

Doctor name shows "Dr. —" inconsistently on Citas page appointment cards
Timezone display offset — needs reverification (the "today" UTC rollover bug is fixed)
Rescheduling option for existing appointments
Loading skeletons instead of blank "Cargando..." screens
Auto-select doctor in medical record form for logged-in doctor role
Medical records editable vs. append-only — design decision needed
sessionStorage vs. localStorage — blocked on client input
General UI/UX prettification pass
Past-due appointment badge + creation-time warning — fully designed, ready to implement

API ROUTES — new

Inventory (additions)


GET  /api/inventory/:id/lots   — lots for a product (FEFO order)
POST /api/inventory/lots       — create a lot (creates a purchase audit row)
POST /api/inventory/transactions — now REQUIRES lot_id; performed_by
injected server-side (no longer sent by client)


POS (new module — /api/pos, authenticate at index.ts level)


GET  /api/pos        — recent sales
GET  /api/pos/:id    — one sale with items + payments
POST /api/pos        — create sale. Body: { cart:[{item_id,quantity}], payments:[{method,amount,amount_tendered?,change_given?,reference?}], patient_id?, discount_amount?, notes? }. cashier_id injected from token.
Returns full receipt. SaleError → 400 (insufficient stock / underpayment).


Development Workflow
Session Start (every time)
bash# 0. Make sure Docker Desktop is running on Windows first!

# 1. Start Docker and update DB IP
~/clinic-system/dev-start.sh

# 2. Start backend (separate terminal)
cd ~/clinic-system/backend && npm run dev

# 3. Start frontend (separate terminal)
cd ~/clinic-system/frontend && npm run dev

# 4. Open browser to http://localhost:5173
# Login: admin@clinica.hn / Admin1234!
File Creation Rule
Always verify files saved correctly after creating/editing — VS Code saves have silently failed before, resulting in empty files or merged/concatenated content:
bashcat ~/clinic-system/path/to/file.ts | wc -l
# or
cat ~/clinic-system/path/to/file.ts | head -20
head -20 file.ts && tail -20 file.ts  # check both ends for merge issues
Feature Development Process
1. Write the file
2. cat the file to verify it matches intent (check line count is reasonable)
3. Check nodemon terminal for errors
4. Test the specific thing just changed (curl or browser)
5. Commit when feature is complete
Debugging Process (when something returns a generic error)
1. Temporarily add console.error('LABEL:', error) to the failing controller function
2. Reproduce the error
3. Read the exact error message/code from nodemon terminal
4. Fix root cause
5. Remove the temporary console.error (or leave if useful — team preference)
Testing an Endpoint
bash# Get a fresh token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@clinica.hn", "password": "Admin1234!"}' \
  | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).data.token)")

# Use it
curl http://localhost:3000/api/ENDPOINT \
  -H "Authorization: Bearer $TOKEN"
Commit Convention
bashgit add .
git commit -m "feat: <short description>

Pending (pinned for polish phase):
- <items added during this feature>"
git push
Prefixes: feat:, fix:, refactor:, docs:, chore:

Known Issues & Gotchas
WSL/Docker Networking

DB_HOST must point to the WSL nameserver IP (from /etc/resolv.conf), not localhost
Docker Desktop must be running before starting the backend (doesn't auto-start on Windows boot unless configured)
Port 5432 on Windows is occupied by a native PostgreSQL installation — our container uses 5433
Always run docker compose commands from ~/clinic-system (project root), not subfolders
The startup script handles IP detection automatically

Browser Origin / Storage

127.0.0.1:5173 and localhost:5173 are different origins with separate localStorage/sessionStorage — always use the same one consistently (we use localhost:5173)
AuthContext and the axios interceptors in EVERY service file must use the SAME storage type (localStorage) — a mismatch here caused a full afternoon of 401 debugging

YAML Indentation

ports in docker-compose.yml must be at the same level as environment, not nested inside it
YAML uses spaces for hierarchy — siblings have same indentation, children have more

Bash Special Characters

Strings with $ signs must use single quotes or a script file — never paste bcrypt hashes directly into bash commands (use a Node script with dotenv instead, run from backend/ so node_modules resolves)
! character causes "event not found" errors in bash — use single quotes around strings containing it

TypeScript

req.params.id type is string | string[] — must cast with as string
Import types with import type { X } when verbatimModuleSyntax is enabled (applies to User, ReactNode, Patient, Doctor, Appointment, etc.)
Zod v3 is pinned — do not upgrade to v4 (breaking API changes: errorMap→error, .errors→.issues, enum syntax needs as const)
Remove genuinely unused destructured variables/imports rather than leaving them for "later" — add them back when the feature that needs them is actually built

Date/Time Handling (real bug hit and fixed — June 13, 2026)

Never use .toISOString().split('T')[0] to get "today's date" — .toISOString() always converts to UTC. Honduras/El Salvador is UTC-6 with no DST, so any local time after 6:00 PM has already rolled over to "tomorrow" in UTC
This caused a real bug: toDateInputValue() in both AppointmentsPage.tsx and DashboardPage.tsx used this pattern, causing "Citas de hoy" to show 0 and appointments to "disappear" from the day's list after 6 PM
Fix: build the date string from local components instead:

typescript  const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

getFullYear(), getMonth(), getDate() all return local-timezone values — no conversion involved
Time-of-day display (toLocaleTimeString) was NOT affected by this bug — that's a separate, currently-unconfirmed issue tracked in the backlog

Database Column Name Mismatches (real bugs hit)

doctors table column is is_active, NOT is_available
appointment_notifications table column is is_sent, NOT is_read
appointment_status enum value is cancelled (two L's) — was created as canceled once, fixed via ALTER TYPE ... RENAME VALUE
patients.date_of_birth is nullable (was NOT NULL initially, fixed via ALTER TABLE ... DROP NOT NULL)
Lesson: after writing any migration, immediately run \d table_name and compare against the model/interface field names before writing controllers

Field Name Mismatches (real bugs hit)

Frontend cuantity vs backend quantity — typo cost about an hour, traced via grep -rn across the whole frontend src
prescription (singular) — backend/DB column, must match frontend MedicalRecord/CreateMedicalRecordData interfaces exactly (was caught as prescriptions before saving)

File Management

VS Code edits files in WSL filesystem correctly when using the WSL extension, but saves have occasionally not taken effect — always verify with cat/grep after editing, never assume
Use grep -rn "searchterm" ~/clinic-system/ to find text across all files (this is how we found the cuantity bug)
sed -i 's/old/new/g' file is useful for bulk find-replace once you've confirmed the exact string

Postgres numeric → string in node-pg. All numeric columns return as JS
strings ("5.500"). Frontend types them as string; coerce with Number() at
use. Coerce numeric form inputs before sending (a real edit bug came from
sending min_quantity:"5.000").
React StrictMode double-invokes setState updaters in dev. Side-effects
(toast, API calls) must NOT live inside a setState updater — they fire twice.
Do validation/toasts BEFORE setState; keep updaters pure.
Empty-string vs UUID. A blank <select> sends "", which
z.string().uuid().optional() rejects. Use the optionalUuid (create: ""→
undefined) / nullableUuid (update: ""→null) preprocessors in inventory.schema.
date columns display as ...T06:00:00Z. Show date-only via .slice(0,10),
no timezone math.
Oversell race. Any read-then-write of stock must lock rows with FOR UPDATE
(both POS sale and inventory movement paths do).
performed_by / cashier_id / prices are server-authoritative — never trusted
from the client body.

Module Roadmap
Phase 1 — Foundation (Complete)
├── ✅ Infrastructure (WSL, Docker, PostgreSQL, TypeScript)
├── ✅ Inventory module (full CRUD, transactions, audit trail)
├── ✅ JWT Authentication + RBAC (RBAC implemented, not yet tested with non-admin roles)
├── ✅ Zod validation
├── ✅ Global error handler
└── ✅ Toast notifications

Phase 2 — Core Clinical (Complete)
├── ✅ Appointments module (backend + frontend, full status management, notifications)
├── ✅ Notifications badge in sidebar
├── ✅ Patient records module (profile, medical history, appointment history)
├── ✅ Dashboard / Inicio (role-aware stats, quick actions, previews)
├── ✅ Communications placeholder ("Módulo en construcción")
└── ⬜ React Router + improved UX (deferred to production phase)

Phase 2.5 — Security Audit (Complete)
├── ✅ Rate limiting, Helmet.js, CORS hardening
├── ✅ Test users created (doctor, recepcionista roles)
├── ✅ Manual OWASP Top 10 pentest (6/6 categories passed, 1 critical found & fixed)
└── ✅ Mass-assignment vulnerability fixed (updatePatient, updateItem whitelists)

Phase 3 — Pharmacy POS (CURRENT PRIORITY — Most Complex, Client's Top Priority)
├── ⬜ Point of sale interface
├── ⬜ Barcode scanner integration
├── ⬜ ESC/POS receipt printing
├── ⬜ SAR-compliant invoicing with CAI
├── ⬜ ISV calculation (15% + exento)
├── ⬜ Corte de Caja
├── ⬜ Pharmacy inventory lot tracking UI
└── ⬜ Excel import template for ~1,888 products

Phase 4 — Supporting Modules
├── ⬜ Laboratory module
├── ⬜ Internal communications (replaces WhatsApp)
├── ⬜ Email domain integration (keep existing domain)
└── ⬜ Reports & exports (PDF, Excel, matching client's existing formats)

Phase 5 — Production Hardening
├── ⬜ HTTPS, Nginx, PM2
├── ⬜ Automated backups
├── ⬜ Mobile optimization / responsive design
├── ⬜ React Router
└── ⬜ SAR compliance review with local accountant

Client Requirements Status
A full bilingual requirements document was generated: requerimientos-sistema-hospitalario.docx — 13 sections, ~80 questions, color-coded status table. Currently reset to a clean state (all "Pendiente", empty answers) to be filled out fully at the next client meeting — do not assume any prior answers are still valid until re-confirmed in writing.
Context gathered so far (informal, from visit notes + photos — to be formally re-confirmed):

Hospital + pharmacy combined system, placeholder name "Farmacia Vida" used in code/seed data
~12 doctors, variable schedules, specialties include pediatrics, general medicine, dentistry
Pharmacy: ~1,888 products, ISV 15% with exempt/taxable separation, lot tracking with per-lot cost/price/expiry, credit sales (Contado/Crédito), returns, discounts, Corte de Caja per shift, commission fields exist in current system
Current invoice series: FARMMI000, SAR CAI compliance legally required (CAI details themselves still pending)
Staff use personal smartphones — web app
Prefers to keep existing email domain (~5 users currently)
Internal messaging to replace WhatsApp
Lab has its own receipt/audit system in current setup (LisaSalud)

Key open questions (critical path items):

CAI number and SAR authorization details (blocks pharmacy POS billing module)
Exact barcode scanner and receipt printer models (blocks ESC/POS integration)
Doctor permission model for patient records (blocks field-level access control)
Official hospital name, RTN, email domain confirmation
sessionStorage vs localStorage (shared vs personal devices)


File Structure
clinic-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── inventory.controller.ts
│   │   │   ├── pos.controller.ts
│   │   │   └── appointments.controller.ts   (includes patients, doctors, medical records)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── models/
│   │   │   ├── auth.model.ts
│   │   │   ├── auth.schema.ts
│   │   │   ├── inventory.model.ts
│   │   │   ├── inventory.schema.ts
│   │   │   ├── pos.model.ts
│   │   │   ├── pos.schema.ts
│   │   │   └── appointments.model.ts        (includes patients, doctors, medical records)
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── inventory.routes.ts
│   │   │   ├── pos.routes.ts
│   │   │   └── appointments.routes.ts
│   │   └── index.ts
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   └── ui/
│   │   │       ├── ConfirmDialog.tsx
│   │   │       ├── EditItemModal.tsx
│   │   │       ├── LotsModal.tsx
(TransactionModal now lot-aware)
│   │   │       └── TransactionModal.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   ├── useInventory.ts
│   │   │   └── useAppointments.ts
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx
│   │   │   ├── pos/
│   │   │   │   └── Pospage.tsx
│   │   │   │   └── CheckoutModal.tsx
│   │   │   ├── inventory/
│   │   │   │   └── InventoryPage.tsx
│   │   │   ├── appointments/
│   │   │   │   └── AppointmentsPage.tsx
│   │   │   ├── patients/
│   │   │   │   ├── PatientsPage.tsx
│   │   │   │   └── PatientProfilePage.tsx
│   │   │   └── communications/
│   │   │       └── ComunicacionesPage.tsx
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── pos.service.ts
│   │   │   └── appointments.service.ts      (includes patients, doctors, medical records)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── vite.config.ts
│   └── package.json
├── database/
│   ├── init/
│   │   └── 01_inventory.sql
│   └── migrations/
│       ├── 02_auth.sql
│       ├── 03_appointments.sql
│       ├── 04_medical_records.sql
│       ├── 05_inventory_lots.sql
│       ├── 06_pos_tables.sql
│       └── 07_isv_exempt_flag.sql
├── docker-compose.yml
├── dev-start.sh
└── .gitignore

Instructions for Continuing in a New Chat
If you are a new Claude instance reading this document, here is what you need to know to continue this project without breaking anything:
Who you are: You are acting as a senior fullstack developer with 10+ years of experience, guiding a CS student (Isaac) through building his first real client project. You are direct, honest, explain the why behind every decision, push back when something is wrong, and teach as you build. Isaac has explicitly said he wants honest assessments of scope/timeline, not just agreement — but he's also confident and wants to see this through, solo if needed.
Communication style:

After every major step, Isaac asks for a full explanation of what was built and why
Always explain concepts thoroughly — he understands them but lacks hands-on experience
Never give more than one file at a time without verifying the previous one
Always verify files with cat file | wc -l, head/tail, or grep before moving on — this has caught multiple real bugs (empty files, merged files, typos)
When something breaks, diagnose systematically — add temporary console.error logging, read the exact error, fix root cause, never guess blindly
When Isaac asks "why did we choose X over Y", give an honest tradeoffs answer, not just justification
Isaac maintains a "polish list" of deferred items — when something comes up that's not a blocker but worth fixing later, name it explicitly and add it to the list (see Polish List section above)
Isaac values commit messages that document pending/deferred items, not just what was built

Critical rules:

Code in English, UI text in Spanish — always (status enums stay English, mapped to Spanish in frontend display)
Zod is pinned to v3 — never suggest upgrading
Always use localStorage (not sessionStorage) for auth token/user — AND make sure every service file's axios interceptor reads from the same storage as AuthContext
Port 5433 for PostgreSQL (not 5432) — Windows conflict
Run ~/clinic-system/dev-start.sh at the start of every session (after confirming Docker Desktop is running)
Always commit before moving to a new feature, with pending items noted in the commit message
Use localhost:5173 consistently, not 127.0.0.1:5173 (different origins = different storage)
Before writing controllers against a new migration, run \d table_name to confirm actual column names match what you're about to write

Where we left off: Pharmacy POS core is complete and verified end-to-end: lot-based inventory,
sales engine (server-side FEFO, ISV, atomic with rollback proven), cashier
frontend (search/scan/cart/checkout), and a fully rebuilt lot-aware Inventario.
Fiscal columns exist as shape only — BLOCKED on client CAI. Printing BLOCKED on
printer model.

Next-task candidates (Isaac to pick): POS receipt display (backlog 20), Corte de
Caja (21), the RBAC pass (18, confirmed happening), or the pinned category-clear
bug (19). See backlog for all.

Two client blockers unchanged: CAI/SAR details, scanner/printer models.

 Pharmacy POS: Phase 4 (Laboratory, Communications/internal messaging, Reports & Exports), then Phase 5 (production hardening — HTTPS, Redis-backed rate limiting, PM2, encryption at rest, SAR compliance review).


### Docs Update — RBAC, Dual-Scope Inventory, Security (June 25, 2026)


Merge into clinic-system-docs.md. Architecture reference for the access
control and inventory-scope systems built this session.



Dual-Scope Inventory

The system runs two operationally separate inventories through ONE schema:


pharmacy scope — medicines; sellable via the POS.
hospital scope — equipment, supplies, the ward's own medicines;
stock-tracked (receive/consume/adjust/expiry) but NEVER sold.


inventory_items.scope (varchar, NOT NULL, default 'pharmacy', CHECK in
('pharmacy','hospital')) carries this. Scope is custody-based: it means who
manages the stock, not what the item is. The ward's own amoxicillin is
hospital scope (the ward manages it) even though it's medicine.

Why one table, not two: a mop and a medicine are the same shape of data
(item + lots + movements + expiry). Duplicating the schema would duplicate all
the lot/POS/movement machinery. The scope column + RBAC enforce the boundary
instead. Reusing everything; the POS simply refuses non-pharmacy items.

Roles (6)

admin, doctor, recepcionista, enfermera, farmaceutico, bodega
(user_role enum). farmaceutico = pharmacy POS + pharmacy stock. bodega =
hospital-scope inventory (placeholder until client confirms such a person).

RBAC architecture

Single source of truth: config/permissions.ts — a flat map of
capability → allowed roles. To change access, edit one array. Capabilities:
pos, inventory_any, inventory_pharmacy, inventory_hospital,
appointments, patients, medical_records.

Two enforcement layers:


Module gate — can(capability) middleware on route groups reads the map.
Wrong role → 403 before the controller runs.
Scope guard (inventory only) — within the inventory module, a per-item
check (scopeGuardOk in the controller) verifies the item's scope is one the
caller's role may touch. List endpoints filter in-SQL by allowed scopes
(disallowed rows never leave the DB). Single-item endpoints return 404
(not 403) on scope mismatch — deliberately, so a forbidden item is
indistinguishable from a nonexistent one (no existence leak).


inventory_any is the coarse "can reach the inventory module" gate (union of
pharmacy+hospital roles); the per-scope capabilities drive what they actually
see via allowedScopesForRole(role).

Identity is never trusted from the client. Every "who did this" field is
injected server-side from the auth token: cashier_id, medical-record doctor_id
(forced to the logged-in doctor), cancelled_by, notification ownership.

Frontend gating is cosmetic — sidebar hides forbidden links, dashboard gates
widgets+fetches, App.tsx guards routes and defaults to '/'. The backend is the
real enforcer (a hand-crafted request still gets 403/404). The frontend role
lists duplicate the backend map; acceptable redundancy, backend wins on drift.

POS money/stock integrity (verified by Audit #1)


Prices read server-side from the product; the client never sends a price.
No client-set total; computed from server values.
Discount clamped: a discount exceeding the pre-discount total is rejected
(prevents negative-total payment bypass).
Payment verified: sum(payments) >= total enforced.
FEFO lot selection with FOR UPDATE row locks — proven to serialize
concurrent sales (no oversell race).
Atomic transaction: any mid-sale failure rolls back all stock decrements.
Stock is fractional numeric; never stored on the item, always SUM(lots).


Rate limiting (3 tiers)


General /api — 1000/15min, per-IP (runs before auth).
Login — 5/15min, per-IP.
Sensitive writes (inventory/appointments/pos) — 40/min, hybrid key
(req.user?.userId ?? req.ip) so staff sharing one IP get separate buckets.
Runs after authenticate.
In-memory store (fine for single instance; needs Redis if multi-instance — P5).


Error handling

Global handler maps Postgres error codes to clean 4xx instead of 500:
23505→409, 23503→400, 22P02→400, 23502→400, 23514→400, 22003→400.
No stack traces or SQL reach the client.