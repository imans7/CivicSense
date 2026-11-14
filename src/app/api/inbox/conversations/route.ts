import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { originAllowed } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ userId: z.string().min(1).max(64) });

export async function POST(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  if (!rateLimit(`inbox:start:${user.id}`, 20, 600000).ok) {
    return NextResponse.json({ error: "Terlalu sering membuka percakapan baru" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.userId === user.id) {
    return NextResponse.json({ error: "Pengguna tujuan tidak valid" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, isActive: true },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "Akun tujuan tidak ditemukan atau tidak aktif" }, { status: 404 });

  const [userOneId, userTwoId] = [user.id, target.id].sort();
  const conversation = await prisma.conversation.upsert({
    where: { userOneId_userTwoId: { userOneId, userTwoId } },
    update: {},
    create: { userOneId, userTwoId },
    select: { id: true },
  });

  return NextResponse.json({ conversationId: conversation.id }, { status: 200 });
}
