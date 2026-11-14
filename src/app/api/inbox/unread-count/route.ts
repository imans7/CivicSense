import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getUnreadInboxCount } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ count: 0 });
  const count = await getUnreadInboxCount(user.id);
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
