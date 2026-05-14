import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514000001 extends Migration {
  override async up(): Promise<void> {
    // Remove the manually-seeded 'global' row so the service creates a proper ULID row on first boot
    this.addSql(`DELETE FROM "site_settings" WHERE id = 'global';`);
  }

  override async down(): Promise<void> {
    this.addSql(
      `insert into "site_settings" ("id", "locked", "checkout_mode", "stripe_mode") values ('global', false, 'standard', 'test') on conflict do nothing;`
    );
  }
}
