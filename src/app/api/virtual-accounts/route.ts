import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const vas = await db.virtualAccount.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { fullName: true, customerNo: true } },
      _count: { select: { collections: true } },
    },
  });
  return NextResponse.json({ virtualAccounts: vas });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { customerId, linkedAccount, purpose, upiId } = body as Record<string, unknown>;
  const vaNo = `VA${Date.now().toString().slice(-10)}`;
  const va = await db.virtualAccount.create({
    data: {
      virtualAccNo: vaNo,
      customerId: (customerId as string) || null,
      linkedAccount: (linkedAccount as string) || null,
      purpose: (purpose as string) || "E_COLLECTION",
      upiId: (upiId as string) || `${vaNo.toLowerCase()}@cbabank`,
      status: "ACTIVE",
    },
  });
  await recordAudit({
    userId: user.id,
    action: "VA_CREATE",
    entity: "VIRTUAL_ACCOUNT",
    entityId: va.id,
    details: `Created virtual account ${vaNo} (purpose: ${purpose})`,
  });
  return NextResponse.json({ virtualAccount: va }, { status: 201 });
}
