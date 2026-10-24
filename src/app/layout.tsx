import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/context";

export const metadata: Metadata = {
  title: "ReportWise - Understand Your Medical Lab Reports",
  description:
    "Upload your medical lab report for clear, plain-language AI explanation and verified insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
