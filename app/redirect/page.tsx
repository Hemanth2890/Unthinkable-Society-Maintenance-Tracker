import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

// A single server-rendered hop that reads the just-established session and
// sends the user to the correct role dashboard — keeps the client login
// form free of role-branching logic.
export default async function RedirectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  redirect(session.user.role === Role.ADMIN ? "/admin" : "/resident");
}
