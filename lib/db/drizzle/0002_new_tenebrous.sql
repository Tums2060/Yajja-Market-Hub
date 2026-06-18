ALTER TABLE "vendors" ADD COLUMN "payout_method" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "disbursement_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "disbursement_receipt" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "disbursement_error" text;