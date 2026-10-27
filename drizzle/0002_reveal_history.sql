ALTER TABLE rooms ADD COLUMN revealed_mask INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN fallback_mask INTEGER NOT NULL DEFAULT 0;
-- Historical stages have no reliable reveal log: only trust the current explicit reveal.
UPDATE rooms SET revealed_mask=(1 << stage) WHERE stage BETWEEN 1 AND 6 AND phase='revealed';
