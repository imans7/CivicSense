import { ForumShell } from "@/components/community/forum-shell";
export const dynamic="force-dynamic";
export default function PublicLayout({children}:{children:React.ReactNode}){return <ForumShell>{children}</ForumShell>}
