import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// POST /api/register  { name, email, password, flatNumber? }
// Always registers as RESIDENT — admin accounts are provisioned via seed
// or directly in the DB, never through public signup.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password, flatNumber } = body ?? {};

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: Role.RESIDENT,
      flatNumber: flatNumber || null,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
