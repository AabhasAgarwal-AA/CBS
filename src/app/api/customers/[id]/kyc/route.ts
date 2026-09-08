import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = (body.status as string) || "VERIFIED"; // VERIFIED | REJECTED

  const customer = await db.customer.update({
    where: { id },
    data: {
      kycStatus: status,
      kycDate: status === "VERIFIED" ? new Date() : null,
    },
  });
  await recordAudit({
    userId: user.id,
    action: "KYC_" + status,
    entity: "CUSTOMER",
    entityId: id,
    details: `KYC ${status} for ${customer.customerNo}`,
  });
  return NextResponse.json({ customer });
}
