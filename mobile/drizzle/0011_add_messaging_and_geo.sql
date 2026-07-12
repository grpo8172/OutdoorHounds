CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`buyer_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversations_item_id_buyer_user_id_unique` UNIQUE(`item_id`,`buyer_user_id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`sender_id` int NOT NULL,
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `catalogue_items` ADD `lat` decimal(10,7);
--> statement-breakpoint
ALTER TABLE `catalogue_items` ADD `lng` decimal(10,7);
--> statement-breakpoint
ALTER TABLE `swipes` ADD CONSTRAINT `swipes_user_id_catalogue_item_id_unique` UNIQUE(`user_id`,`catalogue_item_id`);
