ALTER TABLE "dogs" ADD COLUMN "custom_boarding_rate_cents" integer;--> statement-breakpoint
ALTER TABLE "dogs" ADD COLUMN "custom_daycare_rate_cents" integer;--> statement-breakpoint
UPDATE "dogs" SET "custom_boarding_rate_cents" = "custom_rate_cents" WHERE "custom_rate_cents" IS NOT NULL;