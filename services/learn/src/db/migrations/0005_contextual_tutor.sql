ALTER TABLE learn_schema DROP CONSTRAINT learn_schema_version_check;
ALTER TABLE learn_schema ADD CONSTRAINT learn_schema_version_check CHECK(version BETWEEN 2 AND 5);
CREATE TABLE tutor_cache(
 hub_id text NOT NULL,user_id text NOT NULL,node_id uuid NOT NULL,content_id uuid NOT NULL,
 version text NOT NULL,context_hash text NOT NULL,explanation text,provider text,model text,
 fetched_at timestamptz,retry_at timestamptz NOT NULL DEFAULT to_timestamp(0),
 PRIMARY KEY(hub_id,user_id,node_id,content_id),
 FOREIGN KEY(hub_id,user_id) REFERENCES learner(hub_id,user_id),
 FOREIGN KEY(hub_id,node_id,content_id) REFERENCES content_item(hub_id,node_id,id)
);
UPDATE learn_schema SET version=5;
