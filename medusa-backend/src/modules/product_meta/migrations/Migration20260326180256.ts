import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260326180256 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_meta" drop column if exists "is_purchasable", drop column if exists "is_sold_out";`);

    this.addSql(`alter table if exists "product_meta" add column if not exists "sold_out_date" timestamptz null;`);
    this.addSql(`alter table if exists "product_meta" rename column "reveal_date" to "drop_date";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_meta" drop column if exists "sold_out_date";`);

    this.addSql(`alter table if exists "product_meta" add column if not exists "is_purchasable" boolean not null default true, add column if not exists "is_sold_out" boolean not null default false;`);
    this.addSql(`alter table if exists "product_meta" rename column "drop_date" to "reveal_date";`);
  }

}
