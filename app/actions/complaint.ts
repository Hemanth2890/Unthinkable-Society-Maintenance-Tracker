"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendStatusChangeEmail, sendImportantNoticeEmail } from "@/lib/email";
import { ComplaintStatus, Priority, Role } from "@prisma/client";

type UpdateComplaintInput = {
  complaintId: string;
  status?: ComplaintStatus;
  priority?: Priority;
  note?: string;
};

export async function updateComplaint(input: UpdateComplaintInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const existing = await prisma.complaint.findUniqueOrThrow({
    where: { id: input.complaintId },
    include: { resident: true },
  });

  if (existing.isClosed) {
    throw new Error("Complaint is resolved and locked — no further updates allowed.");
  }

  const nextStatus = input.status ?? existing.status;
  const nextPriority = input.priority ?? existing.priority;
  const willClose = nextStatus === ComplaintStatus.RESOLVED;

  // Update + history insert happen in one transaction: either both persist
  // or neither does, so the audit trail can never drift from live state.
  const updated = await prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.update({
      where: { id: input.complaintId },
      data: {
        status: nextStatus,
        priority: nextPriority,
        isClosed: willClose,
        resolvedAt: willClose ? new Date() : existing.resolvedAt,
      },
    });

    await tx.complaintHistory.create({
      data: {
        complaintId: complaint.id,
        status: nextStatus,
        priority: nextPriority,
        note: input.note ?? null,
        actorId: session.user.id,
      },
    });

    return complaint;
  });

  // Fire-and-forget: notification failures shouldn't roll back the update.
  if (input.status && input.status !== existing.status) {
    await sendStatusChangeEmail({
      to: existing.resident.email,
      residentName: existing.resident.name,
      complaintId: updated.id,
      category: updated.category,
      newStatus: updated.status,
      note: input.note,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/resident");
  return updated;
}

export async function createNotice(input: { title: string; body: string; isImportant: boolean }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  const notice = await prisma.notice.create({
    data: {
      title: input.title,
      body: input.body,
      isImportant: input.isImportant,
      authorId: session.user.id,
    },
  });

  if (input.isImportant) {
    const residents = await prisma.user.findMany({
      where: { role: Role.RESIDENT },
      select: { email: true },
    });
    await sendImportantNoticeEmail({
      to: residents.map((r) => r.email),
      title: notice.title,
      body: notice.body,
    });
  }

  revalidatePath("/resident");
  revalidatePath("/admin");
  return notice;
}
