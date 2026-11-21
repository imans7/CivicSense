import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { originAllowed } from "@/lib/community-api";
import { blockedBetween } from "@/lib/social";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk" }, { status: 401 });
  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, OR: [{ userOneId: user.id }, { userTwoId: user.id }] },
    select: { id: true, userOneId: true, userTwoId: true },
  });
  if (!conversation) return NextResponse.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });
  if(await blockedBetween(user.id,conversation.userOneId===user.id?conversation.userTwoId:conversation.userOneId))return NextResponse.json({error:"Percakapan tidak tersedia"},{status:403});

  const result = await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ updated: result.count });
}
