"use client";
import { useState } from "react";
import Link from "next/link";
export function MapExplorer({points}:{points:{id:string;title:string;latitude:number;longitude:number;status:string}[]}){
 const [selected,setSelected]=useState(points[0]??null);
 const center=selected??{latitude:-6.2,longitude:106.816666};
 const lat=center.latitude, lon=center.longitude;
 const src=`https://www.openstreetmap.org/export/embed.html?bbox=${lon-.012}%2C${lat-.009}%2C${lon+.012}%2C${lat+.009}&layer=mapnik&marker=${lat}%2C${lon}`;
 return <div className="grid gap-5 lg:grid-cols-[1fr_2fr]"><div className="max-h-[530px] space-y-2 overflow-y-auto rounded-xl border p-3">{points.map(r=><button key={r.id} type="button" onClick={()=>setSelected(r)} className={`block w-full rounded-lg border p-3 text-left ${selected?.id===r.id?"border-emerald-700 bg-emerald-50":""}`}><span className="block font-medium">{r.title}</span><span className="text-xs text-gray-600">{r.status}</span></button>)}{!points.length&&<p>Belum ada titik laporan.</p>}</div><div className="overflow-hidden rounded-xl border bg-white"><iframe key={src} src={src} title="Peta OpenStreetMap laporan terpilih" loading="lazy" className="h-[480px] w-full" referrerPolicy="no-referrer"/><div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><span>{selected?selected.title:"Peta wilayah"}</span>{selected&&<Link href={`/reports/${selected.id}`} className="text-emerald-700 underline">Detail laporan</Link>}</div></div></div>;
}
