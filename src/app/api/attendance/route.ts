import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

// GET /api/attendance?date=&employeeId=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const employeeId = searchParams.get("employeeId");
  const where: Record<string, unknown> = {};
  if (date) {
    const day = new Date(date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    where.date = { gte: day, lt: next };
  }
  if (employeeId) where.employeeId = employeeId;
  const records = await db.attendance.findMany({
    where,
    orderBy: { date: "desc" },
    include: { employee: { select: { empCode: true, fullName: true, designation: { select: { name: true } } } } },
    take: 500,
  });
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const halfDay = records.filter((r) => r.status === "HALF_DAY").length;
  const onLeave = records.filter((r) => r.status === "LEAVE").length;
  return NextResponse.json({ records, present, absent, halfDay, onLeave });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { employeeId, date, status, checkIn, checkOut, remarks } = body as Record<string, unknown>;
  if (!employeeId || !date || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const day = new Date(date as string);
  try {
    const record = await db.attendance.upsert({
      where: { employeeId_date: { employeeId: String(employeeId), date: day } },
      create: {
        employeeId: String(employeeId),
        date: day,
        status: String(status),
        checkIn: checkIn ? new Date(checkIn as string) : null,
        checkOut: checkOut ? new Date(checkOut as string) : null,
        remarks: (remarks as string) || null,
      },
      update: {
        status: String(status),
        checkIn: checkIn ? new Date(checkIn as string) : null,
        checkOut: checkOut ? new Date(checkOut as string) : null,
        remarks: (remarks as string) || null,
      },
    });
    await recordAudit({
      userId: user.id,
      action: "ATTENDANCE_MARK",
      entity: "ATTENDANCE",
      entityId: record.id,
      details: `Marked ${status} for employee ${employeeId} on ${day.toISOString().slice(0, 10)}`,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
