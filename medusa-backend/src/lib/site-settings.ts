/**
 * Shared helper — get or upsert the singleton SiteSettings row.
 * Pass `req.scope` (MedusaRequest scope) to resolve the service.
 */
export async function getSettings(scope: any) {
  const svc = scope.resolve("siteSettings") as any;
  const rows = await svc.listSiteSettings({ id: ["global"] });
  if (rows.length) return rows[0];
  // Create if not exists (first boot after migration)
  return await svc.createSiteSettings({
    id: "global",
    locked: false,
    checkout_mode: "standard",
    stripe_mode: "test",
  });
}

export async function updateSettings(scope: any, patch: Record<string, any>) {
  const svc = scope.resolve("siteSettings") as any;
  await getSettings(scope); // ensure row exists
  return await svc.updateSiteSettings({ id: "global" }, patch);
}
