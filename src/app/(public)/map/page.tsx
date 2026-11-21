import { prisma } from "@/lib/prisma";
import { MapExplorer } from "@/components/map-explorer";
import { currentUser } from "@/lib/session";
import { excludedUserIds } from "@/lib/social";
export const dynamic="force-dynamic";
export default async function Page(){
 const viewer=await currentUser();const excluded=viewer?.role==="ADMIN"?[]:await excludedUserIds(viewer?.id);
 const reports=await prisma.report.findMany({where:{status:{not:"REJECTED"},...(excluded.length?{userId:{notIn:excluded}}:{})},select:{id:true,title:true,latitude:true,longitude:true,status:true},take:300,orderBy:{createdAt:"desc"}});
 const points=reports.map(r=>({...r,latitude:Number(r.latitude),longitude:Number(r.longitude)}));
 return <main className="mx-auto max-w-6xl space-y-5 px-4 py-12"><h1 className="text-3xl font-bold">Peta masalah lingkungan</h1><p className="text-gray-600">Pilih salah satu dari {points.length} titik laporan terbaru untuk melihat lokasi pada OpenStreetMap.</p><MapExplorer points={points}/><p className="text-xs text-gray-500">Peta © OpenStreetMap contributors. Posisi laporan berasal dari koordinat yang dikirim warga.</p></main>
}
