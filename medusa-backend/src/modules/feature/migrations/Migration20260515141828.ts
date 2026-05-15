import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260515141828 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "feature" ("id" text not null, "product_id" text not null, "name" text not null, "industry_category" text not null, "photo_file_id" text null, "action_photo_file_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "feature_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feature_deleted_at" ON "feature" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "feature" cascade;`);
  }

}
