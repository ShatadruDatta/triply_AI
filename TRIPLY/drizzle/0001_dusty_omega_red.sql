CREATE TYPE "public"."day_status" AS ENUM('ready', 'regenerating', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ledger_kind" AS ENUM('generate', 'regenerate_day', 'refund');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('pending', 'generating', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_day_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"time_slot" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"est_cost" integer,
	"place_id" text,
	"lat" double precision,
	"lng" double precision,
	"address" text,
	"image_url" text,
	"image_credit" jsonb
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"name" text NOT NULL,
	"area" text,
	"place_id" text,
	"lat" double precision,
	"lng" double precision,
	"address" text,
	"rating" double precision,
	"price_range" text,
	"image_url" text,
	"image_credit" jsonb
);
--> statement-breakpoint
CREATE TABLE "trip_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"status" "day_status" DEFAULT 'ready' NOT NULL,
	CONSTRAINT "trip_days_trip_day_unique" UNIQUE("trip_id","day_number")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "trip_status" DEFAULT 'pending' NOT NULL,
	"destination_place_id" text,
	"destination_name" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"travelers" integer NOT NULL,
	"budget_tier" text NOT NULL,
	"budget_amount" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"interests" text[] DEFAULT '{}' NOT NULL,
	"pace" text NOT NULL,
	"notes" text,
	"summary" text,
	"hero_image_url" text,
	"hero_image_credit" jsonb,
	"budget_breakdown" jsonb,
	"share_token" text,
	"share_enabled" boolean DEFAULT false NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "trips_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "usage_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trip_id" uuid,
	"kind" "ledger_kind" NOT NULL,
	"units" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_ledger_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_trip_day_id_trip_days_id_fk" FOREIGN KEY ("trip_day_id") REFERENCES "public"."trip_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_days" ADD CONSTRAINT "trip_days_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_day_idx" ON "activities" USING btree ("trip_day_id","position");--> statement-breakpoint
CREATE INDEX "trips_user_idx" ON "trips" USING btree ("user_id","created_at");