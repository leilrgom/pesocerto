import "server-only";
import { requireUser, HttpError, check } from "@/lib/api";
import { adminClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const { db, user } = await requireUser();
  const admin = adminClient();
  const { data, error } = await admin
    .from("admin_accounts")
    .select("user_id,username,email,active")
    .eq("user_id", user.id)
    .maybeSingle();
  check(error);
  if (!data?.active)
    throw new HttpError(403, "Esta conta não tem acesso à administração.");
  return { db, user, admin, account: data };
}
