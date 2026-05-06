import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Life Manager v1",
  description: "부부·커플·가족용 공동 생활 관리 프로그램"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
