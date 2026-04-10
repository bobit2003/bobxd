import { db } from "@workspace/db";
import { auditLog } from "@workspace/db";

export async function writeAudit(
  action: string,
  entity: string,
  opts?: { entityId?: string | number; details?: string; source?: string }
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      action,
      entity,
      entityId: opts?.entityId != null ? String(opts.entityId) : null,
      details: opts?.details ?? null,
      source: opts?.source ?? "system",
    });
  } catch {
    // Audit writes must never crash the caller
  }
}
