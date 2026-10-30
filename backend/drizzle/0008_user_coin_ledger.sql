SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
CREATE TABLE "user_coin_balances" (
  "user_id" uuid NOT NULL,
  "balance" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "pk_user_coin_balances" PRIMARY KEY ("user_id"),
  CONSTRAINT "fk_coin_balance_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "ck_coin_balance_nonnegative" CHECK ("balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_coin_entries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "pet_id" uuid NOT NULL,
  "operation_id" uuid NOT NULL,
  "amount" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "pk_user_coin_entries" PRIMARY KEY ("id"),
  CONSTRAINT "uq_legacy_credit_pet" UNIQUE ("pet_id"),
  CONSTRAINT "fk_coin_entry_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "fk_coin_entry_pet" FOREIGN KEY ("pet_id", "user_id") REFERENCES "user_pet_ownership"("pet_id", "user_id"),
  CONSTRAINT "fk_coin_entry_operation" FOREIGN KEY ("operation_id", "user_id") REFERENCES "pet_claim_operations"("id", "user_id"),
  CONSTRAINT "ck_coin_entry_nonnegative" CHECK ("amount" >= 0)
);
