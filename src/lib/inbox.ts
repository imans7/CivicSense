import "server-only";
import { prisma } from "@/lib/prisma";

/** Badge menghitung notifikasi komentar dan pesan masuk yang belum dibaca. */
export async function getUnreadInboxCount(userId: string) {
  const [unreadNotifications, unreadMessages] = await Promise.all([
    prisma.notification.count({
      where: { recipientId: userId, readAt: null },
    }),
    prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: {
          is: { OR: [{ userOneId: userId }, { userTwoId: userId }] },
        },
      },
    }),
  ]);

  return unreadNotifications + unreadMessages;
}
