import "server-only";
import { prisma } from "@/lib/prisma";
import { calculatePriority } from "@/lib/priority";
import { cloudinary } from "@/lib/cloudinary";
import { reportSchema,transitionSchema } from "@/lib/validators";
import type { Role, ReportStatus } from "@prisma/client";
import { z } from "zod";

// Tentukan bentuk data foto secara eksplisit. Tanpa tipe ini TypeScript
// strict pada build produksi Vercel menganggap photos sebagai any[].
type CloudinaryPhoto = {
 publicId: string;
 imageUrl: string;
 mimeType: string;
 sizeBytes: number;
 imageType: "REPORT" | "RESOLUTION";
};

export class ReportError extends Error { constructor(message:string,public status=400){super(message);} }
const allowed = (old:ReportStatus, next:ReportStatus, role:Role) => {
 if(role==="ADMIN") return ({PENDING:["VERIFIED","REJECTED"],VERIFIED:["ASSIGNED","REJECTED"],ASSIGNED:["IN_PROGRESS"],IN_PROGRESS:["RESOLVED"],REJECTED:[],RESOLVED:[]} as Record<ReportStatus,string[]>)[old].includes(next);
 if(role==="OFFICER") return (old==="ASSIGNED"&&next==="IN_PROGRESS")||(old==="IN_PROGRESS"&&next==="RESOLVED");
 return false;
};
export async function createReport(userId:string,input:z.infer<typeof reportSchema>){
 const category=await prisma.category.findFirst({where:{id:input.categoryId,isActive:true}});
 if(!category) throw new ReportError("Kategori tidak ditemukan");
 // Ambil metadata foto dari Cloudinary, jangan mempercayai URL/ukuran yang dikirim browser.
 const photos: CloudinaryPhoto[] = [];
 for(const photo of input.images){
  if(!photo.publicId.startsWith(`civicsense/report/${userId}/`)||photo.publicId.includes("..")) throw new ReportError("Foto bukan milik akun ini",403);
  if(await prisma.reportImage.findFirst({where:{publicId:photo.publicId}})) throw new ReportError("Foto telah digunakan",409);
  const resource=await cloudinary.api.resource(photo.publicId,{resource_type:"image"}).catch(()=>null);
  if(!resource || !resource.secure_url) throw new ReportError("Foto Cloudinary tidak ditemukan");
  photos.push({publicId:photo.publicId,imageUrl:resource.secure_url,mimeType:`image/${resource.format==="jpg"?"jpeg":resource.format}`,sizeBytes:resource.bytes,imageType:"REPORT" as const});
 }
 const priority=calculatePriority(input);
 const now=new Date().getFullYear();
 const report=await prisma.$transaction(async tx=>{
  const counter=await tx.reportCounter.upsert({where:{year:now},create:{year:now,lastNumber:1},update:{lastNumber:{increment:1}}});
  return tx.report.create({data:{reportNumber:`CS-${now}-${String(counter.lastNumber).padStart(6,"0")}`,userId,categoryId:category.id,title:input.title,description:input.description,latitude:input.latitude,longitude:input.longitude,address:input.address||null,severity:input.severity,safetyRisk:input.safetyRisk,affectedPeople:input.affectedPeople,durationDays:input.durationDays,priorityScore:priority.score,priorityLevel:priority.level,images:{create:photos},histories:{create:{userId,newStatus:"PENDING",note:"Laporan diterima"}}}});
 });
 // Menghapus tag pending setelah tersimpan. Jika gagal, foto tetap tercatat dan tidak akan dihapus oleh aplikasi.
 await Promise.allSettled(photos.map(photo=>cloudinary.uploader.remove_tag("pending",[photo.publicId])));
 return report;
}
export async function changeStatus(reportId:string,actor:{id:string;role:Role},input:z.infer<typeof transitionSchema>){
 const report=await prisma.report.findUnique({where:{id:reportId}});
 if(!report)throw new ReportError("Laporan tidak ditemukan",404);
 if(!allowed(report.status,input.status,actor.role))throw new ReportError("Perubahan status tidak diperbolehkan",403);
 if(actor.role==="OFFICER" && report.assignedToId!==actor.id)throw new ReportError("Laporan bukan tugas Anda",403);
 const assignedToId=input.status==="ASSIGNED"?input.assignedToId:report.assignedToId;
 if(input.status==="ASSIGNED"){
  if(!assignedToId)throw new ReportError("Pilih petugas terlebih dahulu");
  const officer=await prisma.user.findFirst({where:{id:assignedToId,role:"OFFICER",isActive:true}});
  if(!officer)throw new ReportError("Petugas tidak valid");
 }
 if(["REJECTED","RESOLVED"].includes(input.status)&&!input.note?.trim())throw new ReportError("Catatan wajib untuk penolakan dan penyelesaian");
 const photos: CloudinaryPhoto[] = [];
 if(input.images?.length){
  if(input.status!=="RESOLVED")throw new ReportError("Foto penanganan hanya dapat diunggah saat penyelesaian");
  for(const img of input.images){
   if(!img.publicId.startsWith(`civicsense/resolution/${actor.id}/`)||img.publicId.includes(".."))throw new ReportError("Foto tidak sah",403);
   const resource=await cloudinary.api.resource(img.publicId).catch(()=>null);
   if(!resource?.secure_url)throw new ReportError("Foto penyelesaian tidak ditemukan");
   photos.push({publicId:img.publicId,imageUrl:resource.secure_url,mimeType:`image/${resource.format==="jpg"?"jpeg":resource.format}`,sizeBytes:resource.bytes,imageType:"RESOLUTION" as const});
  }
 }
 if(input.status==="RESOLVED" && !photos.length)throw new ReportError("Unggah minimal satu foto hasil penanganan");
 // Update kondisional mencegah transisi status yang saling balapan.
 await prisma.$transaction(async tx=>{
  const update=await tx.report.updateMany({where:{id:reportId,status:report.status},data:{status:input.status,assignedToId,verifiedAt:input.status==="VERIFIED"?new Date():report.verifiedAt,resolvedAt:input.status==="RESOLVED"?new Date():report.resolvedAt}});
  if(update.count!==1)throw new ReportError("Status telah berubah. Muat ulang halaman",409);
  await tx.reportHistory.create({data:{reportId,userId:actor.id,oldStatus:report.status,newStatus:input.status,note:input.note||null}});
  if(photos.length)await tx.reportImage.createMany({data:photos.map(p=>({...p,reportId}))});
 });
 await Promise.allSettled(photos.map(photo=>cloudinary.uploader.remove_tag("pending",[photo.publicId])));
}
