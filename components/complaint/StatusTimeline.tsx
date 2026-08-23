import { ComplaintStatus, Priority } from "@prisma/client";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type HistoryEntry = {
  id: string;
  status: ComplaintStatus;
  priority: Priority;
  note: string | null;
  createdAt: Date;
  actor: { name: string; role: string };
};

const statusIcon: Record<ComplaintStatus, typeof Circle> = {
  OPEN: Circle,
  IN_PROGRESS: Clock,
  RESOLVED: CheckCircle2,
};

const statusColor: Record<ComplaintStatus, string> = {
  OPEN: "text-yellow-500",
  IN_PROGRESS: "text-blue-500",
  RESOLVED: "text-green-500",
};

export default function StatusTimeline({ history }: { history: HistoryEntry[] }) {
  return (
    <ol className="relative border-l border-muted pl-4 space-y-4">
      {history.map((entry) => {
        const Icon = statusIcon[entry.status];
        return (
          <li key={entry.id} className="ml-1">
            <span
              className={cn(
                "absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-background",
                statusColor[entry.status]
              )}
            >
              <Icon size={14} />
            </span>
            <div className="flex items-center gap-2 text-sm font-medium">
              {entry.status.replace("_", " ")}
              <span className="text-xs font-normal text-muted-foreground">
                · {entry.priority}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString()} — by {entry.actor.name} ({entry.actor.role})
            </p>
            {entry.note && <p className="text-sm mt-1">{entry.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
