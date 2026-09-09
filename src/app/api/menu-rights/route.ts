import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET — list all menu rights per designation
export async function GET() {
  const rights = await db.designationMenuRight.findMany({
    include: { designation: { select: { code: true, name: true } } },
  });
  return NextResponse.json({ rights });
}

// POST — update or create menu rights for a designation
export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { designationId, menuKey, canView, canCreate, canEdit, canDelete } = body as Record<string, unknown>;
  if (!designationId || !menuKey) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const right = await db.designationMenuRight.upsert({
    where: { designationId_menuKey: { designationId: String(designationId), menuKey: String(menuKey) } },
    create: {
      designationId: String(designationId),
      menuKey: String(menuKey),
      canView: Boolean(canView),
      canCreate: Boolean(canCreate),
      canEdit: Boolean(canEdit),
      canDelete: Boolean(canDelete),
    },
    update: {
      canView: Boolean(canView),
      canCreate: Boolean(canCreate),
      canEdit: Boolean(canEdit),
      canDelete: Boolean(canDelete),
    },
  });
  return NextResponse.json({ right }, { status: 201 });
}
