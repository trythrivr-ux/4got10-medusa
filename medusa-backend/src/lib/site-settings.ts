/**
 * Shared helper — get or upsert the singleton SiteSettings row.
 * Pass `req.scope` (MedusaRequest scope) to resolve the service.
 */
export async function getSettings(scope: any) {
  const svc = scope.resolve("siteSettings") as any;
  // MedusaService({ SiteSetting }) generates listSiteSettings (singular → pluralised)
  const rows = await svc.listSiteSettings({});
  if (rows.length) return rows[0];
  // Create singleton row on first boot (Medusa generates a valid ULID id)
  return await svc.createSiteSettings({
    locked: false,
    checkout_mode: "standard",
    stripe_mode: "test",
  });
}

export async function updateSettings(scope: any, patch: Record<string, any>) {
  const svc = scope.resolve("siteSettings") as any;
  const settings = await getSettings(scope);
  return await svc.updateSiteSettings(settings.id, patch);
}
