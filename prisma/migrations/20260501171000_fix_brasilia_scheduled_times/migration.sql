-- Existing production requests were saved from datetime-local values as UTC.
-- They represent Brasilia wall-clock time, so move them to the correct UTC instant.
UPDATE "CareRequest"
SET "scheduledFor" = "scheduledFor" + INTERVAL '3 hours'
WHERE "scheduledFor" IS NOT NULL;
