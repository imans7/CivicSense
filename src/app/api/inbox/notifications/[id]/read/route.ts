import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { originAllowed } from "@/lib/community-api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk" }, { status: 401 });
  const { id } = await params;
  await prisma.notification.updateMany({
    where: { id, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
