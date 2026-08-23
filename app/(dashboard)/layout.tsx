import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <div className="font-semibold">Society Maintenance Tracker</div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {session.user.name} · {session.user.role}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
