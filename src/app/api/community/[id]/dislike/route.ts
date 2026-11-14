import { NextResponse } from "next/server";
import { communityGuard } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";
import { toggleReaction } from "@/lib/reactions";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await communityGuard(req, id);
  if (guard.response) return guard.response;
  const user = guard.user!;
  if (!rateLimit(`interaction:${user.id}`, 120, 60000).ok) return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });
  try { return NextResponse.json(await toggleReaction(id, user.id, "dislike")); }
  catch (e) { console.error("[dislike]", e); return NextResponse.json({ error: "Interaksi gagal. Coba lagi." }, { status: 500 }); }
}
