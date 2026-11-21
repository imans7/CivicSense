import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";


const loadActiveCategories = unstable_cache(
  async () => prisma.category.findMany({
    where: { isActive: true },
    take: 5,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  }),
  ["civicsense-active-categories-v1"],
  { revalidate: 300, tags: ["civicsense-categories"] },
);

export function getActiveCategories() {
  return loadActiveCategories();
}

const loadAllActiveCategories = unstable_cache(
  async () => prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  }),
  ["civicsense-all-active-categories-v1"],
  { revalidate: 300, tags: ["civicsense-categories"] },
);

export function getAllActiveCategories() {
  return loadAllActiveCategories();
}

export const feedInclude = {
  user: { select: { id: true, name: true, role: true, avatarUrl: true } },
  category: { select: { name: true } },
  images: { where: { imageType: "REPORT" as const }, take: 4, select: { imageUrl: true } },
  videos: { take: 1, select: { videoUrl: true, durationSeconds: true, mimeType: true } },
  completionEvidence: { select: { beforeImageUrl: true, afterImageUrl: true, createdAt: true, uploadedBy: { select: { name: true } } } },
  _count: { select: { comments: true, likes: true, dislikes: true } },
} as const;

export async function feedViewer() {
  const user = await currentUser();
  return user ? { id: user.id, name: user.name, role: user.role, avatarUrl: user.avatarUrl } : null;
}

export async function interactionSets(userId: string | undefined, reportIds: string[]) {
  if (!userId || !reportIds.length) return { liked: new Set<string>(), disliked: new Set<string>(), saved: new Set<string>() };
  const [likes, dislikes, saves] = await Promise.all([
    prisma.reportLike.findMany({ where: { userId, reportId: { in: reportIds } }, select: { reportId: true } }),
    prisma.reportDislike.findMany({ where: { userId, reportId: { in: reportIds } }, select: { reportId: true } }),
    prisma.reportBookmark.findMany({ where: { userId, reportId: { in: reportIds } }, select: { reportId: true } }),
  ]);
  return { liked: new Set(likes.map(l => l.reportId)), disliked: new Set(dislikes.map(d => d.reportId)), saved: new Set(saves.map(s => s.reportId)) };
}
