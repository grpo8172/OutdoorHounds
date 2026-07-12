CREATE TABLE `guest_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`usage_date` varchar(10) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guest_usage_id` PRIMARY KEY(`id`),
	CONSTRAINT `guest_usage_user_id_unique` UNIQUE(`user_id`)
);
