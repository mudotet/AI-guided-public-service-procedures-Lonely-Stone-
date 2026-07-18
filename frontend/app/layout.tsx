import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@fontsource-variable/roboto";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hướng dẫn đăng ký khai sinh",
  description: "Trợ lý AI hướng dẫn chuẩn bị hồ sơ đăng ký khai sinh.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
