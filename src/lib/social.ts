import "server-only";
import { prisma } from "@/lib/prisma";

/** Pengguna yang memblokir Anda atau Anda blokir, tidak tampil di area sosial. */
export async function excludedUserIds(viewerId: string | undefined | null): Promise<string[]> {
  if (!viewerId) return [];
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(blocks.map((item) => item.blockerId === viewerId ? item.blockedId : item.blockerId))];
}

export async function blockedBetween(a: string | undefined | null, b: string | undefined | null) {
  if (!a || !b || a === b) return false;
  return Boolean(await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { blockerId: true },
  }));
}
