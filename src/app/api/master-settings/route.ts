import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const settings = await db.masterSetting.findMany({
    orderBy: { category: "asc" },
  });
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { key, value, category, description } = body as Record<string, unknown>;
  if (!key || value === undefined) return NextResponse.json({ error: "key and value required" }, { status: 400 });
  const setting = await db.masterSetting.upsert({
    where: { key: String(key) },
    create: {
      key: String(key),
      value: String(value),
      category: (category as string) || "GENERAL",
      description: (description as string) || null,
    },
    update: {
      value: String(value),
      category: (category as string) || "GENERAL",
      description: (description as string) || null,
    },
  });
  return NextResponse.json({ setting }, { status: 201 });
}
