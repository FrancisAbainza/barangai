import type { Metadata } from "next";
import { ClerkProvider, Show } from '@clerk/nextjs'
import { Geist, Geist_Mono, Roboto } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/query-provider";
import LandingPageHeader from "@/components/landing-page-header";

const roboto = Roboto({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Barangay Maduya Website",
  description: "The official Barangay Maduya citizen and staff portal for accessing barangay services and managing the barangay.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", roboto.variable)}
    >
      <body className="flex flex-col">
        <ClerkProvider>
          <TooltipProvider>
            <QueryProvider>
              <Show when="signed-out">
                <LandingPageHeader />
              </Show>
              {children}
              <Toaster />
            </QueryProvider>
          </TooltipProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
