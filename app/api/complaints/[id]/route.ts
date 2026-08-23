import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// GET /api/complaints/:id — full detail with ordered history
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: {
      resident: { select: { id: true, name: true, flatNumber: true, email: true } },
      history: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { name: true, role: true } } },
      },
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Residents may only view their own complaint.
  if (session.user.role === Role.RESIDENT && complaint.residentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ complaint });
}
