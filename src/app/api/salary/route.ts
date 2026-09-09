import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

// GET /api/salary?month=&year=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const where: Record<string, unknown> = {};
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);
  const salaries = await db.salary.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { employee: { select: { empCode: true, fullName: true, designation: { select: { name: true } } } } },
    take: 500,
  });
  const totalNet = salaries.reduce((s, r) => s + r.netPay, 0);
  const totalPaid = salaries.filter((s) => s.status === "PAID").reduce((s, r) => s + r.netPay, 0);
  return NextResponse.json({ salaries, totalNet, totalPaid, count: salaries.length });
}

// POST /api/salary — create salary record for an employee for a month
export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "TELLER") return NextResponse.json({ error: "Admin/Manager only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { employeeId, month, year, deductions } = body as Record<string, unknown>;
  if (!employeeId || !month || !year) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const employee = await db.employee.findUnique({ where: { id: String(employeeId) } });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  const totalEarnings = employee.basicSalary + employee.hraAllowance + employee.otherAllowance;
  const deduct = Number(deductions ?? 0);
  const netPay = totalEarnings - deduct;
  const existing = await db.salary.findUnique({
    where: { employeeId_month_year: { employeeId: employee.id, month: Number(month), year: Number(year) } },
  });
  if (existing) return NextResponse.json({ error: "Salary already created for this month/year" }, { status: 400 });
  const salary = await db.salary.create({
    data: {
      employeeId: employee.id,
      month: Number(month),
      year: Number(year),
      basicSalary: employee.basicSalary,
      hraAllowance: employee.hraAllowance,
      otherAllowance: employee.otherAllowance,
      totalEarnings,
      deductions: deduct,
      netPay,
      status: "CREATED",
    },
    include: { employee: { select: { empCode: true, fullName: true } } },
  });
  await recordAudit({
    userId: user.id,
    action: "SALARY_CREATE",
    entity: "SALARY",
    entityId: salary.id,
    details: `Created salary for ${employee.empCode} for ${month}/${year} — net ₹${netPay}`,
  });
  return NextResponse.json({ salary }, { status: 201 });
}

// PATCH — mark salary as paid
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "TELLER") return NextResponse.json({ error: "Admin/Manager only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { salaryId } = body as Record<string, unknown>;
  if (!salaryId) return NextResponse.json({ error: "salaryId required" }, { status: 400 });
  const salary = await db.salary.update({
    where: { id: String(salaryId) },
    data: { status: "PAID", paidAt: new Date() },
  });
  await recordAudit({
    userId: user.id,
    action: "SALARY_PAY",
    entity: "SALARY",
    entityId: salary.id,
    details: `Paid salary ₹${salary.netPay} for month ${salary.month}/${salary.year}`,
  });
  return NextResponse.json({ salary });
}
