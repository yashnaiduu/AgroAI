import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroAI",
  description: "A professional AI assistant for modern agriculture.",
  icons: {
    icon: '/favicon.ico?v=2',
  },
};

import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased h-screen w-screen overflow-hidden bg-background text-foreground selection:bg-green-500/30 flex">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Toaster position="top-right" toastOptions={{ className: '!bg-card !text-foreground !border !border-border', duration: 4000 }} />
          <main className="flex-1 h-full w-full flex">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
