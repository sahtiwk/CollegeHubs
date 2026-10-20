-- Additive migration. Historical IDs, attempts, completion/event rows and triggers remain intact.
ALTER TABLE learn_schema DROP CONSTRAINT learn_schema_version_check;
ALTER TABLE learn_schema ADD CONSTRAINT learn_schema_version_check CHECK(version BETWEEN 2 AND 3);
CREATE TABLE domain_registry(id text PRIMARY KEY);
INSERT INTO domain_registry VALUES ('dsa'),('web'),('ml'),('backend'),('devops');
ALTER TABLE learning_path DROP CONSTRAINT learning_path_domain_check;
ALTER TABLE learning_path ADD CONSTRAINT learning_path_domain_registry FOREIGN KEY(domain) REFERENCES domain_registry(id);
CREATE TABLE content_origin(origin text PRIMARY KEY CHECK(origin LIKE 'https://%'));
INSERT INTO content_origin VALUES ('https://developer.mozilla.org'),('https://scikit-learn.org'),('https://www.postgresql.org'),('https://git-scm.com'),('https://docs.github.com'),('https://docs.docker.com');
CREATE FUNCTION permitted_reading_url(value text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT substring(value from '^https://[^/]+') = ANY(ARRAY['https://developer.mozilla.org','https://scikit-learn.org','https://www.postgresql.org','https://git-scm.com','https://docs.github.com','https://docs.docker.com']) AND value ~ '^https://[^/]+/' AND value !~ '[[:space:]]'
$$;
ALTER TABLE content_item DROP CONSTRAINT content_item_url_check;
ALTER TABLE content_item ADD CONSTRAINT content_item_url_check CHECK(permitted_reading_url(url));
CREATE TABLE curriculum_publication(version text PRIMARY KEY, content_hash text NOT NULL CHECK(length(content_hash)=64), metadata jsonb NOT NULL, published_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE canonical_skill(domain text NOT NULL REFERENCES domain_registry(id),slug text NOT NULL,canonical_id uuid NOT NULL UNIQUE,PRIMARY KEY(domain,slug));
INSERT INTO canonical_skill VALUES ('dsa','arrays','f44e1395-c7c9-4dbb-8290-6563fb514344'),
('dsa','iteration','7ae403c2-b540-41c1-8e91-e6433cb54e75'),
('web','html','fb61b17a-af8e-4f51-8c7a-3699c069171d'),
('web','css','ad3ea9a9-6e6e-41a0-8c20-cecd23a27e46'),
('dsa','complexity','6ac9f02f-49b4-447c-8ba9-b0af1c7750f4'),
('web','http','77ef7a2c-c4b1-463c-8c12-a23cadc4d5fb'),
('ml','data','80d83551-9867-48cd-8c13-2abb9858f35e'),
('ml','training','2de2a56b-5dec-47d3-8715-c87483ddf00e'),
('ml','evaluation','8bb4445c-dbe1-4c71-8ef0-57bcc1df2fa8'),
('backend','requests','6d3cb51e-9e46-4786-8ac1-a4931caa0493'),
('backend','validation','0c0273a0-ec20-41d1-84d4-1af48ec15067'),
('backend','persistence','92e48f32-82ed-4abc-89da-2d28d637ea1d'),
('devops','git','5e05462e-fe3c-43a3-87ca-6ac11ba7ed85'),
('devops','ci','eea14d6e-c2f4-4835-82c5-1bc6c33ebd43'),
('devops','containers','e9f148b9-db22-4c0e-82df-91a9af4e21a0');
CREATE TABLE node_award_claim(user_id text NOT NULL,canonical_id uuid NOT NULL REFERENCES canonical_skill(canonical_id),hub_id text NOT NULL,node_id uuid NOT NULL,attempt_id uuid NOT NULL,claimed_at timestamptz NOT NULL,PRIMARY KEY(user_id,canonical_id));
INSERT INTO node_award_claim(user_id,canonical_id,hub_id,node_id,attempt_id,claimed_at)
 SELECT DISTINCT ON(c.user_id,k.canonical_id) c.user_id,k.canonical_id,c.hub_id,c.node_id,c.attempt_id,c.completed_at FROM node_completion c JOIN skill_node n ON n.hub_id=c.hub_id AND n.id=c.node_id JOIN canonical_skill k ON k.domain=n.domain AND k.slug=n.slug ORDER BY c.user_id,k.canonical_id,c.completed_at,c.attempt_id;
CREATE TRIGGER protect_award_claim BEFORE UPDATE OR DELETE ON node_award_claim FOR EACH ROW EXECUTE FUNCTION protect_completion();
CREATE TRIGGER protect_curriculum_publication BEFORE UPDATE OR DELETE ON curriculum_publication FOR EACH ROW EXECUTE FUNCTION protect_completion();
CREATE UNIQUE INDEX one_active_path_version ON enrollment(hub_id,user_id,domain) WHERE active;
UPDATE learn_schema SET version=3;
