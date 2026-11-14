import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { communityGuard } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";
const schema=z.object({content:z.string().trim().min(2).max(1000)});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const guard=await communityGuard(req,id);if(guard.response)return guard.response;
 const user=guard.user!;
 if(!rateLimit(`comment:${user.id}`,15,600000).ok)return NextResponse.json({error:"Terlalu banyak komentar"},{status:429});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Komentar harus terdiri dari 2–1000 karakter"},{status:400});
 const comment=await prisma.comment.create({data:{reportId:id,userId:user.id,content:parsed.data.content}});
 return NextResponse.json({id:comment.id},{status:201});
}
