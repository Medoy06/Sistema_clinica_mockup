-- ============================================================
-- Migration 05 — Inventory Lots Restructure
-- ============================================================
-- Moves stock tracking from the flat "one quantity per product"
-- model down to a per-lot (per-batch) model, as required for a
-- pharmacy: each lot has its own expiry date and unit cost.
--
-- After this migration:
--   * inventory_items  = product identity only (name, category,
--                        price). NO quantity, NO expiry_date.
--   * inventory_lots   = the actual physical stock. Each row is a
--                        batch with its own expiry + cost.
--   * total stock of a product = SUM(inventory_lots.quantity)
--                        (computed, never stored — single source
--                        of truth, cannot drift).
--   * inventory_transactions now records WHICH lot a movement hit.
--
-- Safe to run as a clean rebuild here because all current
-- inventory data is disposable test data. A new initial lot is
-- created for any pre-existing product so nothing references a
-- product with zero lots after the migration.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. NEW TABLE: inventory_lots
-- ------------------------------------------------------------
-- One row per physical batch of a product.
--   quantity   numeric(10,3) — fractional stock (half a box,
--              individual strips, decimal syrup measures).
--   unit_cost  numeric(10,2) NOT NULL — what WE paid per unit for
--              THIS batch. Required so margin reporting is honest;
--              two decimals because money is exact to the centavo.
--   expiry_date nullable — "SIN LOTE" / no-batch stock often has
--              no reliable expiry. FEFO logic will treat known
--              expiries as dispensed-first, null-expiry lots last.
-- ------------------------------------------------------------
CREATE TABLE inventory_lots (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id     uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    lot_number  varchar(100) NOT NULL DEFAULT 'SIN LOTE',
    expiry_date date,
    quantity    numeric(10,3) NOT NULL DEFAULT 0,
    unit_cost   numeric(10,2) NOT NULL,
    is_active   boolean DEFAULT true,
    created_at  timestamp without time zone DEFAULT now(),
    updated_at  timestamp without time zone DEFAULT now()
);

-- Index for the most common access pattern: "all lots of this product",
-- which powers both the computed-total SUM and the FEFO lot picker.
CREATE INDEX idx_inventory_lots_item_id ON inventory_lots(item_id);
-- Index to support FEFO ordering (soonest expiry first) per product.
CREATE INDEX idx_inventory_lots_expiry ON inventory_lots(item_id, expiry_date);

-- ------------------------------------------------------------
-- 2. SEED: turn each existing product's current stock into an
--    initial "SIN LOTE" lot, so no product is left lot-less.
-- ------------------------------------------------------------
-- We read the OLD columns (quantity, expiry_date) BEFORE dropping
-- them. unit_cost is required, so we fall back to the product's
-- unit_price (or 0) for these legacy test rows — real lots will
-- always have a real cost entered at receiving time.
INSERT INTO inventory_lots (item_id, lot_number, expiry_date, quantity, unit_cost)
SELECT
    id,
    'SIN LOTE',
    expiry_date,
    quantity,
    COALESCE(unit_price, 0)
FROM inventory_items;

-- ------------------------------------------------------------
-- 3. ALTER inventory_items: stock + expiry move OUT to lots.
-- ------------------------------------------------------------
-- Drop the columns whose truth now lives on the lot.
ALTER TABLE inventory_items DROP COLUMN quantity;
ALTER TABLE inventory_items DROP COLUMN expiry_date;

-- Reorder thresholds stay on the product (a product-level policy,
-- not a per-batch fact) but become numeric to match fractional stock.
ALTER TABLE inventory_items ALTER COLUMN min_quantity TYPE numeric(10,3);
ALTER TABLE inventory_items ALTER COLUMN max_quantity TYPE numeric(10,3);

-- ------------------------------------------------------------
-- 4. ALTER inventory_transactions: movements are now per-lot.
-- ------------------------------------------------------------
-- Which batch did this movement draw down / add to? Nullable
-- because legacy test rows have no lot; all NEW movements will
-- set it. ON DELETE SET NULL keeps the audit row even if a lot
-- is ever removed — we never want to lose audit history.
ALTER TABLE inventory_transactions
    ADD COLUMN lot_id uuid REFERENCES inventory_lots(id) ON DELETE SET NULL;

-- Fractional movement quantities, same reason as everywhere else.
ALTER TABLE inventory_transactions ALTER COLUMN quantity TYPE numeric(10,3);

COMMIT;