import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  {
    name: "Sampah Menumpuk",
    description: "Tumpukan sampah liar atau tempat pembuangan yang tidak terurus.",
  },
  {
    name: "Jalan Rusak",
    description: "Jalan berlubang, retak, amblas, atau permukaan tidak layak lalu lintas.",
  },
  {
    name: "Saluran Air Tersumbat",
    description: "Selokan, gorong-gorong, atau drainase yang tersumbat dan berpotensi banjir.",
  },
  {
    name: "Lampu Jalan Mati",
    description: "Penerangan jalan umum yang padam atau rusak.",
  },
  {
    name: "Fasilitas Umum Rusak",
    description: "Kerusakan pada fasilitas umum seperti taman, halte, atau jembatan.",
  },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ;
  const officerEmail = process.env.SEED_OFFICER_EMAIL ;
  const officerPassword = process.env.SEED_OFFICER_PASSWORD ;

  if (!adminEmail || !adminPassword || !officerEmail || !officerPassword || adminPassword.length < 12 || officerPassword.length < 12) throw new Error("Isi SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_OFFICER_EMAIL, SEED_OFFICER_PASSWORD (kata sandi minimal 12 karakter)");

  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: cat,
    });
  }

  const users = [
    { name: "Administrator", email: adminEmail, password: adminPassword, role: Role.ADMIN },
    { name: "Petugas Contoh", email: officerEmail, password: officerPassword, role: Role.OFFICER },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      // password tidak ditimpa jika akun sudah ada
      update: { name: u.name, role: u.role, isActive: true },
      create: { name: u.name, email: u.email, password: hash, role: u.role },
    });
  }

  const [categoryCount, userCount] = await Promise.all([
    prisma.category.count(),
    prisma.user.count(),
  ]);

  console.log("Seed selesai.");
  console.log(`- Kategori : ${categoryCount}`);
  console.log(`- User     : ${userCount}`);
  console.log(`- Admin    : ${adminEmail}`);
  console.log(`- Petugas  : ${officerEmail}`);
  console.log("Segera ganti password default sebelum dipakai di luar lokal.");
}

main()
  .catch((e) => {
    console.error("Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
