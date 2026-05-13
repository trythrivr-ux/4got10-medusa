import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "site_settings" ("id" text not null, "locked" boolean not null default false, "checkout_mode" text not null default 'standard', "stripe_mode" text not null default 'test', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "site_settings_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_site_settings_deleted_at" ON "site_settings" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    // Seed a singleton row
    this.addSql(
      `insert into "site_settings" ("id", "locked", "checkout_mode", "stripe_mode") values ('global', false, 'standard', 'test') on conflict do nothing;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "site_settings" cascade;`);
  }
}
