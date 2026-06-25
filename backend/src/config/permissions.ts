import type { AuthPayload } from '../middleware/auth.middleware';

type Role = AuthPayload['role'];

// ============================================================
// PERMISSIONS — single source of truth for who can do what.
//
// Each capability maps to the list of roles allowed to use it.
// To change access (e.g. take POS away from recepcionista), edit
// ONE array here — no hunting across route files.
//
// This is a flat capability → [roles] map on purpose. Resist adding
// role hierarchy / inheritance / wildcards — for this system a flat
// map is the right amount of structure.
//
// Module-level gates use these via `can(capability)` in routes.
// Scope-level enforcement (pharmacy vs hospital inventory) is handled
// separately inside the inventory/POS controllers, because it depends
// on the specific item's scope, not just the route.
// ============================================================

// Capabilities are the keys here; widening the values to Role[] (rather
// than inferred literal tuples) is what lets .includes(anyRole) type-check.
export type Capability =
  | 'pos'
  | 'inventory_any'
  | 'inventory_pharmacy'
  | 'inventory_hospital'
  | 'appointments'
  | 'patients'
  | 'medical_records';

export const PERMISSIONS: Record<Capability, Role[]> = {
  // Pharmacy point of sale (selling medicines)
  pos: ['admin', 'farmaceutico', 'recepcionista'],

  // "Can reach the inventory module at all" — the route-level gate.
  // Which items they actually see is decided per-scope in the controller
  // (allowedScopesForRole). Union of the two scope capabilities below.
  inventory_any: ['admin', 'farmaceutico', 'recepcionista', 'bodega'],

  // Pharmacy-scope inventory (medicines)
  inventory_pharmacy: ['admin', 'farmaceutico', 'recepcionista'],

  // Hospital-scope inventory (equipment, supplies, ward meds)
  inventory_hospital: ['admin', 'bodega'],

  // Clinical scheduling
  appointments: ['admin', 'doctor', 'recepcionista', 'enfermera'],

  // Patient records
  patients: ['admin', 'doctor', 'recepcionista', 'enfermera'],

  // MEDICAL RECORD AUTHORSHIP POLICY:
  // Creating a medical record (diagnosis/treatment) is currently a doctor's
  // act — doctors + admin only. To loosen this (e.g. let nurses create
  // records), ADD the role here AND revisit the doctor_id forcing in
  // appointments.controller.ts createMedicalRecord (a non-doctor caller has
  // no doctor_id to force). Reading records stays at the broader clinical
  // level (the 'patients'/'appointments' gate), not here.
  medical_records: ['admin', 'doctor'],
};

// Helper for scope checks inside controllers: which inventory scopes
// can this role touch? Derived from the two inventory capabilities so
// there's still one source of truth.
export const allowedScopesForRole = (role: Role): ('pharmacy' | 'hospital')[] => {
  const scopes: ('pharmacy' | 'hospital')[] = [];
  if (PERMISSIONS.inventory_pharmacy.includes(role)) scopes.push('pharmacy');
  if (PERMISSIONS.inventory_hospital.includes(role)) scopes.push('hospital');
  return scopes;
};