import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { InboxView } from "@/components/community/inbox-view";
import { excludedUserIds } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const excluded=await excludedUserIds(user.id);
  const [notifications, conversations] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: user.id, ...(excluded.length?{actorId:{notIn:excluded}}:{}) },
      include: {
        actor: { select: { id: true, name: true, role: true, avatarUrl: true } },
        report: { select: { id: true, title: true, reportNumber: true } },
        comment: { select: { content: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.conversation.findMany({
      where: { AND: [{OR:[{userOneId:user.id},{userTwoId:user.id}]}, ...(excluded.length?[{userOneId:{notIn:excluded},userTwoId:{notIn:excluded}}]:[])] },
      include: {
        userOne: { select: { id: true, name: true, role: true, avatarUrl: true } },
        userTwo: { select: { id: true, name: true, role: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, senderId: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const conversationIds = conversations.map((conversation) => conversation.id);
  const unreadGroups = conversationIds.length
    ? await prisma.message.groupBy({
        by: ["conversationId"],
        where: {
          conversationId: { in: conversationIds },
          senderId: { not: user.id },
          readAt: null,
        },
        _count: { _all: true },
      })
    : [];
  const unreadByConversation = new Map<string, number>(unreadGroups.map((item) => [item.conversationId, item._count._all] as const));

  const notificationData = notifications.map((item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    readAt: item.readAt?.toISOString() ?? null,
    actor: item.actor,
    report: item.report,
    comment: item.comment,
  }));
  const conversationData = conversations.map((item) => {
    const last = item.messages[0] ?? null;
    return {
      id: item.id,
      updatedAt: item.updatedAt.toISOString(),
      otherUser: item.userOneId === user.id ? item.userTwo : item.userOne,
      lastMessage: last ? { ...last, createdAt: last.createdAt.toISOString() } : null,
      unreadCount: unreadByConversation.get(item.id) ?? 0,
    };
  });

  return (
    <main className="inbox-page">
      <InboxView notifications={notificationData} conversations={conversationData} currentUserId={user.id} />
    </main>
  );
}
