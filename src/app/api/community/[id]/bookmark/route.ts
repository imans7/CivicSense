import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { communityGuard } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const guard=await communityGuard(req,id);if(guard.response)return guard.response;
 const user=guard.user!;
 if(!rateLimit(`interaction:${user.id}`,120,60000).ok)return NextResponse.json({error:"Terlalu banyak permintaan"},{status:429});
 const where={reportId_userId:{reportId:id,userId:user.id}};
 const existing=await prisma.reportBookmark.findUnique({where});
 if(existing)await prisma.reportBookmark.delete({where});else await prisma.reportBookmark.create({data:{reportId:id,userId:user.id}});
 const count=await prisma.reportBookmark.count({where:{reportId:id}});
 return NextResponse.json({active:!existing,count});
}
