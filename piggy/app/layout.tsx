import type { Metadata } from "next";
import "./globals.css";
import ToastProvider from "./components/ToastProvider";
import ChatWidget from "./components/ChatWidget";
import { hasValidSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Kawaii Mood Diary 🐱",
  description: "超可爱的心情日记本 ♡",
  icons: {
    icon: "/images/heart.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authenticated = await hasValidSession();

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <ToastProvider>
          {children}
          {authenticated ? <ChatWidget /> : null}
        </ToastProvider>
      </body>
    </html>
  );
}
