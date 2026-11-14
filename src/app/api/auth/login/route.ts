export const runtime = "nodejs";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { createSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(req:Request) {
 const ip=req.headers.get("x-forwarded-for")?.split(",")[0]??"unknown";
 if(!rateLimit(`login:${ip}`,15,900000).ok) return NextResponse.json({error:"Terlalu banyak percobaan. Coba lagi nanti."},{status:429});
 const parsed=loginSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success) return NextResponse.json({error:"Email atau kata sandi tidak valid"},{status:400});
 const user=await prisma.user.findUnique({where:{email:parsed.data.email}});
 if(!user || !user.isActive || !(await bcrypt.compare(parsed.data.password,user.password))) return NextResponse.json({error:"Email atau kata sandi salah"},{status:401});
 await createSession(user.id);return NextResponse.json({data:{role:user.role}});
}
