-- Rollback for Step 20A.
-- Drops only the new orchestration function. It never reverses ownership decisions already made.
-- Existing ownership/claim data must be reconciled explicitly if a production claim was processed.

drop function if exists public.process_venue_claim(uuid, text);
