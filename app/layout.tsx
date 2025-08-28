import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { DebugBubble } from "@/components/DebugBubble";
import "./globals.css";

// Initialize structured logging for production
import "@/lib/utils/logger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrunchyCone Vanilla Starter Project",
  description: "A production-ready Next.js starter with auth and admin dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            themes={["light", "dark", "system", "ocean", "forest", "midnight"]}
            disableTransitionOnChange
          >
            {children}
            <DebugBubble />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
