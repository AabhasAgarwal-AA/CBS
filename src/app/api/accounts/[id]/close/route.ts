import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let account = await db.account.findUnique({ where: { id } });
  if (!account) account = await db.account.findUnique({ where: { accountNumber: id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (account.status === "CLOSED") return NextResponse.json({ error: "Already closed" }, { status: 400 });
  if (account.balance > 0) return NextResponse.json({ error: "Account has balance - settle first" }, { status: 400 });

  account = await db.account.update({
    where: { id: account.id },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  await recordAudit({
    userId: user.id,
    action: "CLOSE",
    entity: "ACCOUNT",
    entityId: account.id,
    details: `Closed account ${account.accountNumber}`,
  });
  return NextResponse.json({ account });
}
