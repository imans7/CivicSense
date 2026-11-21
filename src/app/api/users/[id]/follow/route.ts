import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { originAllowed } from "@/lib/community-api";
import { blockedBetween } from "@/lib/social";
import { rateLimit } from "@/lib/rate-limit";

async function update(req: Request, id: string, follow: boolean) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk" }, { status: 401 });
  if (user.id === id) return NextResponse.json({ error: "Tidak bisa mengikuti diri sendiri" }, { status: 400 });
  if (!rateLimit(`social:follow:${user.id}`, 50, 60000).ok) return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true } });
  if (!target?.isActive) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  if (await blockedBetween(user.id, id)) return NextResponse.json({ error: "Aksi tidak tersedia untuk akun yang diblokir" }, { status: 403 });
  if (follow) {
    await prisma.userFollow.upsert({ where: { followerId_followingId: { followerId: user.id, followingId: id } }, update: {}, create: { followerId: user.id, followingId: id } });
  } else {
    await prisma.userFollow.deleteMany({ where: { followerId: user.id, followingId: id } });
  }
  const followers = await prisma.userFollow.count({ where: { followingId: id } });
  return NextResponse.json({ following: follow, followers });
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return update(req, (await params).id, true);
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return update(req, (await params).id, false);
}
