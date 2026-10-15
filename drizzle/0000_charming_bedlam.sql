CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`planned_minutes` integer NOT NULL,
	`actual_minutes` integer,
	`actual` text DEFAULT '' NOT NULL,
	`reflection` text DEFAULT '' NOT NULL,
	`next_plan` text DEFAULT '' NOT NULL,
	`parent_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
