ALTER TABLE learn_event DROP CONSTRAINT IF EXISTS learn_event_status_check;
ALTER TABLE learn_event ADD CONSTRAINT learn_event_status_check CHECK(status IN ('pending','settled','attention'));
ALTER TABLE learn_event ADD COLUMN IF NOT EXISTS last_error_code text;
