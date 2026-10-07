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
CREATE TABLE learn_schema (version integer PRIMARY KEY CHECK(version=1));
INSERT INTO learn_schema VALUES(1);
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
export const schemaDDL = sessionDDL + learningDDL;
