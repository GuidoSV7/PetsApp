ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "ix_user_roles_role_id" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
-- S3: a case-insensitive duplicate refuses to index (this statement fails
-- loudly instead of silently merging). Requires no lower-case duplicates.
CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" USING btree (lower("email"));
