import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (user) {
    await import("@/lib/audit").then((m) =>
      m.recordAudit({
        userId: user.id,
        action: "LOGOUT",
        entity: "USER",
        entityId: user.id,
        details: `User ${user.email} logged out`,
      })
    );
  }
  if (token) destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("cbs_token");
  return res;
}
