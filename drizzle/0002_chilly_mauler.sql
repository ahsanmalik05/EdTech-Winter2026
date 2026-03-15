CREATE TABLE "languages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(16) NOT NULL,
	CONSTRAINT "languages_name_unique" UNIQUE("name"),
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
