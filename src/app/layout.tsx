import type { Metadata } from "next";
import "./globals.css";
import AppFrame from "@/components/AppFrame";

export const metadata: Metadata = {
  title: "KatsudouLog | 就活選考管理",
  description: "就活の選考フロー・締切・カレンダーをまとめて管理する KatsudouLog",
};

// ダークモードのちらつき防止：ハイドレーション前にクラスを適用
const themeScript = `(function(){try{var t=localStorage.getItem('katsudou-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
