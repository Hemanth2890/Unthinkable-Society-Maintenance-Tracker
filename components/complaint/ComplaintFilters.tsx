"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUSES = ["", "OPEN", "IN_PROGRESS", "RESOLVED"];
const CATEGORIES = ["", "Plumbing", "Electrical", "Housekeeping", "Security", "Elevator", "Parking", "Other"];

export default function ComplaintFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <Card>
      <CardContent className="pt-4 flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor="filter-status">Status</Label>
          <select
            id="filter-status"
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={searchParams.get("status") ?? ""}
            onChange={(e) => setParam("status", e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s ? s.replace("_", " ") : "All"}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="filter-category">Category</Label>
          <select
            id="filter-category"
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={searchParams.get("category") ?? ""}
            onChange={(e) => setParam("category", e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c || "All"}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="filter-from">From</Label>
          <Input
            id="filter-from"
            type="date"
            value={searchParams.get("from") ?? ""}
            onChange={(e) => setParam("from", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="filter-to">To</Label>
          <Input
            id="filter-to"
            type="date"
            value={searchParams.get("to") ?? ""}
            onChange={(e) => setParam("to", e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={clearFilters}>Clear</Button>
      </CardContent>
    </Card>
  );
}
