CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`player` text NOT NULL,
	`stage` integer NOT NULL,
	`payload` text NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answer_once` ON `answers` (`room`,`player`,`stage`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host_hash` text NOT NULL,
	`screen_hash` text NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`phase` text DEFAULT 'open' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`deadline` integer,
	`remaining` integer,
	`game_end` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
