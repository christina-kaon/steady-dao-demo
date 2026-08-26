import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "稳字经｜互动仙侠故事",
  description: "在小琼峰的日常与封神暗流之间，把稳健变成共同的活路。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
