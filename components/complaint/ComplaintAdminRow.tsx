"use client";

import { useState, useTransition } from "react";
import { ComplaintStatus, Priority } from "@prisma/client";
import { updateComplaint } from "@/app/actions/complaint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

type Complaint = {
  id: string;
  category: string;
  description: string;
  photoUrl: string | null;
  status: ComplaintStatus;
  priority: Priority;
  isClosed: boolean;
  createdAt: Date;
  resident: { name: string; flatNumber: string | null };
};

const priorityVariant: Record<Priority, "default" | "secondary" | "destructive"> = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "destructive",
};

export default function ComplaintAdminRow({
  complaint,
  overdue,
  daysOpenCount,
}: {
  complaint: Complaint;
  overdue: boolean;
  daysOpenCount: number;
}) {
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [priority, setPriority] = useState<Priority>(complaint.priority);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateComplaint({ complaintId: complaint.id, status, priority, note: note || undefined });
        setNote("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  return (
    <Card className={overdue ? "border-red-400" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{complaint.category}</CardTitle>
          {overdue && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
              <AlertTriangle size={14} /> Overdue ({daysOpenCount}d)
            </span>
          )}
        </div>
        <Badge variant={priorityVariant[complaint.priority]}>{complaint.priority}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {complaint.resident.name} {complaint.resident.flatNumber ? `· ${complaint.resident.flatNumber}` : ""}
        </p>
        <p className="text-sm">{complaint.description}</p>
        {complaint.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={complaint.photoUrl} alt="Complaint attachment" className="rounded-md max-h-40 object-cover" />
        )}

        {complaint.isClosed ? (
          <Badge variant="secondary">Resolved &amp; Locked</Badge>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            <Button size="sm" onClick={handleSave} disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}

        {!complaint.isClosed && (
          <Textarea
            placeholder="Optional note for this update..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}
