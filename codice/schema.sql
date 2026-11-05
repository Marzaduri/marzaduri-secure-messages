CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  ct          TEXT NOT NULL,      -- testo cifrato (AES-256-GCM), illeggibile per il server
  iv          TEXT NOT NULL,
  auth        TEXT NOT NULL,      -- SHA-256 del token derivato dalla chiave: non permette di decifrare
  pw          INTEGER NOT NULL,   -- 1 se il mittente ha aggiunto una password
  expires_at  INTEGER NOT NULL,   -- millisecondi epoch
  attempts    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_expires ON messages (expires_at);
