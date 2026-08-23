import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pin } from "lucide-react";

type Notice = {
  id: string;
  title: string;
  body: string;
  isImportant: boolean;
  createdAt: Date;
  author: { name: string };
};

export default function NoticeBoard({ notices }: { notices: Notice[] }) {
  // Server already orders by [isImportant desc, createdAt desc]; this is a
  // defensive re-sort in case the component receives an unsorted array.
  const sorted = [...notices].sort((a, b) => {
    if (a.isImportant !== b.isImportant) return a.isImportant ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Notice Board</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((n) => (
          <div
            key={n.id}
            className={`p-3 rounded-md border ${n.isImportant ? "border-red-300 bg-red-50" : "border-muted"}`}
          >
            <div className="flex items-center gap-1 text-sm font-medium">
              {n.isImportant && <Pin size={14} className="text-red-500" />}
              {n.title}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {n.author.name} · {new Date(n.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">No notices posted yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
