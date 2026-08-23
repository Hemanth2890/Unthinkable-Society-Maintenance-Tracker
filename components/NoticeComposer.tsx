"use client";

import { useState, useTransition } from "react";
import { createNotice } from "@/app/actions/complaint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NoticeComposer() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }

    startTransition(async () => {
      try {
        await createNotice({ title, body, isImportant });
        setTitle("");
        setBody("");
        setIsImportant(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to post notice");
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Post a Notice</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="notice-title">Title</Label>
            <Input id="notice-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="notice-body">Body</Label>
            <Textarea id="notice-body" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isImportant}
              onChange={(e) => setIsImportant(e.target.checked)}
            />
            Mark as important (pins to top &amp; emails all residents)
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Posting..." : "Post Notice"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
