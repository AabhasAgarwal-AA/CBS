import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createCustomerSession } from "@/lib/customer-session";

// POST /api/customer-portal/login — customer logs in with phone + MPIN
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone, mpin } = body as Record<string, unknown>;
  if (!phone || !mpin) {
    return NextResponse.json({ error: "phone and mpin required" }, { status: 400 });
  }
  const customer = await db.customer.findFirst({
    where: { phone: String(phone), status: "ACTIVE" },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  if (!customer.mpin) {
    return NextResponse.json({ error: "MPIN not set. Please visit your branch to activate mobile banking." }, { status: 400 });
  }
  const { createHash } = await import("crypto");
  const hash = createHash("sha256").update(String(mpin) + "::mpin-salt").digest("hex");
  if (hash !== customer.mpin) {
    return NextResponse.json({ error: "Invalid MPIN" }, { status: 401 });
  }
  const token = createCustomerSession({
    id: customer.id,
    customerNo: customer.customerNo,
    name: customer.fullName,
    phone: customer.phone,
  });
  const res = NextResponse.json({
    customer: { id: customer.id, customerNo: customer.customerNo, name: customer.fullName, phone: customer.phone },
  });
  res.cookies.set("cbs_customer_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30, // 30 min
  });
  return res;
}
