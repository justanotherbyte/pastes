-- Pastes are immutable: saving an edited paste creates a new row.
CREATE TABLE IF NOT EXISTS pastes (
	paste_id      TEXT PRIMARY KEY NOT NULL,          -- 6-char [A-Za-z0-9]
	content       TEXT NOT NULL,
	language      TEXT NOT NULL DEFAULT 'text',       -- highlight.js language id
	password_hash TEXT,                               -- hex PBKDF2-SHA256, NULL = public
	password_salt TEXT,                               -- hex, 16 random bytes
	created_at    INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;
