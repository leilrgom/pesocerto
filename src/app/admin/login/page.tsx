import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin/login";
export const metadata: Metadata = {
  title: "Login administrativo | Peso Correto",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AdminLogin />;
}
