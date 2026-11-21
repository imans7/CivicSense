import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { blockedBetween } from "@/lib/social";

export function originAllowed(req:Request) {
  const origin=req.headers.get("origin");
  if (!origin) return false;
  return new URL(origin).host === new URL(req.url).host;
}
export async function communityGuard(req:Request,reportId:string) {
  if(!originAllowed(req))return {response:NextResponse.json({error:"Origin tidak diizinkan"},{status:403})};
  const user=await currentUser();
  if(!user)return {response:NextResponse.json({error:"Silakan masuk"},{status:401})};
  const report=await prisma.report.findUnique({where:{id:reportId},select:{id:true,status:true,userId:true}});
  if(!report||report.status==="REJECTED"||await blockedBetween(user.id,report.userId))return {response:NextResponse.json({error:"Laporan tidak ditemukan"},{status:404})};
  return {user,report};
}
