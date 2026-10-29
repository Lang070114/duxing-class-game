import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', {
  code: text('code').primaryKey(), hostHash: text('host_hash').notNull(), screenHash: text('screen_hash').notNull(),
  stage: integer('stage').notNull().default(0), phase: text('phase').notNull().default('open'),
  revision: integer('revision').notNull().default(0), deadline: integer('deadline'), remaining: integer('remaining'),
  rulesVersion: integer('rules_version').notNull().default(1), isDemo: integer('is_demo').notNull().default(0), round: integer('round').notNull().default(0),
  gameEnd: integer('game_end'), createdAt: integer('created_at').notNull(), expiresAt: integer('expires_at').notNull(),
});
export const players = sqliteTable('players', {
  id: text('id').primaryKey(), room: text('room').notNull().references(() => rooms.code, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(), createdAt: integer('created_at').notNull(),
});
export const answers = sqliteTable('answers', {
  id: text('id').primaryKey(), room: text('room').notNull().references(() => rooms.code, { onDelete: 'cascade' }),
  player: text('player').notNull().references(() => players.id, { onDelete: 'cascade' }),
  stage: integer('stage').notNull(), payload: text('payload').notNull(), hidden: integer('hidden').notNull().default(0),
  submittedAt: integer('submitted_at').notNull(),
}, (t) => [uniqueIndex('answer_once').on(t.room, t.player, t.stage)]);

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(), room: text('room').notNull().references(() => rooms.code, { onDelete: 'cascade' }),
  player: text('player').notNull().references(() => players.id, { onDelete: 'cascade' }),
  stage: integer('stage').notNull(), payload: text('payload').notNull(), hidden: integer('hidden').notNull().default(0),
  submittedAt: integer('submitted_at').notNull(), requestKey: text('request_key').notNull(),
}, (t) => [uniqueIndex('message_delivery_once').on(t.room, t.player, t.stage, t.requestKey)]);
