CREATE TYPE "public"."classroom_roles" AS ENUM('teacher', 'student');--> statement-breakpoint
CREATE TYPE "public"."scopes" AS ENUM('read', 'translate', 'write');--> statement-breakpoint
CREATE TYPE "public"."worksheet_progress" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "classroom_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"classroom_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "classroom_roles" DEFAULT 'student' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classrooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"class_code" varchar(24) NOT NULL,
	"owner_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "classrooms_class_code_unique" UNIQUE("class_code")
);
--> statement-breakpoint
CREATE TABLE "user_worksheet_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"worksheet_id" integer NOT NULL,
	"status" "worksheet_progress" DEFAULT 'not_started' NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "worksheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"classroom_id" integer,
	"title" varchar(255) NOT NULL,
	"description" varchar(1000),
	"created_by_user_id" integer NOT NULL,
	"is_assigned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET DATA TYPE "public"."scopes"[] USING "scopes"::"public"."scopes"[];--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "scopes" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "public_key" varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_worksheet_id" integer;--> statement-breakpoint
ALTER TABLE "classroom_memberships" ADD CONSTRAINT "classroom_memberships_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_memberships" ADD CONSTRAINT "classroom_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_worksheet_progress" ADD CONSTRAINT "user_worksheet_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_worksheet_progress" ADD CONSTRAINT "user_worksheet_progress_worksheet_id_worksheets_id_fk" FOREIGN KEY ("worksheet_id") REFERENCES "public"."worksheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_public_key_unique" UNIQUE("public_key");