CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` varchar(191) NOT NULL,
	`password_hash` text NOT NULL,
	`role` enum('customer','vendor','rider','admin') NOT NULL DEFAULT 'customer',
	`phone` varchar(32),
	`avatar_url` text,
	`address` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` text NOT NULL,
	`owner_name` text,
	`category` enum('food','liquor','pharmacy','household') NOT NULL,
	`description` text,
	`image_url` text,
	`address` text,
	`lat` double,
	`lng` double,
	`rating` double DEFAULT 4.5,
	`delivery_time` varchar(64) DEFAULT '25-35 min',
	`min_order` double DEFAULT 0,
	`is_open` boolean NOT NULL DEFAULT true,
	`status` enum('pending_review','approved','rejected') NOT NULL DEFAULT 'approved',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` double NOT NULL,
	`image_url` text,
	`category` varchar(64) NOT NULL,
	`subcategory` varchar(64),
	`tags` text,
	`is_available` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`user_id` int NOT NULL,
	`is_admin` boolean NOT NULL DEFAULT false,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`user_id` int NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`admin_id` int NOT NULL,
	`image_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`from_user_id` int NOT NULL,
	`to_user_id` int NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rider_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`vehicle_type` text NOT NULL,
	`license_plate` text,
	`current_lat` double,
	`current_lng` double,
	`is_available` boolean NOT NULL DEFAULT true,
	`total_deliveries` int NOT NULL DEFAULT 0,
	`rating` double DEFAULT 5,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rider_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `rider_profiles_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`order_id` int,
	`read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`payment_id` int,
	`beneficiary_user_id` int,
	`entry_type` enum('escrow_in','payout_vendor','payout_rider','commission','refund') NOT NULL,
	`amount` double NOT NULL,
	`status` enum('held','released','reversed') NOT NULL DEFAULT 'held',
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`order_code` varchar(64),
	`user_id` int NOT NULL,
	`phone` varchar(32) NOT NULL,
	`amount` double NOT NULL,
	`method` varchar(32) NOT NULL DEFAULT 'mpesa',
	`status` enum('unpaid','pending','paid','failed') NOT NULL DEFAULT 'pending',
	`simulated` varchar(8) NOT NULL DEFAULT 'false',
	`checkout_request_id` varchar(191),
	`merchant_request_id` varchar(191),
	`mpesa_receipt` varchar(64),
	`result_code` varchar(16),
	`result_desc` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bill_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_order_id` int NOT NULL,
	`user_id` int NOT NULL,
	`amount` double NOT NULL,
	`paid` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bill_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`initiated_by` int NOT NULL,
	`status` enum('pending_payment','payment_complete','placed','cancelled') NOT NULL DEFAULT 'pending_payment',
	`delivery_address` text NOT NULL,
	`total` double NOT NULL,
	`amount_collected` double NOT NULL DEFAULT 0,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int NOT NULL,
	`product_name` text NOT NULL,
	`quantity` int NOT NULL,
	`unit_price` double NOT NULL,
	`total_price` double NOT NULL,
	`notes` text,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`vendor_id` int NOT NULL,
	`rider_id` int,
	`group_order_id` int,
	`status` enum('pending','accepted','confirmed','preparing','ready','picked_up','delivered','cancelled','rejected') NOT NULL DEFAULT 'pending',
	`delivery_address` text NOT NULL,
	`delivery_lat` double,
	`delivery_lng` double,
	`subtotal` double NOT NULL,
	`delivery_fee` double NOT NULL DEFAULT 2.5,
	`total` double NOT NULL,
	`payment_status` enum('unpaid','pending','paid','failed') NOT NULL DEFAULT 'unpaid',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(191) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;