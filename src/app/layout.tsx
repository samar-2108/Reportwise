import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/context";
import { AuthProvider } from "@/lib/auth/context";
import { ChatProvider } from "@/lib/chat/context";
import { ChatDrawer } from "@/components/chat/chat-drawer";

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
        <AuthProvider>
          <LanguageProvider>
            <ChatProvider>
              {children}
              <ChatDrawer />
            </ChatProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
