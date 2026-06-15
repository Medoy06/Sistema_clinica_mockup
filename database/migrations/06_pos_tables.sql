-- ============================================================
-- Migration 06 — Pharmacy POS Core Tables
-- ============================================================
-- Three tables, three jobs:
--   sales       = the transaction header (one row per sale):
--                 cashier, timestamp, totals, fiscal metadata.
--   sale_items  = the lines (one row per product-lot sold).
--                 Points DIRECTLY at a lot_id so we always know
--                 which batch was sold and at what cost.
--   payments    = how it was settled (one row per payment method),
--                 enabling split payments + clean Corte de Caja sums.
--
-- FISCAL NOTE: the SAR fiscal columns (cai, document_series,
-- document_number, ISV breakdown) are defined here as SHAPE only.
-- Real CAI values + sequential numbering logic are BLOCKED pending
-- client/accountant CAI authorization — see docs. Columns are
-- nullable so non-fiscal/dev sales work; populating them with a
-- REAL CAI is a later, gated step. Defining a column is not a
-- legal claim; emitting a real invoice against a real CAI is.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- sales — transaction header
-- ------------------------------------------------------------
CREATE TABLE sales (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who/when
    cashier_id        uuid REFERENCES users(id) ON DELETE SET NULL,
    -- Optional link to a patient (hospital patient buying meds).
    -- Public/walk-in customers leave this null.
    patient_id        uuid REFERENCES patients(id) ON DELETE SET NULL,

    -- Money. All numeric(12,2) — Lempiras to the centavo, exact.
    -- subtotal      = sum of line totals BEFORE tax
    -- isv_gravable  = taxable base (the part ISV applies to)
    -- isv_exento    = exempt base (no ISV)
    -- isv_amount    = the 15% tax charged on the gravable base
    -- total         = what the customer actually pays
    subtotal          numeric(12,2) NOT NULL DEFAULT 0,
    isv_gravable      numeric(12,2) NOT NULL DEFAULT 0,
    isv_exento        numeric(12,2) NOT NULL DEFAULT 0,
    isv_amount        numeric(12,2) NOT NULL DEFAULT 0,
    discount_amount   numeric(12,2) NOT NULL DEFAULT 0,
    total             numeric(12,2) NOT NULL DEFAULT 0,

    -- Sale lifecycle. 'completed' = finished & paid. 'cancelled'
    -- = voided. 'returned' = stock came back. Kept as a CHECK
    -- (not a pg enum) for easy future additions.
    status            varchar(20) NOT NULL DEFAULT 'completed'
                      CHECK (status IN ('completed', 'cancelled', 'returned')),

    -- FISCAL (SHAPE ONLY — blocked on real CAI, see header note)
    cai               varchar(50),
    document_series   varchar(20),      -- e.g. current series FARMMI000
    document_number   varchar(30),      -- sequential SAR doc number
    is_fiscal         boolean NOT NULL DEFAULT false,  -- true once a real invoice is emitted

    notes             text,
    created_at        timestamp without time zone DEFAULT now(),
    updated_at        timestamp without time zone DEFAULT now()
);

CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);

-- ------------------------------------------------------------
-- sale_items — one row per product-lot sold
-- ------------------------------------------------------------
-- lot_id is DIRECT: every line knows its exact batch. A single
-- cart line spanning two lots = two sale_item rows. Snapshots of
-- price/cost are stored on the line (not just FK'd) so a later
-- price change on the product never rewrites sale history.
CREATE TABLE sale_items (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id       uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_id       uuid NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    lot_id        uuid NOT NULL REFERENCES inventory_lots(id) ON DELETE RESTRICT,

    quantity      numeric(10,3) NOT NULL,            -- fractional sales allowed
    unit_price    numeric(10,2) NOT NULL,            -- selling price AT TIME OF SALE (snapshot)
    unit_cost     numeric(10,2) NOT NULL,            -- lot cost AT TIME OF SALE (snapshot, for margin)
    line_total    numeric(12,2) NOT NULL,            -- quantity * unit_price

    -- Per-line tax treatment. A pharmacy basket mixes taxable and
    -- exempt items, so ISV status is decided per line, not per sale.
    is_exempt     boolean NOT NULL DEFAULT false,
    isv_amount    numeric(12,2) NOT NULL DEFAULT 0,  -- tax on this line (0 if exempt)

    created_at    timestamp without time zone DEFAULT now()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_item ON sale_items(item_id);
CREATE INDEX idx_sale_items_lot ON sale_items(lot_id);

-- ------------------------------------------------------------
-- payments — one row per payment method used on a sale
-- ------------------------------------------------------------
-- Split payments => multiple rows (e.g. L.300 efectivo + L.200 tarjeta).
-- Corte de Caja = GROUP BY method, SUM(amount) over a shift window.
CREATE TABLE payments (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id        uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,

    -- English in the DB; mapped to Spanish in the frontend (like status enums).
    --   cash → Efectivo, card → Tarjeta, credit → Crédito, transfer → Transferencia
    method         varchar(20) NOT NULL
                   CHECK (method IN ('cash', 'card', 'credit', 'transfer')),
    amount         numeric(12,2) NOT NULL,

    -- For cash: amount handed over and change given (drawer reconciliation).
    -- Null for non-cash methods.
    amount_tendered numeric(12,2),
    change_given    numeric(12,2),

    -- Optional reference (card auth code, transfer ref, etc.)
    reference      varchar(100),

    created_at     timestamp without time zone DEFAULT now()
);

CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_created_at ON payments(created_at);

COMMIT;