import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const ROLE_NAMES = [
  "admin",
  "requester",
  "purchasing",
  "approver",
  "site_manager",
] as const;

async function main() {
  for (const name of ROLE_NAMES) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@santiye.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "admin" },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: "Sistem Yöneticisi",
      email: adminEmail,
      passwordHash,
      active: true,
      roles: {
        create: { roleId: adminRole.id },
      },
    },
    update: {
      passwordHash,
      active: true,
    },
  });

  await prisma.project.upsert({
    where: { code: "SNT-001" },
    create: {
      name: "Örnek Şantiye",
      code: "SNT-001",
      address: "Örnek adres",
      active: true,
    },
    update: {},
  });

  console.log("Seed tamamlandı.");
  console.log(`Admin giriş bilgileri -> e-posta: ${admin.email} / şifre: ${adminPassword}`);

  // Geliştirme/test ortamında her rol için birer örnek kullanıcı oluşturulur.
  if (process.env.NODE_ENV !== "production") {
    const demoPassword = "Demo123!";
    const demoPasswordHash = await bcrypt.hash(demoPassword, 10);
    const demoUsers: Array<{ email: string; name: string; role: (typeof ROLE_NAMES)[number] }> = [
      { email: "talep@santiye.local", name: "Talep Eden Demo", role: "requester" },
      { email: "satinalma@santiye.local", name: "Satın Alma Demo", role: "purchasing" },
      { email: "onay@santiye.local", name: "Onaylayıcı Demo", role: "approver" },
      { email: "santiye@santiye.local", name: "Şantiye Sorumlusu Demo", role: "site_manager" },
    ];

    for (const demoUser of demoUsers) {
      const role = await prisma.role.findUniqueOrThrow({ where: { name: demoUser.role } });
      await prisma.user.upsert({
        where: { email: demoUser.email },
        create: {
          name: demoUser.name,
          email: demoUser.email,
          passwordHash: demoPasswordHash,
          active: true,
          roles: { create: { roleId: role.id } },
        },
        update: { passwordHash: demoPasswordHash, active: true },
      });
    }

    console.log(`Demo kullanıcı şifresi (tüm demo hesaplar için): ${demoPassword}`);
    console.log(demoUsers.map((u) => `${u.role} -> ${u.email}`).join("\n"));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
