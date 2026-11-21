import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { originAllowed } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";

async function update(req: Request, id: string, block: boolean) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk" }, { status: 401 });
  if (user.id === id) return NextResponse.json({ error: "Tidak bisa memblokir diri sendiri" }, { status: 400 });
  if (!rateLimit(`social:block:${user.id}`, 30, 60000).ok) return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });
  if (block) {
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!target?.isActive) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    await prisma.$transaction([
      prisma.userBlock.upsert({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: id } }, update: {}, create: { blockerId: user.id, blockedId: id } }),
      prisma.userFollow.deleteMany({ where: { OR: [{ followerId: user.id, followingId: id }, { followerId: id, followingId: user.id }] } }),
    ]);
  } else {
    await prisma.userBlock.deleteMany({ where: { blockerId: user.id, blockedId: id } });
  }
  return NextResponse.json({ blocked: block });
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return update(req, (await params).id, true);
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return update(req, (await params).id, false);
}
