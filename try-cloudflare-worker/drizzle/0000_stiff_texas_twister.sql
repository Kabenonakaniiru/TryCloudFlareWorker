CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` text DEFAULT '2026-06-07T09:03:12.422Z'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_slug_unique` ON `groups` (`slug`);--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rule_id` integer,
	`target_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`calendar_event_id` text,
	`updated_at` text DEFAULT '2026-06-07T09:03:12.424Z',
	FOREIGN KEY (`rule_id`) REFERENCES `rules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer,
	`title` text NOT NULL,
	`interval` text DEFAULT 'daily' NOT NULL,
	`period_style` text,
	`start_at` text,
	`end_at` text,
	`reset_time` text DEFAULT '04:00' NOT NULL,
	`missed_behavior` text DEFAULT 'delete' NOT NULL,
	`notes` text,
	`schedule_data` text,
	`created_at` text DEFAULT '2026-06-07T09:03:12.423Z',
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
