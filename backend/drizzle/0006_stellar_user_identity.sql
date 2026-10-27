SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
--> statement-breakpoint
CREATE TABLE "user_stellar_identities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "network" varchar(16) NOT NULL,
  "address" varchar(56) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pk_user_stellar_identities" PRIMARY KEY ("id"),
  CONSTRAINT "fk_stellar_identity_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "uq_stellar_identity_user" UNIQUE ("user_id"),
  CONSTRAINT "uq_stellar_identity_network_address" UNIQUE ("network", "address")
);
--> statement-breakpoint
CREATE TABLE "stellar_auth_challenges" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "purpose" varchar(5) NOT NULL,
  "network" varchar(16) NOT NULL,
  "address" varchar(56) NOT NULL,
  "transaction_hash" varchar(64) NOT NULL,
  "flow_hash" varchar(64) NOT NULL,
  "user_id" uuid,
  "session_hash" varchar(64),
  "expires_at" timestamp with time zone NOT NULL,
  "failed_attempts" integer DEFAULT 0 NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pk_stellar_auth_challenges" PRIMARY KEY ("id"),
  CONSTRAINT "fk_stellar_challenge_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE TABLE "stellar_auth_attempts" (
  "key" varchar(128) NOT NULL,
  "window_started_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "pk_stellar_auth_attempts" PRIMARY KEY ("key")
);
