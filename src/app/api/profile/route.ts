import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";
import { originAllowed } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";
import { deleteFromCloudinary } from "@/services/image.service";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  bio: z.string().trim().max(280),
  location: z.string().trim().max(120),
  avatarPublicId: z.string().trim().min(1).max(255).nullable(),
});
export async function PATCH(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk" }, { status: 401 });
  if (!rateLimit(`profile:${user.id}`, 20, 3600000).ok) return NextResponse.json({ error: "Terlalu banyak perubahan profil" }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data profil tidak valid" }, { status: 400 });
  const { name, bio, location, avatarPublicId } = parsed.data;
  let avatarUrl: string | null = user.avatarUrl;
  if (avatarPublicId !== user.avatarPublicId) {
    if (avatarPublicId) {
      const prefix = `civicsense/avatar/${user.id}/`;
      if (avatarPublicId.includes("..") || !avatarPublicId.startsWith(prefix)) return NextResponse.json({ error: "Foto profil bukan milik akun ini" }, { status: 403 });
      const used = await prisma.user.findFirst({ where: { avatarPublicId }, select: { id: true } });
      if (used && used.id !== user.id) return NextResponse.json({ error: "Foto sudah digunakan" }, { status: 409 });
      const resource = await cloudinary.api.resource(avatarPublicId, { resource_type: "image" }).catch(() => null);
      if (!resource?.secure_url || !["jpg", "jpeg", "png", "webp"].includes(resource.format)) return NextResponse.json({ error: "Foto Cloudinary tidak ditemukan" }, { status: 400 });
      avatarUrl = resource.secure_url;
    } else avatarUrl = null;
  }
  try {
    await prisma.user.update({ where: { id: user.id }, data: { name, bio: bio || null, location: location || null, avatarUrl, avatarPublicId } });
    if (user.avatarPublicId && user.avatarPublicId !== avatarPublicId && user.avatarPublicId.startsWith(`civicsense/avatar/${user.id}/`)) {
      // Hapus foto lama setelah DB sukses; kegagalan cleanup tidak membatalkan perubahan profil.
      await deleteFromCloudinary([user.avatarPublicId]);
    }
    return NextResponse.json({ ok: true, profileUrl: `/users/${user.id}` });
  } catch (e) { console.error("[profile]", e); return NextResponse.json({ error: "Profil gagal diperbarui" }, { status: 500 }); }
}
