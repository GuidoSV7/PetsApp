SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "pet_states" ALTER COLUMN "coins" SET DEFAULT 0;
