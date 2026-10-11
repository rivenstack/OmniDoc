-- B-07 V6: lexical search support over chunk text.
--
-- Additive only. Search stays tenant/workspace-scoped in the adapter; this index only
-- accelerates PostgreSQL full-text matching over already-tenant-scoped chunk rows.

CREATE INDEX idx_chunks_lexical_english
	ON chunks
	USING GIN (to_tsvector('english', text));