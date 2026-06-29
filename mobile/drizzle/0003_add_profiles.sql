CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`display_name` varchar(255),
	`profile_type` varchar(64) NOT NULL DEFAULT 'individual',
	`location` varchar(255),
	`contact_email` varchar(320),
	`contact_phone` varchar(64),
	`bio` text,
	`preferred_modes_json` json,
	`profile_meta_json` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_user_id_unique` UNIQUE(`user_id`)
);
