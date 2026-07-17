import type { Metadata } from "next";

import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Cổng quản lý | Hướng dẫn đăng ký khai sinh",
  description: "Theo dõi phiên hướng dẫn, trường hợp và câu hỏi của người dân.",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
