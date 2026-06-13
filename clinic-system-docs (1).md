# Clinic Management System — Project Documentation

**Version:** 0.1 (Mockup Phase)
**Last Updated:** June 2026
**Status:** In active development

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [What's Been Built](#whats-been-built)
5. [What's Pending](#whats-pending)
6. [Security Measures](#security-measures)
7. [Planned Improvements](#planned-improvements)
8. [Development Workflow](#development-workflow)
9. [Environment Setup](#environment-setup)
10. [Module Roadmap](#module-roadmap)

---

## Project Overview

A full-stack hospital management system being built for a private Honduran hospital — **Hospital / Farmacia Vida** (placeholder name, official name pending). The system covers two operational areas: the main hospital and an attached pharmacy. The current phase is a **mockup/prototype** — built with a general/multi-specialty structure that will be adapted to the final client's specific needs once all requirements are confirmed.

### Client Context
- Medium-sized private hospital in Honduras
- Currently running two legacy systems: **LisaSalud** (hospital) and **a2 Punto de Venta** (pharmacy)
- Staff communicates via WhatsApp — this system replaces that
- Pharmacy has ~1,888 products, barcode scanner, and receipt printer
- ~12 doctors across pediatrics, general medicine, dentistry, and other specialties
- Variable doctor schedules (not all doctors present every day)
- Existing email domain (pending confirmation) — client wants to keep it if possible
- Hardware: Windows 10/11 (some older machines, possibly Windows 8 in pharmacy)
- LAN network in place, WiFi in necessary areas
- Staff will use personal smartphones — **mobile UX is mandatory**
- System will likely be hosted externally (cloud)
- SAR (Servicio de Administración de Rentas) fiscal compliance is legally required for all invoicing

### Language Policy
- **All code, variable names, database columns, function names:** English
- **All UI text, labels, error messages, notifications, receipts, reports:** Spanish
- Status enums stay in English (e.g., `'scheduled'`, `'confirmed'`) but are mapped to Spanish in the frontend

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v24 (via nvm) |
| Backend | TypeScript + Express |
| Database | PostgreSQL 16 (Docker) |
| Auth | JWT (JSON Web Tokens) + bcrypt |
| Validation | Zod v3 |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| HTTP Client | Axios |
| Notifications (UI) | react-hot-toast |
| Containerization | Docker + Docker Compose |
| Version Control | Git + GitHub |
| Dev Environment | WSL2 (Ubuntu) on Windows |

---

## Architecture

### Backend — Separation of Concerns

```
backend/src/
├── routes/         → URL paths and HTTP method definitions only
├── controllers/    → Request/response logic; calls models, sends responses
├── middleware/     → Auth checks, validation, error handling
├── models/         → All database queries (SQL lives here, nowhere else)
└── config/         → DB connection, environment setup
```

### Frontend — Layered Structure

```
frontend/src/
├── components/
│   ├── layout/     → Sidebar, Layout shell
│   └── ui/         → Reusable components (ConfirmDialog, EditItemModal, TransactionModal)
├── pages/
│   ├── auth/       → LoginPage
│   └── inventory/  → InventoryPage
├── services/       → API call functions (auth.service.ts, inventory.service.ts)
├── hooks/          → Custom React hooks (useInventory.ts)
└── context/        → AuthContext (global auth state)
```

### Database Connection
PostgreSQL connections managed via a **connection pool** (`pg` library). All queries use **parameterized queries** (`$1`, `$2`) to prevent SQL injection.

---

## Environment Details

### Critical Environment Issue
The dev setup runs on Windows with WSL2 + Docker Desktop. The database IP must be set correctly in `backend/.env`:

- `DB_HOST` should be set to the nameserver IP from `/etc/resolv.conf` inside WSL (typically `10.255.255.254`)
- Docker container exposes PostgreSQL on port **5433** (not 5432) because a native Windows PostgreSQL installation occupies 5432
- A startup script handles this automatically

### Startup Script
Located at `~/clinic-system/dev-start.sh`:
```bash
#!/bin/bash
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
```

Run this every morning before starting work: `~/clinic-system/dev-start.sh`

### Environment Variables (`backend/.env`)
```
PORT=3000
DB_HOST=10.255.255.254   ← auto-updated by startup script
DB_PORT=5433
DB_NAME=clinic_db
DB_USER=clinic_user
DB_PASSWORD=clinic_password
JWT_SECRET=clinic_super_secret_change_this_in_production_2024
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=12
```

### Docker Compose (`docker-compose.yml`)
Located at project root `~/clinic-system/docker-compose.yml`:
```yaml
services:
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
```

---

## What's Been Built

### ✅ Infrastructure & Environment
- WSL2 + Ubuntu dev environment
- Node.js v24 via nvm
- PostgreSQL 16 in Docker with persistent storage
- Automated startup script (`dev-start.sh`)
- Git repository initialized and pushed to GitHub
- TypeScript configured with strict mode

### ✅ Database Schema

**Migration 01 — Inventory** (`database/init/01_inventory.sql`):
- `suppliers` — supplier management
- `categories` — product categories (seeded: Medications, Consumables, Equipment, Office Supplies, Cleaning)
- `inventory_items` — products with lot tracking, expiry dates, ISV exempt flag
- `inventory_transactions` — append-only audit log of every stock movement

**Migration 02 — Auth** (`database/migrations/02_auth.sql`):
- `users` — staff accounts with role-based access
- `audit_logs` — security event logging (login attempts, user creation, etc.)
- Default admin: `admin@clinica.hn` / `Admin1234!`
- Roles: `admin`, `doctor`, `recepcionista`, `enfermera`

**Migration 03 — Appointments** (`database/migrations/03_appointments.sql`):
- `patients` — patient profiles
- `doctors` — doctor profiles linked to users table
- `doctor_schedules` — weekly availability per doctor
- `appointments` — bookings with status tracking
- `appointment_notifications` — notification log per user
- Seeded: one doctor (Medicina General) linked to admin user, Mon-Fri 8am-5pm schedule

### ✅ Backend API

**Auth routes** (`/api/auth`):
- `POST /api/auth/login` — returns JWT token
- `GET /api/auth/me` — returns current user profile
- `POST /api/auth/users` — create user (admin only)

**Inventory routes** (`/api/inventory`) — all protected:
- `GET /api/inventory` — all active items
- `GET /api/inventory/:id` — single item
- `POST /api/inventory` — create item (Zod validated)
- `PUT /api/inventory/:id` — update item (Zod validated)
- `DELETE /api/inventory/:id` — soft delete
- `GET /api/inventory/low-stock` — items below minimum
- `GET /api/inventory/categories` — all categories
- `GET /api/inventory/suppliers` — all suppliers
- `POST /api/inventory/transactions` — record stock movement (Zod validated)
- `GET /api/inventory/:id/transactions` — item transaction history

**Appointments routes** (`/api/appointments`) — all protected:
- `GET /api/appointments/patients` — all active patients
- `GET /api/appointments/patients/:id` — single patient
- `POST /api/appointments/patients` — create patient
- `PUT /api/appointments/patients/:id` — update patient
- `GET /api/appointments/doctors` — all available doctors
- `GET /api/appointments/doctors/:id` — single doctor
- `GET /api/appointments/doctors/:id/schedule` — doctor weekly schedule
- `GET /api/appointments` — all appointments (filterable by doctor, patient, date, status)
- `GET /api/appointments/:id` — single appointment
- `POST /api/appointments` — create appointment (conflict detection included)
- `PATCH /api/appointments/:id/status` — update appointment status
- `GET /api/appointments/notifications/me` — current user's notifications
- `PATCH /api/appointments/notifications/:id/read` — mark notification as read

### ✅ Middleware
- `authenticate` — verifies JWT token, attaches `req.user`
- `authorize(...roles)` — role-based access control
- `validate(schema)` — Zod validation middleware factory
- `errorHandler` — global error handler (catches PostgreSQL error codes 23505, 23503)

### ✅ Frontend

**Auth flow:**
- `LoginPage` — email/password form, Enter key support
- `AuthContext` — global auth state using localStorage
- Token stored in `localStorage` as `clinic_token`
- Axios interceptor attaches token to every request automatically
- Protected routes — unauthenticated users see only login page
- Logout clears localStorage and redirects to login

**Inventory module (complete):**
- Table view with all items, search, low stock alerts
- Create new item form (inline)
- Edit item modal
- Stock transaction modal (purchase, consumption, adjustment, return, expired)
- Confirm dialog before delete
- Toast notifications for all actions
- Status badges (Normal / Stock bajo)
- Prices displayed in Lempiras (L)

**Layout:**
- Collapsible sidebar with navigation
- User name and role displayed at bottom
- Cerrar sesión button
- Responsive shell

---

## What's Pending

### Appointments Frontend (next up)
- Calendar/day view of appointments
- Create appointment form (select patient, doctor, date/time)
- Status management (confirm, cancel, complete)
- Doctor notifications indicator in sidebar

### Inventory Completion
- Supplier CRUD
- Category management
- Export to PDF/Excel
- Expiry date alerts
- Loading skeleton instead of blank screen

### Patient Records Module
- Full patient profile page
- Medical history
- Visit records linked to appointments
- Document uploads
- Search and filtering

### Pharmacy POS Module (most complex)
- Point of sale interface
- Barcode scanner integration (model TBD — pending client visit)
- Receipt printer integration via ESC/POS protocol (model TBD)
- SAR-compliant invoicing with CAI number
- ISV calculation (15% gravable + exento separation)
- Cash/card/credit payment methods
- Returns/devolutions
- Corte de Caja (end of shift cash reconciliation)
- Sequential SAR document numbering
- Lot tracking per medicine (already in DB schema)

### Laboratory Module
- Lab test ordering by doctors
- Results entry
- Integration with patient records
- Lab receipts and audit

### Communications Module
- Internal messaging (replaces WhatsApp)
- Email domain integration
- Doctor appointment notifications (backend done, UI pending)
- Pharmacy-hospital prescription communication

### Reports & Exports
- General de Ventas report (matches client's existing format)
- Corte de Caja report (matches client's existing format)
- Inventory reports
- PDF and Excel export
- Printer compatibility

### Backend Hardening (before production)
- Rate limiting (express-rate-limit)
- Helmet.js HTTP security headers
- CORS hardening (whitelist specific origin)
- Proper migration system (instead of init scripts)
- Database indexes review
- Winston/Pino logging
- API response consistency enforcement

### Frontend Improvements
- React Router for URL-based navigation
- Loading skeletons
- Per-field form validation with inline error messages
- Responsive design for mobile/tablet
- sessionStorage vs localStorage decision (pending client confirmation on shared vs personal devices)

### Production (before deployment)
- HTTPS via Let's Encrypt
- Nginx as reverse proxy
- PM2 process manager
- Scheduled PostgreSQL backups
- Separate `docker-compose.prod.yml`
- Strong JWT_SECRET generation
- Environment variable validation on startup

---

## Security Measures

### Already Implemented

| Measure | How | Status |
|---|---|---|
| SQL Injection prevention | Parameterized queries everywhere | ✅ Active |
| Secrets management | `.env` file, never in source code | ✅ Active |
| Soft deletes | Records marked inactive, never hard-deleted | ✅ Active |
| UUID primary keys | Non-sequential, non-guessable IDs | ✅ Active |
| Audit trail | Every stock movement logged with user + timestamp | ✅ Active |
| Password hashing | bcrypt with 12 rounds | ✅ Active |
| JWT expiry | Tokens expire after 8 hours (one shift) | ✅ Active |
| RBAC | Every endpoint checks role, not just authentication | ✅ Active |
| Input validation | Zod schemas on all write endpoints | ✅ Active |
| Global error handler | Catches all unhandled errors, masks internals | ✅ Active |
| Audit logging | Security events logged to audit_logs table | ✅ Active |
| Same error message | Login returns identical message for wrong email OR password | ✅ Active |

### Planned

| Measure | Status |
|---|---|
| Rate limiting | ⬜ Planned |
| Helmet.js HTTP headers | ⬜ Planned |
| CORS hardening | ⬜ Before deploy |
| HTTPS/TLS | ⬜ Before deploy |
| Encryption at rest (patient data) | ⬜ Patient records module |
| Field-level access control | ⬜ Patient records module |

---

## Planned Improvements (Noted During Development)

- Replace blank loading screen with skeleton/spinner (noted during inventory build)
- sessionStorage vs localStorage decision pending client confirmation on device sharing policy
- SAR compliance review by Honduran accountant or SAR-experienced developer before pharmacy POS goes live
- Data migration strategy for pharmacy: provide Excel import template rather than migrating corrupt a2 data
- Second developer consideration for SAR compliance and timeline

---

## Development Workflow

### Session Start (every time)
```bash
# 1. Start Docker and update DB IP
~/clinic-system/dev-start.sh

# 2. Start backend (separate terminal)
cd ~/clinic-system/backend && npm run dev

# 3. Start frontend (separate terminal)
cd ~/clinic-system/frontend && npm run dev

# 4. Open browser to http://localhost:5173
# Login: admin@clinica.hn / Admin1234!
```

### File Creation Rule
**Always verify files saved correctly after creating/editing:**
```bash
cat ~/clinic-system/path/to/file.ts | wc -l
# or
cat ~/clinic-system/path/to/file.ts | head -20
```

### Feature Development Process
```
1. Write the file
2. cat the file to verify it matches intent
3. Check nodemon terminal for errors
4. Test the specific thing just changed (curl or browser)
5. Commit when feature is complete
```

### Testing an Endpoint
```bash
# Get a fresh token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@clinica.hn", "password": "Admin1234!"}' \
  | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).data.token)")

# Use it
curl http://localhost:3000/api/ENDPOINT \
  -H "Authorization: Bearer $TOKEN"
```

### Commit Convention
```bash
git add .
git commit -m "feat: <short description>"
git push
```
Prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

---

## Known Issues & Gotchas

### WSL/Docker Networking
- `DB_HOST` must point to the WSL nameserver IP (from `/etc/resolv.conf`), not `localhost`
- Docker Desktop must be running before starting the backend
- Port 5432 on Windows is occupied by a native PostgreSQL installation — our container uses **5433**
- The startup script handles IP detection automatically

### YAML Indentation
- `ports` in `docker-compose.yml` must be at the same level as `environment`, not nested inside it
- YAML uses spaces for hierarchy — siblings have same indentation, children have more

### Bash Special Characters
- Strings with `$` signs must use single quotes or a script file — never paste bcrypt hashes directly into bash commands
- `!` character causes "event not found" errors in bash — use single quotes around strings containing it

### TypeScript
- `req.params.id` type is `string | string[]` — must cast with `as string`
- Import types with `import type { X }` when `verbatimModuleSyntax` is enabled
- Zod v3 is pinned — do not upgrade to v4 (breaking API changes)

### File Management
- VS Code edits files in WSL filesystem correctly when using the WSL extension
- Always verify file contents with `cat` after editing — do not assume the save worked
- Use `grep -rn "searchterm" ~/clinic-system/` to find text across all files

---

## Module Roadmap

```
Phase 1 — Foundation (Current / Complete)
├── ✅ Infrastructure (WSL, Docker, PostgreSQL, TypeScript)
├── ✅ Inventory module (full CRUD, transactions, audit trail)
├── ✅ JWT Authentication + RBAC
├── ✅ Zod validation
├── ✅ Global error handler
├── ✅ Toast notifications
└── ✅ Appointments backend (patients, doctors, schedules, notifications)

Phase 2 — Core Clinical (In Progress)
├── 🔄 Appointments frontend (calendar, booking, status management)
├── ⬜ Patient records module
└── ⬜ React Router + improved UX

Phase 3 — Pharmacy POS (Most Complex)
├── ⬜ Point of sale interface
├── ⬜ Barcode scanner integration
├── ⬜ ESC/POS receipt printing
├── ⬜ SAR-compliant invoicing with CAI
├── ⬜ ISV calculation (15% + exento)
├── ⬜ Corte de Caja
└── ⬜ Pharmacy inventory lot tracking UI

Phase 4 — Supporting Modules
├── ⬜ Laboratory module
├── ⬜ Internal communications (replaces WhatsApp)
├── ⬜ Email domain integration
└── ⬜ Reports & exports (PDF, Excel)

Phase 5 — Production Hardening
├── ⬜ HTTPS, Nginx, PM2
├── ⬜ Rate limiting, Helmet.js
├── ⬜ Automated backups
├── ⬜ Mobile optimization
├── ⬜ Data migration (pharmacy inventory via Excel template)
└── ⬜ SAR compliance review with local accountant
```

---

## Client Requirements Status

### Confirmed
- Hospital + pharmacy combined system
- ~12 doctors, variable schedules
- Specialties: pediatrics, general medicine, dentistry, others
- Staff roles needed: admin, doctor, recepcionista, enfermera, lab technician, pharmacy cashier
- Variable doctor schedules
- Pharmacy serves hospital patients + general public
- Pharmacy has barcode scanner and receipt printer (models TBD)
- Medicine prescribed via manual notes currently — system will digitize this
- ISV at 15% with exempt/taxable separation
- Lot tracking per medicine with individual cost/price/expiry
- Credit sales (contado + crédito)
- Returns/devolutions
- Discounts
- Corte de Caja per shift
- SAR-compliant invoicing (legally required)
- Current invoice series: FARMMI000
- Staff use personal smartphones — web app, not native
- LAN network in place
- Windows 10/11 (some older)
- Prefers to keep existing email domain
- Internal messaging to replace WhatsApp
- Doctor notifications for appointments
- Lab results integrated into patient records
- Audit log for all transactions
- Automatic backups
- PDF and Excel export

### Pending (captured in requirements document)
- Official hospital name and RTN
- Email domain
- Exact scanner and printer models
- CAI number and SAR authorization details
- Number of users per area
- LAN network extent
- Server situation (local vs cloud confirmed as likely cloud)
- Lab test types
- Patient record minimum fields
- Doctor permission model for patient records
- Consultation types and billing
- Inpatient vs outpatient only
- Credit limit system
- Commission system details
- sessionStorage vs localStorage (shared vs personal devices)

---

## File Structure

```
clinic-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── inventory.controller.ts
│   │   │   └── appointments.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── models/
│   │   │   ├── auth.model.ts
│   │   │   ├── auth.schema.ts
│   │   │   ├── inventory.model.ts
│   │   │   ├── inventory.schema.ts
│   │   │   └── appointments.model.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── inventory.routes.ts
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
│   │   │       └── TransactionModal.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   └── useInventory.ts
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.tsx
│   │   │   └── inventory/
│   │   │       └── InventoryPage.tsx
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── inventory.service.ts
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
│       └── 03_appointments.sql
├── docker-compose.yml
├── dev-start.sh
└── .gitignore
```

---

## Instructions for Continuing in a New Chat

If you are a new Claude instance reading this document, here is what you need to know to continue this project without breaking anything:

**Who you are:** You are acting as a senior fullstack developer with 10+ years of experience, guiding a CS student (Isaac) through building his first real client project. You are direct, honest, explain the *why* behind every decision, push back when something is wrong, and teach as you build.

**Communication style:**
- After every major step, Isaac asks for a full explanation of what was built and why
- Always explain concepts thoroughly — he understands them but lacks hands-on experience
- Never give more than one file at a time without verifying the previous one
- Always verify files with `cat file | wc -l` or `head/tail` before moving on
- When something breaks, diagnose systematically — never guess blindly

**Critical rules:**
- Code in English, UI text in Spanish — always
- Zod is pinned to v3 — never suggest upgrading
- Always use `localStorage` (not `sessionStorage`) — decision was made due to browser origin issues
- Port 5433 for PostgreSQL (not 5432) — Windows conflict
- Run `~/clinic-system/dev-start.sh` at the start of every session
- Always commit before moving to a new feature

**Where we left off:** The appointments backend is complete and tested. Next step is building the appointments frontend — calendar/day view, create appointment form, status management, and notifications indicator.

**The immediate next task:** Build `frontend/src/pages/appointments/AppointmentsPage.tsx` and wire it into `App.tsx`. The backend endpoints are all working and tested.
