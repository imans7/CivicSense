import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ChatView } from "@/components/community/chat-view";
import { blockedBetween } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { conversationId } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ userOneId: user.id }, { userTwoId: user.id }],
    },
    include: {
      userOne: { select: { id: true, name: true, role: true, avatarUrl: true } },
      userTwo: { select: { id: true, name: true, role: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });

  if (!conversation) notFound();
  const otherId=conversation.userOneId===user.id?conversation.userTwoId:conversation.userOneId;
  if(await blockedBetween(user.id,otherId)) notFound();
  const otherUser = conversation.userOneId === user.id ? conversation.userTwo : conversation.userOne;
  const initialMessages = [...conversation.messages].reverse().map((message) => ({
    id: message.id,
    content: message.content,
    senderId: message.senderId,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString() ?? null,
    sender: message.sender,
  }));

  return (
    <main className="inbox-page chat-inbox-page">
      <ChatView
        conversationId={conversation.id}
        currentUserId={user.id}
        otherUser={otherUser}
        initialMessages={initialMessages}
      />
    </main>
  );
}
