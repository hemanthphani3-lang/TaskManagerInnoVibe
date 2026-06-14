export const dynamic = 'force-dynamic'
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RealtimeListener } from "@/components/custom/RealtimeListener";
import { MagicBentoListener } from "@/components/custom/MagicBentoListener";
import { ThemeProvider } from "@/components/custom/ThemeProvider";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InnoVibe | TMS",
  description: "Next Generation Team Management System",
  manifest: "/manifest.ts",
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#F8FAFC] text-slate-900 transition-colors duration-300`}
        >
          <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" disableTransitionOnChange>
            <NextTopLoader 
              color="#0066FF"
              initialPosition={0.08}
              crawlSpeed={200}
              height={3}
              crawl={true}
              showSpinner={false}
              easing="ease"
              speed={200}
              shadow="0 0 10px #0066FF,0 0 5px #0066FF"
            />
            <RealtimeListener />
            <MagicBentoListener />
            <Toaster position="top-right" theme="light" richColors />
            {children}
          </ThemeProvider>
        </body>
      </html>
    );
  }
