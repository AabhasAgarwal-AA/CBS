import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const transfers = await db.shareTransfer.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { share: { select: { shareNo: true } } },
  });
  return NextResponse.json({ transfers });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { shareId, fromCustomerId, toCustomerId, quantity } = body as Record<string, unknown>;
  if (!shareId || !fromCustomerId || !toCustomerId || !quantity) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const share = await db.share.findUnique({ where: { id: String(shareId) } });
  if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });
  if (share.customerId !== String(fromCustomerId)) {
    return NextResponse.json({ error: "Share does not belong to from-customer" }, { status: 400 });
  }
  if (share.quantity < Number(quantity)) {
    return NextResponse.json({ error: "Insufficient share quantity" }, { status: 400 });
  }
  const transferValue = share.faceValue * Number(quantity);

  return db
    .$transaction(async (tx) => {
      // Reduce from-share quantity
      const updatedShare = await tx.share.update({
        where: { id: share.id },
        data: { quantity: { decrement: Number(quantity) } },
      });
      // Create new share for to-customer
      const count = await tx.share.count();
      const newShareNo = `SHR-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
      const newShare = await tx.share.create({
        data: {
          shareNo: newShareNo,
          customerId: String(toCustomerId),
          faceValue: share.faceValue,
          quantity: Number(quantity),
          paidValue: share.faceValue,
          status: "ACTIVE",
        },
      });
      const transfer = await tx.shareTransfer.create({
        data: {
          shareId: share.id,
          fromCustomerId: String(fromCustomerId),
          toCustomerId: newShare.id,
          quantity: Number(quantity),
          transferValue,
          status: "COMPLETED",
        },
      });
      // If original share is now empty, mark transferred
      if (updatedShare.quantity === 0) {
        await tx.share.update({
          where: { id: updatedShare.id },
          data: { status: "TRANSFERRED", transferredAt: new Date() },
        });
      }
      return { transfer, newShare };
    }, { timeout: 30000, maxWait: 15000 })
    .then(async ({ transfer }) => {
      await recordAudit({
        userId: user.id,
        action: "SHARE_TRANSFER",
        entity: "SHARE",
        entityId: transfer.id,
        details: `Transferred ${quantity} shares from ${fromCustomerId} to ${toCustomerId} (value ₹${transferValue})`,
      });
      return NextResponse.json({ transfer }, { status: 201 });
    })
    .catch((e: unknown) =>
      NextResponse.json({ error: e instanceof Error ? e.message : "Transfer failed" }, { status: 400 })
    );
}
