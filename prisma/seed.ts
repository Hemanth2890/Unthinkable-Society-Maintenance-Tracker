import { PrismaClient, Role, ComplaintStatus, Priority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@society.app" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@society.app",
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const resident = await prisma.user.upsert({
    where: { email: "resident@society.app" },
    update: {},
    create: {
      name: "Ravi Kumar",
      email: "resident@society.app",
      password: passwordHash,
      role: Role.RESIDENT,
      flatNumber: "A-101",
    },
  });

  const resident2 = await prisma.user.upsert({
    where: { email: "resident2@society.app" },
    update: {},
    create: {
      name: "Priya Sharma",
      email: "resident2@society.app",
      password: passwordHash,
      role: Role.RESIDENT,
      flatNumber: "B-204",
    },
  });

  const complaint = await prisma.complaint.create({
    data: {
      category: "Plumbing",
      description: "Kitchen sink has been leaking for two days.",
      status: ComplaintStatus.OPEN,
      priority: Priority.MEDIUM,
      residentId: resident.id,
      history: {
        create: {
          status: ComplaintStatus.OPEN,
          priority: Priority.MEDIUM,
          note: "Complaint raised",
          actorId: resident.id,
        },
      },
    },
  });

  await prisma.notice.create({
    data: {
      title: "Water Supply Maintenance",
      body: "Water supply will be interrupted on Sunday 10am-2pm for tank cleaning.",
      isImportant: true,
      authorId: admin.id,
    },
  });

  await prisma.notice.create({
    data: {
      title: "Society AGM",
      body: "Annual General Meeting scheduled for next month, details to follow.",
      isImportant: false,
      authorId: admin.id,
    },
  });

  console.log({ admin: admin.email, resident: resident.email, resident2: resident2.email, complaint: complaint.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
