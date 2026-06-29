CREATE TABLE `catalogue_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_type` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`price` varchar(64),
	`image_url` varchar(512),
	`status` enum('draft','pending_review','approved') NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalogue_items_id` PRIMARY KEY(`id`)
);