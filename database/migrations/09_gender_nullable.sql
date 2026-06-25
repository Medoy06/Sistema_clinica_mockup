-- ============================================================
-- Migration 09 — gender nullable on patients
-- ============================================================
-- gender was NOT NULL, but a missing gender on patient creation
-- crashed with a 500 (23502 not-null violation) instead of being
-- handled. Medically, sex/gender can legitimately be unknown at
-- registration (unconscious patient, incomplete intake), and forcing
-- it produces bad data (staff picking a random value to pass the form).
-- So: make it nullable. Optional-but-encouraged is the correct model.
-- ============================================================

BEGIN;

ALTER TABLE patients ALTER COLUMN gender DROP NOT NULL;

COMMIT;