export type AdminOverview = {
  username: string;
  users: number;
  animals: number;
  records: number;
  pending_deletions: number;
  analyses_today: number;
  analyses_month: number;
  completed_month: number;
  failed_month: number;
  input_tokens_month: number;
  output_tokens_month: number;
  limits: { daily: number; monthly: number };
  model: string;
};
export type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  farm_name: string;
  created_at: string;
  deletion_requested_at: string | null;
  animal_count: number;
  record_count: number;
};
export type AdminUsage = {
  id: string;
  user_id: string;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  status: "reserved" | "completed" | "failed";
  created_at: string;
  profiles: { full_name: string; email: string } | null;
};
export type AdminUserDetail = {
  profile: AdminUser;
  animal_count: number;
  record_count: number;
  analysis_count: number;
  animals: {
    id: string;
    identification: string;
    name: string;
    species: string;
    created_at: string;
  }[];
  records: {
    id: string;
    created_at: string;
    estimated_weight_kg: number | null;
    actual_weight_kg: number | null;
    status: string;
  }[];
  usage: Omit<AdminUsage, "profiles">[];
};
