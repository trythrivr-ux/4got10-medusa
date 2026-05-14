/**
 * Shared helper — get or upsert the singleton SiteSettings row.
 * Pass `req.scope` (MedusaRequest scope) to resolve the service.
 */
export async function getSettings(scope: any) {
  const svc = scope.resolve("siteSettings") as any;
  const rows = await svc.listSiteSettings({});
  if (rows.length) return rows[0];
  // Create if not exists (first boot after migration)
  return await svc.createSiteSettings({
    locked: false,
    checkout_mode: "standard",
    stripe_mode: "test",
  });
}

export async function updateSettings(scope: any, patch: Record<string, any>) {
  const svc = scope.resolve("siteSettings") as any;
  const settings = await getSettings(scope);
  // Update by the actual row ID so MedusaService can find the record
  return await svc.updateSiteSettings(settings.id, patch);
}
