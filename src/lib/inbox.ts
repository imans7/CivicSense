import "server-only";
import { prisma } from "@/lib/prisma";
import { excludedUserIds } from "@/lib/social";

/** Badge menghitung notifikasi komentar dan pesan masuk yang belum dibaca. */
export async function getUnreadInboxCount(userId: string) {
  const excluded=await excludedUserIds(userId);
  const [unreadNotifications, unreadMessages] = await Promise.all([
    prisma.notification.count({
      where: { recipientId: userId, readAt: null, ...(excluded.length?{actorId:{notIn:excluded}}:{}) },
    }),
    prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: userId, ...(excluded.length?{notIn:excluded}:{}) },
        conversation: {
          is: { OR: [{ userOneId: userId }, { userTwoId: userId }] },
        },
      },
    }),
  ]);

  return unreadNotifications + unreadMessages;
}
