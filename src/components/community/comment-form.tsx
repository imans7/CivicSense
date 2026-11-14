"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function CommentForm({reportId}:{reportId:string}){
 const router=useRouter();const [content,setContent]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{const r=await fetch(`/api/community/${reportId}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content})});const data=await r.json();if(!r.ok)throw new Error(data.error||"Komentar gagal dikirim");setContent("");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Gagal");}finally{setBusy(false);}}
 return <form onSubmit={submit} className="comment-form"><textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={1000} minLength={2} required rows={3} placeholder="Tulis tanggapan yang membangun..." aria-label="Komentar"/><div className="comment-form-bottom"><span>{content.length}/1000 karakter</span><button disabled={busy||content.trim().length<2}>{busy?"Mengirim...":"Kirim balasan"}</button></div>{error&&<p role="alert" className="post-notice">{error}</p>}</form>;
}
