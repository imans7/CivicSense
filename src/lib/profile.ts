import "server-only";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/** Tidak menyimpulkan kebenaran di lapangan: ini hanya rasio keputusan verifikasi.
 *  PENDING tidak dihitung. Status terverifikasi dan tahap lanjut = lolos review.
 *  REJECTED = tidak lolos review, termasuk alasan bukti kurang/di luar cakupan.
 */
export async function getProfileStats(userId: string) {
  const [totalReports, validated, rejected, likesReceived, dislikesReceived, resolvedAssignments] = await Promise.all([
    prisma.report.count({ where: { userId } }),
    prisma.report.count({ where: { userId, status: { in: ["VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] } } }),
    prisma.report.count({ where: { userId, status: "REJECTED" } }),
    prisma.reportLike.count({ where: { report: { userId } } }),
    prisma.reportDislike.count({ where: { report: { userId } } }),
    prisma.report.count({ where: { assignedToId: userId, status: "RESOLVED" } }),
  ]);
  const reviewed = validated + rejected;
  return { totalReports, validated, rejected, reviewed, likesReceived, dislikesReceived,
    accuracy: reviewed > 0 ? Math.round(validated / reviewed * 100) : null, resolvedAssignments };
}

export function profileHandle(user: { name: string; id: string }) {
  const prefix = user.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "").slice(0, 13) || "anggota";
  return `@${prefix}_${user.id.slice(-5)}`;
}
export function roleCaption(role: Role) {
  return role === "ADMIN" ? "Administrator" : role === "OFFICER" ? "Petugas terverifikasi" : "Warga komunitas";
}
