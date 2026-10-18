ALTER TABLE "pet_states" ADD COLUMN "name" varchar(16) DEFAULT 'Michi' NOT NULL;--> statement-breakpoint
ALTER TABLE "pet_states" ADD COLUMN "rename_count" integer DEFAULT 0 NOT NULL;
