CREATE TABLE messages (
 id TEXT PRIMARY KEY NOT NULL,
 room TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
 player TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 stage INTEGER NOT NULL,
 payload TEXT NOT NULL,
 hidden INTEGER NOT NULL DEFAULT 0,
 submitted_at INTEGER NOT NULL,
 request_key TEXT NOT NULL,
 UNIQUE(room,player,stage,request_key)
);
--> statement-breakpoint
CREATE INDEX messages_room_stage ON messages(room,stage,submitted_at);
--> statement-breakpoint
-- Preserve the existing public text and its moderation state exactly once.
INSERT INTO messages(id,room,player,stage,payload,hidden,submitted_at,request_key)
SELECT a.id,a.room,a.player,a.stage,
 CASE WHEN a.stage=3 THEN json_object('text',json_extract(a.payload,'$.text')) ELSE a.payload END,
 a.hidden,a.submitted_at,'migrated:' || a.id
FROM answers a JOIN rooms r ON r.code=a.room
WHERE r.rules_version>=2 AND a.stage IN (1,2,3)
 AND (a.stage<>3 OR length(trim(coalesce(json_extract(a.payload,'$.text'),'')))>0);
