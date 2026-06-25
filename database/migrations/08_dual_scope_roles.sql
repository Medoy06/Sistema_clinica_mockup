-- ============================================================
-- Migration 08 — Dual-scope inventory + expanded roles
-- ============================================================
-- Two independent changes:
--   1. Add `scope` to inventory_items: custody-based separation of
--      the pharmacy inventory (medicines, sellable via POS) from the
--      hospital inventory (equipment, supplies, the ward's own meds —
--      stock-tracked but never sold). One table, one set of code; the
--      scope column + RBAC enforce the boundary. Reuses all lot/POS/
--      movement machinery unchanged.
--   2. Add two roles to the user_role enum:
--        farmaceutico — runs the pharmacy POS + manages pharmacy stock
--        bodega       — manages hospital-scope inventory (placeholder;
--                       may be unused until the client confirms such a
--                       person exists)
--
-- POSTGRES ENUM QUIRK: `ALTER TYPE ... ADD VALUE` cannot run inside a
-- transaction block in a way that lets the value be used in the same tx.
-- So the enum additions are done FIRST, outside any BEGIN/COMMIT. The
-- column add (normal DDL) follows in its own transaction.
-- IF NOT EXISTS makes the enum adds idempotent (safe to re-run).
-- ============================================================

-- --- 1. Enum additions (must be outside a transaction block) ---
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'farmaceutico';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bodega';

-- --- 2. Inventory scope (transactional) ---
BEGIN;

-- custody-based: who manages this stock, not what the thing is.
-- Defaults to 'pharmacy' — all existing test items are medicines.
-- NOT NULL: every item belongs to exactly one scope, no limbo.
ALTER TABLE inventory_items
    ADD COLUMN scope varchar(20) NOT NULL DEFAULT 'pharmacy'
    CHECK (scope IN ('pharmacy', 'hospital'));

CREATE INDEX idx_inventory_items_scope ON inventory_items(scope);

COMMIT;