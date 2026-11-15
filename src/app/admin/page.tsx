import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/server";
import { HttpError } from "@/lib/api";
import { AdminDashboard } from "@/components/admin/dashboard";
export const metadata: Metadata = {
  title: "Administração | Peso Correto",
  robots: { index: false, follow: false },
};
export default async function Page() {
  let username: string;
  try {
    const { account } = await requireAdmin();
    username = account.username;
  } catch (e) {
    if (e instanceof HttpError && (e.status === 401 || e.status === 403))
      redirect("/admin/login");
    throw e;
  }
  return <AdminDashboard username={username} />;
}
