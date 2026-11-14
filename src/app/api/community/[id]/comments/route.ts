import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { communityGuard } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ content: z.string().trim().min(2).max(1000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await communityGuard(req, id);
  if (guard.response) return guard.response;

  const user = guard.user!;
  const report = guard.report!;
  if (!rateLimit(`comment:${user.id}`, 15, 600000).ok) {
    return NextResponse.json({ error: "Terlalu banyak komentar. Coba lagi nanti." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Komentar harus terdiri dari 2–1000 karakter" }, { status: 400 });
  }

  try {
    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: { reportId: id, userId: user.id, content: parsed.data.content },
      });

      // Beri notifikasi kepada pemilik laporan jika komentar berasal dari orang lain.
      if (report.userId !== user.id) {
        await tx.notification.create({
          data: {
            recipientId: report.userId,
            actorId: user.id,
            reportId: id,
            commentId: created.id,
            type: "REPORT_COMMENT",
          },
        });
      }
      return created;
    });

    return NextResponse.json({ id: comment.id }, { status: 201 });
  } catch (error) {
    console.error("[comment:create]", error);
    return NextResponse.json({ error: "Komentar gagal disimpan" }, { status: 500 });
  }
}
