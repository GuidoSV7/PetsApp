CREATE TABLE "pet_states" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"guest_key" varchar(64) NOT NULL,
	"coins" integer DEFAULT 30 NOT NULL,
	"hunger" integer DEFAULT 72 NOT NULL,
	"fun" integer DEFAULT 80 NOT NULL,
	"energy" integer DEFAULT 65 NOT NULL,
	"hygiene" integer DEFAULT 78 NOT NULL,
	"coat_primary" varchar(7) DEFAULT '#8a8a8e' NOT NULL,
	"coat_secondary" varchar(7) DEFAULT '#b4b4b8' NOT NULL,
	"coat_accent" varchar(7) DEFAULT '#c9a0a8' NOT NULL,
	"status_key" varchar(32) DEFAULT 'idle' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_pet_states" PRIMARY KEY("id"),
	CONSTRAINT "uq_pet_states_guest_key" UNIQUE("guest_key")
);
