import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const status = searchParams.get("status") ?? "";
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const vendors = await db.vendor.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { vouchers: true } } },
  });
  return NextResponse.json({ vendors });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, email, phone, address, city, state, pincode, pan, gstin } = body as Record<string, unknown>;
  if (!name || !phone) return NextResponse.json({ error: "name and phone required" }, { status: 400 });
  const count = await db.vendor.count();
  const vendorCode = `VND-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const vendor = await db.vendor.create({
    data: {
      vendorCode,
      name: String(name),
      email: (email as string) || null,
      phone: String(phone),
      address: (address as string) || null,
      city: (city as string) || null,
      state: (state as string) || null,
      pincode: (pincode as string) || null,
      pan: (pan as string) || null,
      gstin: (gstin as string) || null,
    },
  });
  await recordAudit({
    userId: user.id, action: "VENDOR_CREATE", entity: "VENDOR", entityId: vendor.id,
    details: `Created vendor ${vendorCode} - ${name}`,
  });
  return NextResponse.json({ vendor }, { status: 201 });
}
