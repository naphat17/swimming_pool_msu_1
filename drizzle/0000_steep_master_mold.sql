-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `locker_reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`locker_id` int NOT NULL,
	`reservation_date` date NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed') DEFAULT 'pending',
	`checked_in` tinyint(1) DEFAULT 0,
	`notes` text,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `lockers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`location` varchar(100),
	`status` enum('available','maintenance','unavailable') DEFAULT 'available',
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `membership_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`duration_days` int NOT NULL,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`membership_type_id` int NOT NULL,
	`expires_at` datetime NOT NULL,
	`status` enum('active','expired','pending') DEFAULT 'active',
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`is_read` tinyint(1) DEFAULT 0,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
	`payment_method` enum('credit_card','bank_transfer','cash','qr_code','system') DEFAULT 'system',
	`transaction_id` varchar(100),
	`slip_url` varchar(255),
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `pool_resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`capacity` int NOT NULL,
	`status` enum('available','maintenance','closed') DEFAULT 'available',
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `pool_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pool_resource_id` int NOT NULL,
	`day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
	`open_time` time NOT NULL,
	`close_time` time NOT NULL,
	`is_active` tinyint(1) DEFAULT 1,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`pool_resource_id` int NOT NULL,
	`reservation_date` date NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed') DEFAULT 'pending',
	`checked_in` tinyint(1) DEFAULT 0,
	`notes` text,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`setting_key` varchar(100) NOT NULL,
	`setting_value` text,
	`description` text,
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `user_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`pay_per_session_price` decimal(10,2) NOT NULL,
	`annual_price` decimal(10,2) NOT NULL,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`email` varchar(100) NOT NULL,
	`password` varchar(255) NOT NULL,
	`first_name` varchar(50) NOT NULL,
	`last_name` varchar(50) NOT NULL,
	`phone` varchar(20),
	`address` text,
	`date_of_birth` date,
	`id_card` varchar(20),
	`user_category_id` int,
	`role` enum('user','admin') DEFAULT 'user',
	`status` enum('active','inactive') DEFAULT 'active',
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `locker_reservations` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `locker_reservations` ADD CONSTRAINT `fk_2` FOREIGN KEY (`locker_id`) REFERENCES `lockers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `fk_2` FOREIGN KEY (`membership_type_id`) REFERENCES `membership_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pool_schedules` ADD CONSTRAINT `fk_1` FOREIGN KEY (`pool_resource_id`) REFERENCES `pool_resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `fk_2` FOREIGN KEY (`pool_resource_id`) REFERENCES `pool_resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_category_id`) REFERENCES `user_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_locker_reservation_date` ON `locker_reservations` (`locker_id`,`reservation_date`);--> statement-breakpoint
CREATE INDEX `code` ON `lockers` (`code`);--> statement-breakpoint
CREATE INDEX `idx_memberships_user` ON `memberships` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_user_notifications` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `idx_user_payments` ON `payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_transaction_id` ON `payments` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_reservation_date` ON `reservations` (`reservation_date`);--> statement-breakpoint
CREATE INDEX `idx_user_reservations` ON `reservations` (`user_id`,`reservation_date`);--> statement-breakpoint
CREATE INDEX `idx_reservations_pool_date` ON `reservations` (`pool_resource_id`,`reservation_date`);--> statement-breakpoint
CREATE INDEX `username` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_username` ON `users` (`username`);
*/