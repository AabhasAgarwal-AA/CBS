import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const employees = await db.employee.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      designation: { select: { code: true, name: true, level: true } },
    },
  });
  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { fullName, email, phone, designationId, branchId, basicSalary, hraAllowance, otherAllowance, dateOfJoin } = body as Record<string, unknown>;
  if (!fullName || !phone || !designationId) return NextResponse.json({ error: "fullName, phone, designationId required" }, { status: 400 });
  const count = await db.employee.count();
  const empCode = `EMP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const employee = await db.employee.create({
    data: {
      empCode,
      fullName: String(fullName),
      email: (email as string) || null,
      phone: String(phone),
      designationId: String(designationId),
      branchId: (branchId as string) || null,
      basicSalary: Number(basicSalary ?? 0),
      hraAllowance: Number(hraAllowance ?? 0),
      otherAllowance: Number(otherAllowance ?? 0),
      dateOfJoin: dateOfJoin ? new Date(dateOfJoin as string) : new Date(),
    },
    include: { designation: true },
  });
  await recordAudit({
    userId: user.id,
    action: "EMPLOYEE_CREATE",
    entity: "EMPLOYEE",
    entityId: employee.id,
    details: `Created employee ${empCode} - ${fullName} (${employee.designation?.name})`,
  });
  return NextResponse.json({ employee }, { status: 201 });
}
