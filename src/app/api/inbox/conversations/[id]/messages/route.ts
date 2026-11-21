import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { originAllowed } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";
import { blockedBetween } from "@/lib/social";

const messageSchema = z.object({ content: z.string().trim().min(1).max(2000) });

async function getMembership(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ userOneId: userId }, { userTwoId: userId }],
    },
    select: { id: true, userOneId: true, userTwoId: true },
  }).then(async (conversation) => {
    if (!conversation) return null;
    const otherId=conversation.userOneId===userId?conversation.userTwoId:conversation.userOneId;
    return await blockedBetween(userId,otherId)?null:conversation;
  });
}

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk" }, { status: 401 });

  const { id } = await params;
  const conversation = await getMembership(id, user.id);
  if (!conversation) return NextResponse.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });

  const search = new URL(req.url).searchParams;
  const afterValue = search.get("after");
  const afterDate = afterValue ? new Date(afterValue) : null;
  const validAfter = afterDate && !Number.isNaN(afterDate.getTime()) ? afterDate : null;
  const afterId = (search.get("afterId") || "").slice(0, 40);
  const receiptIds = [...new Set((search.get("receiptIds") || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= 40))].slice(0, 100);

  const serverTime = new Date();
  const messageWhere: Prisma.MessageWhereInput = {
    conversationId: id,
    ...(validAfter
      ? {
          OR: afterId
            ? [
                { createdAt: { gt: validAfter } },
                { createdAt: validAfter, id: { gt: afterId } },
              ]
            : [{ createdAt: { gt: validAfter } }],
        }
      : {}),
  };

  const [messages, readReceipts] = await Promise.all([
    validAfter
      ? prisma.message.findMany({
          where: messageWhere,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: 50,
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        })
      : prisma.message.findMany({
          where: { conversationId: id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 100,
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        }).then((items) => items.reverse()),
    receiptIds.length
      ? prisma.message.findMany({
          where: {
            id: { in: receiptIds },
            conversationId: id,
            senderId: user.id,
            readAt: { not: null },
          },
          select: { id: true, readAt: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json(
    { messages, readReceipts, serverTime: serverTime.toISOString() },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk" }, { status: 401 });

  const { id } = await params;
  const conversation = await getMembership(id, user.id);
  if (!conversation) return NextResponse.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });
  if (!rateLimit(`inbox:message:${user.id}`, 40, 60000).ok) {
    return NextResponse.json({ error: "Terlalu banyak pesan. Coba lagi sebentar." }, { status: 429 });
  }

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pesan harus terdiri dari 1–2000 karakter" }, { status: 400 });

  try {
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId: id, senderId: user.id, content: parsed.data.content },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      });
      await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
      return created;
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("[inbox:message]", error);
    return NextResponse.json({ error: "Pesan gagal dikirim" }, { status: 500 });
  }
}
