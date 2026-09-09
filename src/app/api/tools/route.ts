import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

// GET — system tools dashboard (counts and cleanup options)
export async function GET() {
  const [txns, auditLogs, smsLogs, modificationLogs, vouchers] = await Promise.all([
    db.transaction.count(),
    db.auditLog.count(),
    db.smsLog.count(),
    db.modificationLog.count(),
    db.voucher.count(),
  ]);
  return NextResponse.json({
    counts: { transactions: txns, auditLogs, smsLogs, modificationLogs, vouchers },
    tools: [
      { key: "clear_audit", label: "Clear Audit Log", desc: "Delete all audit log entries older than 90 days" },
      { key: "clear_sms", label: "Clear SMS Log", desc: "Delete all SMS log entries older than 30 days" },
      { key: "clear_modifications", label: "Clear Modification Log", desc: "Delete all modification log entries" },
      { key: "reindex_db", label: "Reindex Database", desc: "Rebuild database indexes for performance" },
      { key: "backup_db", label: "Backup Database", desc: "Export database to a backup file" },
    ],
  });
}

// POST — execute a tool
export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { tool } = body as Record<string, unknown>;
  if (!tool) return NextResponse.json({ error: "tool required" }, { status: 400 });

  let result = "";
  switch (tool) {
    case "clear_audit": {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const r = await db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      result = `Deleted ${r.count} audit log entries older than 90 days`;
      break;
    }
    case "clear_sms": {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const r = await db.smsLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      result = `Deleted ${r.count} SMS log entries older than 30 days`;
      break;
    }
    case "clear_modifications": {
      const r = await db.modificationLog.deleteMany({});
      result = `Deleted ${r.count} modification log entries`;
      break;
    }
    case "reindex_db":
      result = "Database reindexed (demo — SQLite auto-indexes)";
      break;
    case "backup_db":
      result = "Database backup initiated (demo — would create a snapshot in production)";
      break;
    default:
      return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  }
  await recordAudit({
    userId: user.id, action: "TOOL_EXEC", entity: "SYSTEM", entityId: null,
    details: `Executed tool ${tool}: ${result}`,
  });
  return NextResponse.json({ ok: true, result });
}
