import type { Metadata } from "next";
import "./globals.css";
import ToastProvider from "./components/ToastProvider";
import ChatWidget from "./components/ChatWidget";

export const metadata: Metadata = {
  title: "Kawaii Mood Diary 🐱",
  description: "超可爱的心情日记本 ♡",
  icons: {
    icon: "/images/heart.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <ToastProvider>
          {children}
          <ChatWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
