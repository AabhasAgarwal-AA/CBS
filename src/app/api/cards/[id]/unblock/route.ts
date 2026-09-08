import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let card = await db.card.findUnique({ where: { id } });
  if (!card) card = await db.card.findFirst({ where: { cardNumber: id } });
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (card.status !== "BLOCKED") return NextResponse.json({ error: "Card is not blocked" }, { status: 400 });

  card = await db.card.update({ where: { id: card.id }, data: { status: "ACTIVE" } });
  await recordAudit({
    userId: user.id,
    action: "CARD_UNBLOCK",
    entity: "CARD",
    entityId: card.id,
    details: `Unblocked card ****${card.cardNumber.slice(-4)}`,
  });
  return NextResponse.json({ card });
}
