import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SoundProvider } from "@/context/SoundContext";
import { AuthProvider } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "BirbRacers — Race to the Finish!",
  description:
    "A premium multiplayer racing game. Create an account, pick your car, and race against friends in real time.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen font-body antialiased bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-300">
        <ThemeProvider>
          <SoundProvider>
            <AuthProvider>
              <I18nProvider>
                <div className="relative min-h-screen flex flex-col">
                  {/* Background decorations */}
                  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-600/5 dark:bg-brand-600/8 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-0 w-64 h-64 bg-brand-400/3 dark:bg-brand-400/5 rounded-full blur-3xl" />
                  </div>

                  <Navbar />
                  <main className="flex-1">{children}</main>
                </div>
              </I18nProvider>
            </AuthProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
