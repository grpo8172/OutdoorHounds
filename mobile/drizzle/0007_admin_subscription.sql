ALTER TABLE `subscriptions` ADD COLUMN `tier` enum('listing','admin') NOT NULL DEFAULT 'listing';
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD COLUMN `admin_token` varchar(64);
