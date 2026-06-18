ALTER TABLE "orders" ADD COLUMN "rider_disbursement_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rider_disbursement_receipt" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rider_disbursement_error" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_confirmed_at" timestamp;