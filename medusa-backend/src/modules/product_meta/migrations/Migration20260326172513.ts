import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260326172513 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_meta" ("id" text not null, "reveal_date" timestamptz null, "is_purchasable" boolean not null default true, "is_sold_out" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_meta_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_meta_deleted_at" ON "product_meta" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_meta" cascade;`);
  }

}
