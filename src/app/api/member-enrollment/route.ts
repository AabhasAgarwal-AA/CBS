import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const status = searchParams.get("status") ?? "";
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const enrollments = await db.memberEnrollment.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { fullName: true, customerNo: true, phone: true } },
      group: { select: { groupCode: true, groupName: true } },
    },
  });
  return NextResponse.json({ enrollments });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { customerId, groupId, membershipType } = body as Record<string, unknown>;
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  const count = await db.memberEnrollment.count();
  const enrollmentNo = `ENR-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const enrollment = await db.memberEnrollment.create({
    data: {
      enrollmentNo,
      customerId: String(customerId),
      groupId: (groupId as string) || null,
      membershipType: (membershipType as string) || "INDIVIDUAL",
      status: "ACTIVE",
    },
  });
  // If group, increment member count
  if (groupId) {
    await db.groupEnrollment.update({
      where: { id: String(groupId) },
      data: { memberCount: { increment: 1 } },
    });
  }
  await recordAudit({
    userId: user.id,
    action: "ENROLL_MEMBER",
    entity: "MEMBER_ENROLLMENT",
    entityId: enrollment.id,
    details: `Enrolled member ${enrollmentNo} for customer ${customerId}`,
  });
  return NextResponse.json({ enrollment }, { status: 201 });
}
