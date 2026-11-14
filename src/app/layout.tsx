import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";


export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} | Pelaporan Masalah Lingkungan`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={"min-h-screen antialiased"}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
