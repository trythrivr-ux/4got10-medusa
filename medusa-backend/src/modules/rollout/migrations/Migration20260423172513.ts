import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260423172513 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "rollout" ("id" text not null, "name" text not null, "product_ids" jsonb null, "announcement_date" timestamptz null, "drop_date" timestamptz null, "sold_out_date" timestamptz null, "media" jsonb null, "features" jsonb null, "headliner" text null, "headliner_media" jsonb null, "description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rollout_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_rollout_deleted_at" ON "rollout" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "rollout" cascade;`);
  }
}
