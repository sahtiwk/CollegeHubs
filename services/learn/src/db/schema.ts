export const sessionDDL = `
CREATE TABLE module_handoff (
 state_hash text PRIMARY KEY CHECK (state_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX module_handoff_expiry ON module_handoff(expires_at);
CREATE TABLE module_session (
 session_hash text PRIMARY KEY CHECK (session_hash ~ '^[a-f0-9]{64}$'),
 user_id text NOT NULL CHECK (user_id ~ '^[a-f0-9]{24}$'),
 hub_id text NOT NULL CHECK (hub_id ~ '^[a-f0-9]{24}$'),
 principal json NOT NULL, theme json NOT NULL,
 csrf_hash text NOT NULL CHECK (csrf_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX module_session_owner ON module_session(hub_id,user_id);
CREATE INDEX module_session_expiry ON module_session(expires_at);
`;

// Fresh schema only; retained installations need a separately reviewed migration.
export const learningDDL = `
CREATE TABLE learn_schema (version integer PRIMARY KEY CHECK(version=2));
INSERT INTO learn_schema VALUES(2);
CREATE TABLE learner (
 hub_id text NOT NULL CHECK(hub_id ~ '^[a-f0-9]{24}$'),
 user_id text NOT NULL CHECK(user_id ~ '^[a-f0-9]{24}$'),
 goal text NOT NULL DEFAULT '' CHECK(length(goal)<=240),
 daily_minutes integer NOT NULL DEFAULT 20 CHECK(daily_minutes IN (10,20,30,45,60)),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(hub_id,user_id)
);
CREATE TABLE learning_path (
 hub_id text NOT NULL CHECK(hub_id ~ '^[a-f0-9]{24}$'),
 domain text NOT NULL CHECK(domain IN ('dsa','web')), version text NOT NULL,
 PRIMARY KEY(hub_id,domain,version)
);
CREATE TABLE skill_node (
 hub_id text NOT NULL, id uuid NOT NULL, domain text NOT NULL, version text NOT NULL,
 slug text NOT NULL, label text NOT NULL, description text NOT NULL, position integer NOT NULL CHECK(position>=0),
 PRIMARY KEY(hub_id,id), UNIQUE(hub_id,domain,version,id), UNIQUE(hub_id,domain,version,slug),
 FOREIGN KEY(hub_id,domain,version) REFERENCES learning_path(hub_id,domain,version)
);
CREATE TABLE node_prerequisite (
 hub_id text NOT NULL, domain text NOT NULL, version text NOT NULL, node_id uuid NOT NULL, prerequisite_id uuid NOT NULL,
 PRIMARY KEY(hub_id,node_id,prerequisite_id), CHECK(node_id<>prerequisite_id),
 FOREIGN KEY(hub_id,domain,version,node_id) REFERENCES skill_node(hub_id,domain,version,id),
 FOREIGN KEY(hub_id,domain,version,prerequisite_id) REFERENCES skill_node(hub_id,domain,version,id)
);
CREATE TABLE content_item (
 hub_id text NOT NULL, node_id uuid NOT NULL, id uuid NOT NULL,
 title text NOT NULL, summary text NOT NULL, url text NOT NULL CHECK(url LIKE 'https://developer.mozilla.org/%'),
 attribution text NOT NULL, checked_at timestamptz NOT NULL,
 PRIMARY KEY(hub_id,id), UNIQUE(hub_id,node_id,id),
 FOREIGN KEY(hub_id,node_id) REFERENCES skill_node(hub_id,id)
);
CREATE TABLE enrollment (
 hub_id text NOT NULL, user_id text NOT NULL, domain text NOT NULL, version text NOT NULL,
 active boolean NOT NULL DEFAULT true, self_rating text NOT NULL DEFAULT 'new' CHECK(self_rating IN ('new','some','comfortable','advanced')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(hub_id,user_id,domain,version),
 FOREIGN KEY(hub_id,user_id) REFERENCES learner(hub_id,user_id),
 FOREIGN KEY(hub_id,domain,version) REFERENCES learning_path(hub_id,domain,version)
);
CREATE TABLE learner_node_state (
 hub_id text NOT NULL, user_id text NOT NULL, domain text NOT NULL, version text NOT NULL, node_id uuid NOT NULL,
 status text NOT NULL CHECK(status IN ('locked','unlocked','completed')),
 theta double precision CHECK(theta BETWEEN -3 AND 3), assessed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(hub_id,user_id,node_id),
 FOREIGN KEY(hub_id,user_id,domain,version) REFERENCES enrollment(hub_id,user_id,domain,version),
 FOREIGN KEY(hub_id,domain,version,node_id) REFERENCES skill_node(hub_id,domain,version,id),
 CHECK((theta IS NULL) = (assessed_at IS NULL))
);
CREATE INDEX learner_node_domain ON learner_node_state(hub_id,user_id,domain,version);
`;
export const assessmentDDL = `
CREATE TABLE quiz_item (
 hub_id text NOT NULL, node_id uuid NOT NULL, seed_id text NOT NULL, mode text NOT NULL CHECK(mode IN ('checkpoint','test-out')),
 item jsonb NOT NULL, PRIMARY KEY(hub_id,node_id,seed_id), FOREIGN KEY(hub_id,node_id) REFERENCES skill_node(hub_id,id)
);
CREATE TABLE quiz_attempt (
 hub_id text NOT NULL, user_id text NOT NULL, id uuid NOT NULL, request_id uuid NOT NULL, node_id uuid NOT NULL,
 domain text NOT NULL, version text NOT NULL, mode text NOT NULL CHECK(mode IN ('checkpoint','test-out')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','finalized','cancelled','expired')),
 questions jsonb NOT NULL, answers jsonb NOT NULL DEFAULT '{}', result jsonb, finalized_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes',
 PRIMARY KEY(hub_id,user_id,id), UNIQUE(hub_id,user_id,request_id), UNIQUE(hub_id,user_id,node_id,version,id),
 FOREIGN KEY(hub_id,user_id,domain,version) REFERENCES enrollment(hub_id,user_id,domain,version),
 FOREIGN KEY(hub_id,domain,version,node_id) REFERENCES skill_node(hub_id,domain,version,id),
 CHECK(jsonb_array_length(questions)=CASE WHEN mode='checkpoint' THEN 5 ELSE 10 END),
 CHECK((status='finalized')=(result IS NOT NULL AND finalized_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_active_quiz ON quiz_attempt(hub_id,user_id,node_id) WHERE status='active';
CREATE UNIQUE INDEX one_test_out ON quiz_attempt(hub_id,user_id,node_id,version) WHERE mode='test-out';
CREATE TABLE node_completion (
 hub_id text NOT NULL, user_id text NOT NULL, node_id uuid NOT NULL, version text NOT NULL,
 attempt_id uuid NOT NULL, completed_at timestamptz NOT NULL,
 PRIMARY KEY(hub_id,user_id,node_id,version),
 FOREIGN KEY(hub_id,user_id,node_id,version,attempt_id) REFERENCES quiz_attempt(hub_id,user_id,node_id,version,id)
);
CREATE TABLE learn_event (
 hub_id text NOT NULL, user_id text NOT NULL, attempt_id uuid NOT NULL, event_id text PRIMARY KEY,
 payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','settled','attention')),
 last_error_code text,
 receipt jsonb, tries integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_id uuid, lease_until timestamptz NOT NULL DEFAULT to_timestamp(0),
 FOREIGN KEY(hub_id,user_id,attempt_id) REFERENCES quiz_attempt(hub_id,user_id,id)
);
CREATE INDEX pending_learn_events ON learn_event(next_attempt_at) WHERE status='pending';
CREATE TABLE resource_cache (
 hub_id text NOT NULL, node_id uuid NOT NULL, resource jsonb, fetched_at timestamptz, retry_at timestamptz NOT NULL DEFAULT to_timestamp(0),
 PRIMARY KEY(hub_id,node_id), FOREIGN KEY(hub_id,node_id) REFERENCES skill_node(hub_id,id)
);
CREATE FUNCTION protect_quiz_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Attempts are retained'; END IF;
 IF OLD.status<>'active' OR (NEW.hub_id,NEW.user_id,NEW.id,NEW.request_id,NEW.node_id,NEW.domain,NEW.version,NEW.mode,NEW.questions,NEW.created_at,NEW.expires_at)
 IS DISTINCT FROM (OLD.hub_id,OLD.user_id,OLD.id,OLD.request_id,OLD.node_id,OLD.domain,OLD.version,OLD.mode,OLD.questions,OLD.created_at,OLD.expires_at)
 THEN RAISE EXCEPTION 'Immutable attempt'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_quiz_attempt BEFORE UPDATE OR DELETE ON quiz_attempt FOR EACH ROW EXECUTE FUNCTION protect_quiz_attempt();
CREATE FUNCTION protect_completion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Immutable completion'; END $$;
CREATE TRIGGER protect_completion BEFORE UPDATE OR DELETE ON node_completion FOR EACH ROW EXECUTE FUNCTION protect_completion();
CREATE FUNCTION protect_learn_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Events are retained'; END IF;
 IF OLD.status='settled' OR (NEW.hub_id,NEW.user_id,NEW.attempt_id,NEW.event_id,NEW.payload) IS DISTINCT FROM (OLD.hub_id,OLD.user_id,OLD.attempt_id,OLD.event_id,OLD.payload)
 THEN RAISE EXCEPTION 'Immutable event'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER protect_learn_event BEFORE UPDATE OR DELETE ON learn_event FOR EACH ROW EXECUTE FUNCTION protect_learn_event();
`;
export const schemaDDL = sessionDDL + learningDDL + assessmentDDL;
