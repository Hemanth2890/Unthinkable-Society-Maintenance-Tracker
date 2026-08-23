import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import StatusTimeline from "@/components/complaint/StatusTimeline";
import NoticeBoard from "@/components/NoticeBoard";
import NewComplaintForm from "@/components/complaint/NewComplaintForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResidentDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.RESIDENT) redirect("/login");

  const [complaints, notices] = await Promise.all([
    prisma.complaint.findMany({
      where: { residentId: session.user.id },
      include: { history: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true, role: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notice.findMany({
      orderBy: [{ isImportant: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: { author: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="p-6 grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <NewComplaintForm />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">My Complaints</h2>
          {complaints.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{c.category}</CardTitle>
                <span className="text-xs px-2 py-1 rounded bg-muted">{c.status.replace("_", " ")}</span>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{c.description}</p>
                {c.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt="Complaint attachment" className="rounded-md max-h-48 object-cover" />
                )}
                <StatusTimeline history={c.history} />
              </CardContent>
            </Card>
          ))}
          {complaints.length === 0 && (
            <p className="text-sm text-muted-foreground">You haven't raised any complaints yet.</p>
          )}
        </div>
      </div>

      <div>
        <NoticeBoard notices={notices} />
      </div>
    </div>
  );
}
