import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientErrorBoundary from '@/components/ClientErrorBoundary';
import ClientSessionErrorDetector from '@/components/auth/ClientSessionErrorDetector';
import { ToastProvider } from '@/components/ui/toast-provider'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E11EVEN Central",
  description: "Staff portal for E11EVEN",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientErrorBoundary>
          {children}
        </ClientErrorBoundary>
        <ClientSessionErrorDetector />
        <ToastProvider />
      </body>
    </html>
  );
}
