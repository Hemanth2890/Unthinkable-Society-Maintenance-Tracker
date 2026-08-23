import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadComplaintPhoto } from "@/lib/upload";
import { ComplaintStatus, Priority, Role } from "@prisma/client";

// GET /api/complaints?status=OPEN&category=Plumbing&from=2025-01-01&to=2025-02-01
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as ComplaintStatus | null;
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};

  // Residents only ever see their own complaints, regardless of query params.
  if (session.user.role === Role.RESIDENT) {
    where.residentId = session.user.id;
  }

  if (status) where.status = status;
  if (category) where.category = category;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const complaints = await prisma.complaint.findMany({
    where,
    include: {
      resident: { select: { id: true, name: true, flatNumber: true } },
      history: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true, role: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ complaints });
}

// POST /api/complaints  (multipart/form-data: category, description, photo?)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.RESIDENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const category = formData.get("category") as string | null;
  const description = formData.get("description") as string | null;
  const photo = formData.get("photo") as File | null;

  if (!category || !description) {
    return NextResponse.json({ error: "category and description are required" }, { status: 400 });
  }

  let photoUrl: string | undefined;
  if (photo && photo.size > 0) {
    photoUrl = await uploadComplaintPhoto(photo);
  }

  // Complaint creation + first history row are written atomically so a
  // complaint never exists without an initial "OPEN" audit entry.
  const complaint = await prisma.$transaction(async (tx) => {
    const created = await tx.complaint.create({
      data: {
        category,
        description,
        photoUrl,
        status: ComplaintStatus.OPEN,
        priority: Priority.LOW,
        residentId: session.user.id,
      },
    });

    await tx.complaintHistory.create({
      data: {
        complaintId: created.id,
        status: ComplaintStatus.OPEN,
        priority: Priority.LOW,
        note: "Complaint raised",
        actorId: session.user.id,
      },
    });

    return created;
  });

  return NextResponse.json({ complaint }, { status: 201 });
}
