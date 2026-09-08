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
  const decision = (body.decision as string) || "APPROVED"; // APPROVED | REJECTED

  let loan = await db.loan.findUnique({ where: { id } });
  if (!loan) loan = await db.loan.findUnique({ where: { loanNumber: id } });
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (loan.status !== "PENDING")
    return NextResponse.json({ error: `Loan is ${loan.status}` }, { status: 400 });

  loan = await db.loan.update({
    where: { id: loan.id },
    data: { status: decision },
  });

  await recordAudit({
    userId: user.id,
    action: "LOAN_" + decision,
    entity: "LOAN",
    entityId: loan.id,
    details: `Loan ${loan.loanNumber} ${decision}`,
  });
  return NextResponse.json({ loan });
}
