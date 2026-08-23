import { Complaint, ComplaintStatus } from "@prisma/client";

/**
 * Overdue threshold, in days, after which an OPEN/IN_PROGRESS complaint
 * is considered overdue. Configurable via env so ops can tune it per
 * society without a code change.
 */
export const OVERDUE_THRESHOLD_DAYS = Number(
  process.env.OVERDUE_THRESHOLD_DAYS ?? 3
);

/**
 * Overdue status is NEVER persisted — it is derived at read-time from
 * createdAt vs. now(). This avoids stale flags, background cron jobs,
 * and race conditions between a scheduled job and a resolution update.
 */
export function isOverdue(
  complaint: Pick<Complaint, "status" | "createdAt" | "resolvedAt">,
  thresholdDays: number = OVERDUE_THRESHOLD_DAYS
): boolean {
  if (complaint.status === ComplaintStatus.RESOLVED) return false;

  const ageMs = Date.now() - new Date(complaint.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  return ageDays > thresholdDays;
}

export function daysOpen(createdAt: Date): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Sort helper: overdue complaints first, then by priority, then newest first. */
export function sortForAdminView<
  T extends { status: ComplaintStatus; createdAt: Date; resolvedAt: Date | null; priority: string }
>(complaints: T[]): T[] {
  const priorityRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  return [...complaints].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    const pDiff = priorityRank[a.priority] - priorityRank[b.priority];
    if (pDiff !== 0) return pDiff;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
