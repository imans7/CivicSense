import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { calculatePriority } from "@/lib/priority";
import { cloudinary } from "@/lib/cloudinary";
import { verifyUploadedVideo, VideoStorageError } from "@/lib/s3-video";
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
type StoredVideo = {
 id: string;
 publicId: string;
 videoUrl: string;
 mimeType: string;
 sizeBytes: number;
 durationSeconds: number;
};
type CompletionPhoto = {
 publicId: string;
 imageUrl: string;
 mimeType: string;
 sizeBytes: number;
};

export class ReportError extends Error { constructor(message:string,public status=400){super(message);} }
const allowed = (old:ReportStatus, next:ReportStatus, role:Role) => {
 if(role==="ADMIN") return ({PENDING:["VERIFIED","REJECTED"],VERIFIED:["ASSIGNED","REJECTED"],ASSIGNED:["IN_PROGRESS"],IN_PROGRESS:["RESOLVED"],REJECTED:[],RESOLVED:[]} as Record<ReportStatus,string[]>)[old].includes(next);
 if(role==="OFFICER") return (old==="ASSIGNED"&&next==="IN_PROGRESS")||(old==="IN_PROGRESS"&&next==="RESOLVED");
 return false;
};
export async function createReport(userId:string,input:z.infer<typeof reportSchema>){
 const imageIds=input.images.map(photo=>photo.publicId);
 const videoIds=input.videos.map(video=>video.publicId);

 if(new Set(imageIds).size!==imageIds.length) throw new ReportError("Foto yang sama tidak boleh dipilih lebih dari sekali");
 if(new Set(videoIds).size!==videoIds.length) throw new ReportError("Video yang sama tidak boleh dipilih lebih dari sekali");
 if(imageIds.some(id=>!id.startsWith(`civicsense/report/${userId}/`)||id.includes(".."))) throw new ReportError("Foto bukan milik akun ini",403);

 // Validasi kategori dan cek duplikasi dilakukan paralel untuk mengurangi round-trip database.
 const [category,existingPhotos,existingVideos]=await Promise.all([
  prisma.category.findFirst({where:{id:input.categoryId,isActive:true},select:{id:true}}),
  imageIds.length?prisma.reportImage.findMany({where:{publicId:{in:imageIds}},select:{publicId:true}}):Promise.resolve([]),
  videoIds.length?prisma.reportVideo.findMany({where:{publicId:{in:videoIds}},select:{publicId:true}}):Promise.resolve([]),
 ]);
 if(!category) throw new ReportError("Kategori tidak ditemukan");
 if(existingPhotos.length) throw new ReportError("Foto telah digunakan",409);
 if(existingVideos.length) throw new ReportError("Video sudah digunakan pada laporan lain",409);

 // Maksimal lima foto; metadata Cloudinary dapat diperiksa paralel setelah kepemilikan tervalidasi.
 const photoResources=await Promise.all(input.images.map(photo=>
  cloudinary.api.resource(photo.publicId,{resource_type:"image"}).catch(()=>null)
 ));
 const photos:CloudinaryPhoto[]=photoResources.map((resource,index)=>{
  if(!resource?.secure_url) throw new ReportError("Foto Cloudinary tidak ditemukan");
  return {
   publicId:input.images[index].publicId,
   imageUrl:resource.secure_url,
   mimeType:`image/${resource.format==="jpg"?"jpeg":resource.format}`,
   sizeBytes:resource.bytes,
   imageType:"REPORT" as const,
  };
 });

 const videos:StoredVideo[]=[];
 for(const video of input.videos){
  let verified;
  try { verified=await verifyUploadedVideo(video.publicId,userId); }
  catch(error){
   if(error instanceof VideoStorageError) throw new ReportError(error.message,error.status);
   throw new ReportError("Tidak bisa memverifikasi video di Object Storage",502);
  }
  const id=randomUUID();
  videos.push({id,publicId:verified.publicId,videoUrl:`/api/videos/${id}/stream`,mimeType:verified.mimeType,sizeBytes:verified.sizeBytes,durationSeconds:verified.durationSeconds});
 }
 const priority=calculatePriority(input);
 const now=new Date().getFullYear();
 const report=await prisma.$transaction(async tx=>{
  const counter=await tx.reportCounter.upsert({where:{year:now},create:{year:now,lastNumber:1},update:{lastNumber:{increment:1}}});
  return tx.report.create({data:{reportNumber:`CS-${now}-${String(counter.lastNumber).padStart(6,"0")}`,userId,categoryId:category.id,title:input.title,description:input.description,latitude:input.latitude,longitude:input.longitude,address:input.address||null,severity:input.severity,safetyRisk:input.safetyRisk,affectedPeople:input.affectedPeople,durationDays:input.durationDays,priorityScore:priority.score,priorityLevel:priority.level,images:{create:photos},videos:{create:videos},histories:{create:{userId,newStatus:"PENDING",note:"Laporan diterima"}}}});
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
  const officer=await prisma.user.findFirst({where:{id:assignedToId,role:"OFFICER",isActive:true},select:{id:true}});
  if(!officer)throw new ReportError("Petugas tidak valid");
 }
 if(["REJECTED","RESOLVED"].includes(input.status)&&!input.note?.trim())throw new ReportError("Catatan wajib untuk penolakan dan penyelesaian");
 let completionEvidence: { before: CompletionPhoto; after: CompletionPhoto } | null = null;
 if(input.status === "RESOLVED") {
  const evidence = input.completionEvidence;
  if(!evidence?.beforePublicId || !evidence.afterPublicId) {
   throw new ReportError("Penyelesaian wajib menyertakan dua foto: Before dan After.");
  }
  if(evidence.beforePublicId === evidence.afterPublicId) {
   throw new ReportError("Foto Before dan After harus berupa dua foto yang berbeda.");
  }
  const ownFolder = `civicsense/resolution/${actor.id}/`;
  const ids = [evidence.beforePublicId, evidence.afterPublicId];
  if(ids.some(id => !id.startsWith(ownFolder) || id.includes(".."))) {
   throw new ReportError("Foto bukti bukan milik akun yang sedang masuk.",403);
  }

  const [usedLegacy, usedCompletion, resources] = await Promise.all([
   prisma.reportImage.findMany({ where: { publicId: { in: ids } }, select: { publicId: true } }),
   prisma.reportCompletionEvidence.findFirst({
    where: { OR: [{ beforePublicId: { in: ids } }, { afterPublicId: { in: ids } }] },
    select: { id: true },
   }),
   Promise.all(ids.map(id => cloudinary.api.resource(id).catch(() => null))),
  ]);
  if(usedLegacy.length || usedCompletion) throw new ReportError("Salah satu foto sudah digunakan sebagai bukti laporan lain.",409);
  const [beforeResource, afterResource] = resources;
  if(!beforeResource?.secure_url || !afterResource?.secure_url) {
   throw new ReportError("Foto Before atau After tidak ditemukan di Cloudinary.");
  }
  completionEvidence = {
   before: {
    publicId: evidence.beforePublicId,
    imageUrl: beforeResource.secure_url,
    mimeType: `image/${beforeResource.format === "jpg" ? "jpeg" : beforeResource.format}`,
    sizeBytes: beforeResource.bytes,
   },
   after: {
    publicId: evidence.afterPublicId,
    imageUrl: afterResource.secure_url,
    mimeType: `image/${afterResource.format === "jpg" ? "jpeg" : afterResource.format}`,
    sizeBytes: afterResource.bytes,
   },
  };
 } else if(input.completionEvidence) {
  throw new ReportError("Foto Before dan After hanya dapat dikirim saat menyelesaikan laporan.");
 }
 // Update kondisional mencegah transisi status yang saling balapan.
 await prisma.$transaction(async tx=>{
  const update=await tx.report.updateMany({where:{id:reportId,status:report.status},data:{status:input.status,assignedToId,verifiedAt:input.status==="VERIFIED"?new Date():report.verifiedAt,resolvedAt:input.status==="RESOLVED"?new Date():report.resolvedAt}});
  if(update.count!==1)throw new ReportError("Status telah berubah. Muat ulang halaman",409);
  await tx.reportHistory.create({data:{reportId,userId:actor.id,oldStatus:report.status,newStatus:input.status,note:input.note||null}});
  if(completionEvidence) await tx.reportCompletionEvidence.create({data:{
   reportId,
   uploadedById:actor.id,
   beforeImageUrl:completionEvidence.before.imageUrl,
   beforePublicId:completionEvidence.before.publicId,
   beforeMimeType:completionEvidence.before.mimeType,
   beforeSizeBytes:completionEvidence.before.sizeBytes,
   afterImageUrl:completionEvidence.after.imageUrl,
   afterPublicId:completionEvidence.after.publicId,
   afterMimeType:completionEvidence.after.mimeType,
   afterSizeBytes:completionEvidence.after.sizeBytes,
  }});
 });
 if(completionEvidence) {
  await Promise.allSettled([
   cloudinary.uploader.remove_tag("pending",[completionEvidence.before.publicId]),
   cloudinary.uploader.remove_tag("pending",[completionEvidence.after.publicId]),
  ]);
 }
}
