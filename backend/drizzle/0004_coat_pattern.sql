SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "pet_states" ADD COLUMN "coat_pattern" varchar(16) NOT NULL DEFAULT 'solid';
