"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROLE_HOME } from "@/lib/constants";
export function AuthForm({mode}:{mode:"login"|"register"}){
 const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const data=Object.fromEntries(new FormData(e.currentTarget));
 try{const res=await fetch(`/api/auth/${mode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const json=await res.json();if(!res.ok)throw new Error(json.error||"Gagal masuk");router.push(ROLE_HOME[json.data.role as keyof typeof ROLE_HOME]);router.refresh();}catch(e){setError(e instanceof Error?e.message:"Gagal");}finally{setBusy(false);}}
 return <form onSubmit={submit} className="mx-auto mt-10 max-w-md space-y-5 rounded-2xl border bg-white p-7 shadow-sm"><h1 className="text-2xl font-bold">{mode==="login"?"Masuk ke CivicSense":"Daftar akun warga"}</h1>{mode==="register"&&<label className="block text-sm font-medium">Nama lengkap<input name="name" required minLength={2} maxLength={100} className="mt-2 w-full rounded-lg border p-3"/></label>}<label className="block text-sm font-medium">Email<input name="email" type="email" required className="mt-2 w-full rounded-lg border p-3"/></label><label className="block text-sm font-medium">Kata sandi<input name="password" type="password" minLength={mode==="register"?10:1} required className="mt-2 w-full rounded-lg border p-3"/></label>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}<Button disabled={busy} className="w-full">{busy?"Memproses...":mode==="login"?"Masuk":"Buat akun"}</Button><p className="text-center text-sm">{mode==="login"?<>Belum memiliki akun? <Link className="underline" href="/register">Daftar</Link></>:<>Sudah punya akun? <Link className="underline" href="/login">Masuk</Link></>}</p></form>;
}
