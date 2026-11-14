export const runtime = "nodejs";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { createSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(req: Request) {
 const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
 if (!rateLimit(`register:${ip}`, 10, 3600000).ok) return NextResponse.json({error:"Terlalu banyak percobaan"},{status:429});
 const body = await req.json().catch(()=>null); const parsed = registerSchema.safeParse(body);
 if (!parsed.success) return NextResponse.json({error:"Periksa nama, email, dan kata sandi minimal 10 karakter"},{status:400});
 const {name,email,password}=parsed.data;
 if(await prisma.user.findUnique({where:{email}})) return NextResponse.json({error:"Email sudah terdaftar"},{status:409});
 const user=await prisma.user.create({data:{name,email,password:await bcrypt.hash(password,12)}}).catch(()=>null);
 if(!user) return NextResponse.json({error:"Pendaftaran gagal"},{status:409});
 await createSession(user.id); return NextResponse.json({data:{id:user.id,role:user.role}},{status:201});
}
