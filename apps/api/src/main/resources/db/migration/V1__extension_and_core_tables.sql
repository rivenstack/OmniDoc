-- B-02 V1: year-1 shared-schema tables.
-- Ownership: Flyway runs as omnidoc_migrator (table owner).
-- Runtime role omnidoc_app is non-owner; DML grants land in V2 / default privileges.
-- Column names align with B-01 / OpenAPI vocabulary (snake_case in SQL).
--
-- pgvector extension is created by the Compose/Testcontainers superuser init
-- (CREATE EXTENSION requires superuser). V1 assumes it already exists.

CREATE TABLE tenants (
	tenant_id   TEXT PRIMARY KEY,
	name        TEXT NOT NULL,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Minimal identity row; full session/password wiring is B-03.
CREATE TABLE actors (
	actor_id       TEXT PRIMARY KEY,
	email          TEXT NOT NULL,
	password_hash  TEXT,
	created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT actors_email_unique UNIQUE (email)
);

CREATE TABLE workspaces (
	workspace_id  TEXT PRIMARY KEY,
	tenant_id     TEXT NOT NULL REFERENCES tenants (tenant_id),
	name          TEXT NOT NULL,
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_tenant_id ON workspaces (tenant_id);

CREATE TABLE workspace_memberships (
	workspace_id  TEXT NOT NULL REFERENCES workspaces (workspace_id),
	actor_id      TEXT NOT NULL REFERENCES actors (actor_id),
	tenant_id     TEXT NOT NULL REFERENCES tenants (tenant_id),
	roles         TEXT[] NOT NULL DEFAULT '{}',
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
	PRIMARY KEY (workspace_id, actor_id)
);

CREATE INDEX idx_workspace_memberships_tenant_id ON workspace_memberships (tenant_id);
CREATE INDEX idx_workspace_memberships_actor_id ON workspace_memberships (actor_id);

CREATE TABLE notes (
	note_id              TEXT PRIMARY KEY,
	tenant_id            TEXT NOT NULL REFERENCES tenants (tenant_id),
	workspace_id         TEXT NOT NULL REFERENCES workspaces (workspace_id),
	title                TEXT NOT NULL,
	body_json            JSONB NOT NULL,
	current_version_id   TEXT NOT NULL,
	corpus_ownership     TEXT,
	soft_deleted_at      TIMESTAMPTZ,
	created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT notes_corpus_ownership_chk
		CHECK (corpus_ownership IS NULL OR corpus_ownership IN ('sample', 'mine'))
);

CREATE INDEX idx_notes_tenant_workspace ON notes (tenant_id, workspace_id);

CREATE TABLE note_versions (
	version_id   TEXT PRIMARY KEY,
	note_id      TEXT NOT NULL REFERENCES notes (note_id),
	tenant_id    TEXT NOT NULL REFERENCES tenants (tenant_id),
	title        TEXT NOT NULL,
	body_json    JSONB NOT NULL,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_note_versions_tenant_note ON note_versions (tenant_id, note_id);

-- Current version pointer (deferred FK so note + first version can insert in one txn).
ALTER TABLE notes
	ADD CONSTRAINT notes_current_version_fk
	FOREIGN KEY (current_version_id) REFERENCES note_versions (version_id)
	DEFERRABLE INITIALLY DEFERRED;
