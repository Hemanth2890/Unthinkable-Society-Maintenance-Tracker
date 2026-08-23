import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notices — pinned (isImportant) notices first, then newest first
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notices = await prisma.notice.findMany({
    orderBy: [{ isImportant: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json({ notices });
}
