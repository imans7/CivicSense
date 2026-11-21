import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getAllActiveCategories } from "@/lib/community";
import { ReportForm } from "@/components/report-form";
export default async function Page(){if(!await currentUser())redirect("/login");const categories=await getAllActiveCategories();return <main className="mx-auto max-w-3xl px-4 py-10"><h1 className="mb-3 text-3xl font-bold">Bagikan laporan ke komunitas</h1><p className="mb-6 text-gray-600">Posting laporanmu ke feed komunitas. Sertakan lokasi dan foto yang jelas agar laporan dapat diverifikasi.</p><ReportForm categories={categories}/></main>}
