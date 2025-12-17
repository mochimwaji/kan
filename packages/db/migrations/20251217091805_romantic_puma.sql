ALTER TABLE "card" ADD COLUMN "calendarOrder" integer;--> statement-breakpoint
ALTER TABLE "list" ADD COLUMN "color" varchar(7);--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "themeColors" json;