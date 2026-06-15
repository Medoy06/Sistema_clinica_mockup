-- ============================================================
-- Migration 07 — ISV exempt flag on products
-- ============================================================
-- Whether a product is ISV-exempt (exento) is a property of the
-- PRODUCT, not the batch or the individual sale — a given medicine
-- is either taxable or exempt by its nature/SAR classification.
-- So the flag lives on inventory_items. At sale time, each
-- sale_item copies this into its own is_exempt snapshot (so a later
-- reclassification never rewrites historical receipts).
--
-- Default false (taxable) — most products are gravable; exempt is
-- the exception the user explicitly marks.
-- ============================================================

BEGIN;

ALTER TABLE inventory_items
    ADD COLUMN is_exempt boolean NOT NULL DEFAULT false;

COMMIT;