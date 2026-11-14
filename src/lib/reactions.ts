import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Like/dislike saling eksklusif; transaksi serializable mencegah dua reaksi berbarengan. */
export async function toggleReaction(reportId: string, userId: string, kind: "like" | "dislike") {
  const key = { reportId_userId: { reportId, userId } };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        let active: boolean;
        if (kind === "like") {
          const old = await tx.reportLike.findUnique({ where: key });
          if (old) { await tx.reportLike.delete({ where: key }); active = false; }
          else { await tx.reportDislike.deleteMany({ where: { reportId, userId } }); await tx.reportLike.create({ data: { reportId, userId } }); active = true; }
        } else {
          const old = await tx.reportDislike.findUnique({ where: key });
          if (old) { await tx.reportDislike.delete({ where: key }); active = false; }
          else { await tx.reportLike.deleteMany({ where: { reportId, userId } }); await tx.reportDislike.create({ data: { reportId, userId } }); active = true; }
        }
        const [likes, dislikes] = await Promise.all([
          tx.reportLike.count({ where: { reportId } }),
          tx.reportDislike.count({ where: { reportId } }),
        ]);
        return { active, likes, dislikes };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < 2) continue;
      throw e;
    }
  }
  throw new Error("Gagal memperbarui reaksi");
}
