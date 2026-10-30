SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "pet_claim_operations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "account_pet_id" uuid,
  "guest_pet_id" uuid,
  "choice" varchar(12),
  "status" varchar(12) DEFAULT 'pending' NOT NULL,
  "kind" varchar(12) DEFAULT 'claim' NOT NULL,
  "support_actor" varchar(120),
  "reason" varchar(500),
  "result" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "confirmed_at" timestamptz,
  CONSTRAINT "pk_pet_claim_operations" PRIMARY KEY ("id"),
  CONSTRAINT "uq_claim_operation_user" UNIQUE ("id", "user_id"),
  CONSTRAINT "fk_claim_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "fk_claim_account_pet" FOREIGN KEY ("account_pet_id") REFERENCES "pet_states"("id"),
  CONSTRAINT "fk_claim_guest_pet" FOREIGN KEY ("guest_pet_id") REFERENCES "pet_states"("id"),
  CONSTRAINT "ck_claim_choice" CHECK ("choice" IN ('keep_account', 'keep_guest')),
  CONSTRAINT "ck_claim_status" CHECK ("status" IN ('pending', 'confirmed')),
  CONSTRAINT "ck_claim_kind" CHECK ("kind" IN ('claim', 'restore'))
);
--> statement-breakpoint
CREATE TABLE "user_pet_ownership" (
  "pet_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "status" varchar(8) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "archived_at" timestamptz,
  "archive_reason" varchar(500),
  "archive_operation_id" uuid,
  CONSTRAINT "pk_user_pet_ownership" PRIMARY KEY ("pet_id"),
  CONSTRAINT "uq_owned_pet_user" UNIQUE ("pet_id", "user_id"),
  CONSTRAINT "fk_ownership_pet" FOREIGN KEY ("pet_id") REFERENCES "pet_states"("id"),
  CONSTRAINT "fk_ownership_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "fk_ownership_operation" FOREIGN KEY ("archive_operation_id", "user_id") REFERENCES "pet_claim_operations"("id", "user_id"),
  CONSTRAINT "ck_ownership_status" CHECK ("status" IN ('current', 'archived'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_current_pet" ON "user_pet_ownership" ("user_id") WHERE "status" = 'current';
