import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小红书电商 AI 专家工作台",
  description: "聚合多个 AI 专家角色的小红书电商内容工作台"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
