export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/community-api";
import { currentUser } from "@/lib/session";
import { transitionSchema } from "@/lib/validators";
import { changeStatus,ReportError } from "@/services/report.service";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!originAllowed(req))return NextResponse.json({error:"Origin tidak diizinkan"},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:"Harus masuk"},{status:401});
 if(user.role==="PUBLIC")return NextResponse.json({error:"Tidak diizinkan"},{status:403});
 const parsed=transitionSchema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Data perubahan status tidak valid"},{status:400});
 try{await changeStatus((await params).id,user,parsed.data);return NextResponse.json({ok:true});}
 catch(e){if(e instanceof ReportError)return NextResponse.json({error:e.message},{status:e.status});console.error(e);return NextResponse.json({error:"Gagal memperbarui status"},{status:500});}
}
