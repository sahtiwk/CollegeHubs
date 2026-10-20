-- Prospective completion facts; no historical attempts or receipts are rewritten.
ALTER TABLE learn_schema DROP CONSTRAINT learn_schema_version_check;
ALTER TABLE learn_schema ADD CONSTRAINT learn_schema_version_check CHECK(version BETWEEN 2 AND 4);
CREATE TABLE path_completion (
 hub_id text NOT NULL, user_id text NOT NULL, domain text NOT NULL, version text NOT NULL,
 attempt_id uuid NOT NULL, required_nodes jsonb NOT NULL CHECK(jsonb_typeof(required_nodes)='array' AND jsonb_array_length(required_nodes) BETWEEN 1 AND 100),
 completed_at timestamptz NOT NULL,
 PRIMARY KEY(user_id,domain,version),
 FOREIGN KEY(hub_id,user_id,domain,version) REFERENCES enrollment(hub_id,user_id,domain,version),
 FOREIGN KEY(hub_id,user_id,attempt_id) REFERENCES quiz_attempt(hub_id,user_id,id)
);
CREATE TRIGGER protect_path_completion BEFORE UPDATE OR DELETE ON path_completion FOR EACH ROW EXECUTE FUNCTION protect_completion();
CREATE TABLE remedial_plan (
 id uuid PRIMARY KEY, hub_id text NOT NULL, user_id text NOT NULL, node_id uuid NOT NULL, version text NOT NULL,
 attempt_id uuid NOT NULL, steps jsonb NOT NULL CHECK(jsonb_typeof(steps)='array' AND jsonb_array_length(steps) BETWEEN 1 AND 3),
 reviewed boolean NOT NULL DEFAULT false, resolved boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(hub_id,user_id,node_id,version),
 FOREIGN KEY(hub_id,user_id,node_id,version,attempt_id) REFERENCES quiz_attempt(hub_id,user_id,node_id,version,id)
);
UPDATE learn_schema SET version=4;
