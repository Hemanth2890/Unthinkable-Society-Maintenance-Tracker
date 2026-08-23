import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOverdue, sortForAdminView, daysOpen } from "@/lib/overdue";
import { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import ComplaintFilters from "@/components/complaint/ComplaintFilters";
import ComplaintAdminRow from "@/components/complaint/ComplaintAdminRow";
import NoticeComposer from "@/components/NoticeComposer";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { status?: string; category?: string; from?: string; to?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) redirect("/login");

  const where: Record<string, unknown> = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.category) where.category = searchParams.category;
  if (searchParams.from || searchParams.to) {
    where.createdAt = {
      ...(searchParams.from ? { gte: new Date(searchParams.from) } : {}),
      ...(searchParams.to ? { lte: new Date(searchParams.to) } : {}),
    };
  }

  const complaints = await prisma.complaint.findMany({
    where,
    include: { resident: { select: { name: true, flatNumber: true } } },
    orderBy: { createdAt: "desc" },
  });

  const sorted = sortForAdminView(complaints);
  const overdueCount = complaints.filter((c) => isOverdue(c)).length;

  const byStatus = complaints.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const byCategory = complaints.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={complaints.length} />
        {Object.entries(byStatus).map(([status, count]) => (
          <StatCard key={status} label={status.replace("_", " ")} value={count} />
        ))}
        <StatCard label="Overdue" value={overdueCount} tone="danger" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">By Category</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(byCategory).map(([cat, count]) => (
            <Badge key={cat} variant="secondary">{cat}: {count}</Badge>
          ))}
        </CardContent>
      </Card>

      <NoticeComposer />

      <ComplaintFilters />

      <div className="space-y-3">
        {sorted.map((c) => (
          <ComplaintAdminRow
            key={c.id}
            complaint={c}
            overdue={isOverdue(c)}
            daysOpenCount={daysOpen(c.createdAt)}
          />
        ))}
        {sorted.length === 0 && (
          <p className="text-muted-foreground text-sm">No complaints match these filters.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <Card className={tone === "danger" && value > 0 ? "border-red-400" : undefined}>
      <CardContent className="pt-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {tone === "danger" && value > 0 && <AlertTriangle className="text-red-500" size={20} />}
      </CardContent>
    </Card>
  );
}
