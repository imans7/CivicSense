import { APP_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t py-6">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {APP_NAME}. Sistem deteksi dan prioritas
        masalah lingkungan berbasis laporan masyarakat.
      </div>
    </footer>
  );
}
