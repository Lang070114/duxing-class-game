import type { Metadata } from "next";
import "./game.css";

export const metadata: Metadata = {
  title: "笃行班 · 我们班，正在联机！",
  description: "大二副本已开启。匿名加入，一起写下笃行班的新章节。",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
