import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const COOKIE = "civicsense_session";
const DAYS = 7;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const currentUser = cache(async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hash(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          bio: true,
          location: true,
          avatarUrl: true,
          avatarPublicId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session.user;
});
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + DAYS * 86400000);
  await prisma.session.create({ data: { userId, tokenHash: hash(token), expiresAt } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}
export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hash(token) } });
  store.delete(COOKIE);
}
