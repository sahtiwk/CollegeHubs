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
