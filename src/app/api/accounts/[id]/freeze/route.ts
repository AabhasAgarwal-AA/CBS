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
  if (account.status === "CLOSED") return NextResponse.json({ error: "Account is closed" }, { status: 400 });

  const newStatus = account.status === "FROZEN" ? "ACTIVE" : "FROZEN";
  account = await db.account.update({ where: { id: account.id }, data: { status: newStatus } });

  await recordAudit({
    userId: user.id,
    action: newStatus === "FROZEN" ? "FREEZE" : "UNFREEZE",
    entity: "ACCOUNT",
    entityId: account.id,
    details: `${newStatus === "FROZEN" ? "Froze" : "Unfroze"} account ${account.accountNumber}`,
  });
  return NextResponse.json({ account });
}
