import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  display: "swap",
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "نظام إدارة صوبة الماشروم",
  description: "نظام متكامل لإدارة دورات إنتاج الماشروم والمالية والمخزون",
  applicationName: "صوبة الماشروم",
};

export const viewport: Viewport = {
  themeColor: "#1f7a4d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
