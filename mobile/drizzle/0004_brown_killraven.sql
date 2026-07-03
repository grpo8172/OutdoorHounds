CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`status` enum('active','refunded') NOT NULL DEFAULT 'active',
	`amount_cents` int NOT NULL DEFAULT 1000,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
