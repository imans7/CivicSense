export const runtime = "nodejs";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
function csvCell(value: unknown) {
  const text = String(value ?? "");
  // Prevent spreadsheet formula injection when opened in Excel.
  const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return new Response("Tidak diizinkan", { status: 403 });
  const records = await prisma.report.findMany({orderBy:{createdAt:"desc"},take:10000,include:{category:{select:{name:true}},assignedTo:{select:{name:true}}}});
  const rows = [["Nomor","Judul","Kategori","Status","Prioritas","Skor","Alamat","Petugas","Dibuat","Selesai"],...records.map(r=>[r.reportNumber,r.title,r.category.name,r.status,r.priorityLevel,r.priorityScore,r.address,r.assignedTo?.name,r.createdAt.toISOString(),r.resolvedAt?.toISOString()])];
  const csv = '\uFEFF' + rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
  return new Response(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=civicsense-laporan.csv","Cache-Control":"private, no-store"}});
}
