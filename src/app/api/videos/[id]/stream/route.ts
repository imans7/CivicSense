import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { decodeVideoKey, signVideoPlayback } from "@/lib/s3-video";
import { blockedBetween } from "@/lib/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await prisma.reportVideo.findUnique({
    where: { id },
    select: {
      publicId: true, videoUrl: true,
      report: { select: { status: true, userId: true } },
    },
  });
  if (!video) return NextResponse.json({ error: "Video tidak ditemukan" }, { status: 404 });

  const user = await currentUser();
  if (user?.role !== "ADMIN" && await blockedBetween(user?.id, video.report.userId)) return NextResponse.json({ error: "Video tidak tersedia" }, { status: 404 });
  if (video.report.status === "REJECTED") {
    if (!user || (user.id !== video.report.userId && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Video tidak tersedia" }, { status: 404 });
    }
  }

  const key = decodeVideoKey(video.publicId);
  try {
    // Video Cloudinary lama tetap dapat diakses tanpa migrasi data.
    let url: string;
    if (key) {
      url = await signVideoPlayback(key);
    } else if (video.videoUrl.startsWith("https://res.cloudinary.com/")) {
      url = video.videoUrl;
    } else {
      return NextResponse.json({ error: "Sumber video tidak dikenal" }, { status: 404 });
    }
    const response = NextResponse.redirect(url, { status: 307 });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    console.error("[s3-video-stream]", error);
    return NextResponse.json({ error: "Video sementara tidak tersedia" }, { status: 502 });
  }
}
