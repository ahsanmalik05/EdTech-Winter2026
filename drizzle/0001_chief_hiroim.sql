CREATE TABLE "translation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_text" varchar NOT NULL,
	"translated_text" varchar,
	"target_language" varchar(16) NOT NULL,
	"model" varchar(255) NOT NULL,
	"token_count" integer,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "classroom_memberships" CASCADE;--> statement-breakpoint
DROP TABLE "classrooms" CASCADE;--> statement-breakpoint
DROP TABLE "user_worksheet_progress" CASCADE;--> statement-breakpoint
DROP TABLE "worksheets" CASCADE;--> statement-breakpoint
ALTER TABLE "translation_log" ADD CONSTRAINT "translation_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "last_worksheet_id";--> statement-breakpoint
DROP TYPE "public"."classroom_roles";--> statement-breakpoint
DROP TYPE "public"."worksheet_progress";