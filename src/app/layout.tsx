import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/community/theme-toggle";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} | Pelaporan Masalah Lingkungan`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_TAGLINE,
};

const themeInitScript = `(() => {
  try {
    const saved = localStorage.getItem("civicsense-theme");
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <Script id="civicsense-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <ThemeToggle />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
