CREATE TABLE `history` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection` text NOT NULL,
	`id` text NOT NULL,
	`value` text,
	`revision` integer NOT NULL,
	`at` text NOT NULL,
	`operation` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`collection` text NOT NULL,
	`id` text NOT NULL,
	`value` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`collection`, `id`)
);
