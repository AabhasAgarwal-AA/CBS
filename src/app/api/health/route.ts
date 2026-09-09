import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Liveness/readiness probe. Deliberately unauthenticated — load balancers and
// uptime monitors hit this without a session cookie.
export const dynamic = "force-dynamic";

const startedAt = Date.now();

export async function GET() {
  const t0 = Date.now();
  let database: { status: string; latencyMs?: number; error?: string };

  try {
    await db.$queryRaw`SELECT 1`;
    database = { status: "up", latencyMs: Date.now() - t0 };
  } catch (e) {
    database = { status: "down", error: e instanceof Error ? e.message : String(e) };
  }

  const healthy = database.status === "up";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "cbs-core-banking-system",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      checks: { database },
    },
    { status: healthy ? 200 : 503 },
  );
}
