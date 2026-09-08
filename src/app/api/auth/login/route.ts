import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  const user = await authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = createSession(user);
  await recordAudit({
    userId: user.id,
    action: "LOGIN",
    entity: "USER",
    entityId: user.id,
    details: `User ${user.email} logged in`,
  });
  const res = NextResponse.json({ user });
  res.cookies.set("cbs_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
