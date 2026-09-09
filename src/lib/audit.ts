// Audit log helper
import { db } from "@/lib/db";

export async function recordAudit(opts: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
}) {
  try {
    // Validate that the user still exists in the DB. If not (e.g., after a
    // re-seed), set userId to null to avoid FK constraint violations.
    let userId = opts.userId ?? null;
    if (userId) {
      const u = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!u) userId = null;
    }
    await db.auditLog.create({
      data: {
        userId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId ?? null,
        details: opts.details ?? null,
      },
    });
  } catch (e) {
    // ignore audit failures
    console.error("audit log error", e);
  }
}
