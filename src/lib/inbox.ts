import "server-only";
import { prisma } from "@/lib/prisma";

/** Total badge: notifikasi komentar yang belum dibaca + pesan masuk yang belum dibaca. */
export async function getUnreadInboxCount(userId: string) {
  const [unreadNotifications, conversations] = await Promise.all([
    prisma.notification.count({ where: { recipientId: userId, readAt: null } }),
    prisma.conversation.findMany({
      where: { OR: [{ userOneId: userId }, { userTwoId: userId }] },
      select: { id: true },
    }),
  ]);

  const conversationIds = conversations.map((item) => item.id);
  const unreadMessages = conversationIds.length
    ? await prisma.message.count({
        where: {
          conversationId: { in: conversationIds },
          senderId: { not: userId },
          readAt: null,
        },
      })
    : 0;

  return unreadNotifications + unreadMessages;
}
