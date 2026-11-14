import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { originAllowed } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ role: z.nativeEnum(Role), isActive: z.boolean() });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: "Silakan masuk" }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Hanya admin yang boleh mengelola pengguna" }, { status: 403 });
  if (!rateLimit(`manage-users:${actor.id}`, 60, 3600000).ok) return NextResponse.json({ error: "Terlalu banyak perubahan" }, { status: 429 });
  const { id } = await params;
  if (id === actor.id) return NextResponse.json({ error: "Peran/status akun sendiri tidak dapat diubah" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data peran dan status tidak valid" }, { status: 400 });
  const { role, isActive } = parsed.data;
  try {
    const result = await prisma.$transaction(async tx => {
      const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
      if (!target) return { error: "Akun tidak ditemukan", status: 404 };
      if (target.role === "OFFICER" && (role !== "OFFICER" || !isActive)) {
        const open = await tx.report.count({ where: { assignedToId: id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } });
        if (open > 0) return { error: `Akun masih memiliki ${open} tugas aktif. Selesaikan atau alihkan tugas terlebih dahulu.`, status: 409 };
      }
      if (target.role === "ADMIN" && target.isActive && (role !== "ADMIN" || !isActive)) {
        const others = await tx.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
        if (others < 1) return { error: "Harus ada minimal satu administrator aktif", status: 409 };
      }
      await tx.user.update({ where: { id }, data: { role, isActive } });
      // Nonaktifkan seluruh sesi akun yang dicabut aksesnya atau diubah perannya.
      if (!isActive || role !== target.role) await tx.session.deleteMany({ where: { userId: id } });
      return { ok: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (e) { console.error("[manage-users]", e); return NextResponse.json({ error: "Perubahan akun gagal, muat ulang dan coba lagi" }, { status: 500 }); }
}
