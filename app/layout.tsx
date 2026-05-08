import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Together Life",
  description: "부부가 함께 쓰는 생활 관리 프로그램"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
