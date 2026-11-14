import Link from "next/link";
import { MapPinned } from "lucide-react";
import { currentUser } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { ROLE_HOME } from "@/lib/constants";
export async function SiteHeader(){const user=await currentUser();return <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3"><Link href="/" className="flex items-center gap-2 font-bold"><MapPinned className="text-emerald-700"/>CivicSense</Link><nav className="flex flex-wrap items-center gap-3 text-sm"><Link href="/reports">Laporan publik</Link><Link href="/map">Peta</Link>{user?<><Link href={ROLE_HOME[user.role]}>Dashboard</Link><Link href="/reports/new">Buat laporan</Link><LogoutButton/></>:<><Link href="/login">Masuk</Link><Link href="/register" className="rounded-lg bg-emerald-700 px-3 py-2 text-white">Daftar</Link></>}</nav></div></header>}
