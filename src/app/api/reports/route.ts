import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { reportSchema } from "@/lib/validators";
import { createReport,ReportError } from "@/services/report.service";
import { rateLimit } from "@/lib/rate-limit";
export async function GET(req:Request){
 const params=new URL(req.url).searchParams;
 const status=params.get("status");const category=params.get("category");const q=params.get("q")?.slice(0,100)||"";
 const page=Math.min(1000,Math.max(1,Number(params.get("page"))||1));
 const where={status:{not:"REJECTED" as const},...(status&&["PENDING","VERIFIED","ASSIGNED","IN_PROGRESS","RESOLVED"].includes(status)?{status:status as "PENDING"}:{}),...(category?{categoryId:category}:{}),...(q?{OR:[{title:{contains:q,mode:"insensitive" as const}},{reportNumber:{contains:q,mode:"insensitive" as const}}]}:{})};
 const [items,total]=await Promise.all([prisma.report.findMany({where,orderBy:[{createdAt:"desc"}],skip:(page-1)*12,take:12,select:{id:true,reportNumber:true,title:true,description:true,status:true,priorityScore:true,priorityLevel:true,address:true,createdAt:true,category:{select:{name:true}},images:{take:1,where:{imageType:"REPORT"},select:{imageUrl:true}}}}),prisma.report.count({where})]);
 return NextResponse.json({data:items,total,page});
}
export async function POST(req:Request){
 const user=await currentUser();if(!user)return NextResponse.json({error:"Silakan masuk"},{status:401});
 if(!rateLimit(`report:${user.id}`,10,3600000).ok)return NextResponse.json({error:"Batas laporan sementara tercapai"},{status:429});
 const parsed=reportSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Isi laporan belum valid",details:parsed.error.flatten()},{status:400});
 try{const report=await createReport(user.id,parsed.data);return NextResponse.json({data:{id:report.id,reportNumber:report.reportNumber}},{status:201});}
 catch(e){if(e instanceof ReportError)return NextResponse.json({error:e.message},{status:e.status});console.error(e);return NextResponse.json({error:"Gagal menyimpan laporan"},{status:500});}
}
