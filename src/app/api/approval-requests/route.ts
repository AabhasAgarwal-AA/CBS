import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  const requests = await db.approvalRequest.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { type, entityId, entityName, amount, remarks } = body as Record<string, unknown>;
  if (!type || !entityId || !entityName) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const count = await db.approvalRequest.count();
  const requestNo = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const request = await db.approvalRequest.create({
    data: {
      requestNo,
      type: String(type),
      entityId: String(entityId),
      entityName: String(entityName),
      requestedBy: user.id,
      amount: amount ? Number(amount) : null,
      remarks: (remarks as string) || null,
      status: "PENDING",
    },
  });
  await recordAudit({
    userId: user.id, action: "REQUEST_CREATE", entity: "APPROVAL_REQUEST", entityId: request.id,
    details: `Created ${type} request ${requestNo} for ${entityName}`,
  });
  return NextResponse.json({ request }, { status: 201 });
}

// PATCH — approve or reject
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "TELLER") return NextResponse.json({ error: "Admin/Manager only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { requestId, decision, remarks } = body as Record<string, unknown>;
  if (!requestId || !decision) return NextResponse.json({ error: "requestId and decision required" }, { status: 400 });
  if (!["APPROVED", "REJECTED"].includes(String(decision))) return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  const request = await db.approvalRequest.findUnique({ where: { id: String(requestId) } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") return NextResponse.json({ error: `Already ${request.status}` }, { status: 400 });
  const updated = await db.approvalRequest.update({
    where: { id: request.id },
    data: { status: String(decision), approvedBy: user.id, remarks: (remarks as string) || null, decidedAt: new Date() },
  });
  await recordAudit({
    userId: user.id, action: `REQUEST_${decision}`, entity: "APPROVAL_REQUEST", entityId: request.id,
    details: `${decision} request ${request.requestNo} (${request.entityName})`,
  });
  return NextResponse.json({ request: updated });
}
