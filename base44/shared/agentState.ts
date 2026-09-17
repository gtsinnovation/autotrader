import { withDefaults } from "./gateEngine.ts";

export async function loadConfig(base44) {
  const rows = await base44.asServiceRole.entities.AgentConfig.list("-created_date", 1);
  if (rows.length) return { ...withDefaults(rows[0]), id: rows[0].id };
  const created = await base44.asServiceRole.entities.AgentConfig.create(withDefaults({}));
  return { ...withDefaults(created), id: created.id };
}

export async function log(base44, entry) {
  await base44.asServiceRole.entities.AuditLog.create({ severity: "info", ...entry });
}