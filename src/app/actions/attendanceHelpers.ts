// src/app/actions/attendanceHelpers.ts

"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Returns all work sessions for a user on a given date (IST).
 * Sessions are returned ordered by login_time ascending.
 */
export async function getDailySessions(
  userId: string,
  date: string // format YYYY-MM-DD (IST date)
) {
  const supabase = await createClient();

  // Convert IST date to UTC range
  const startIST = new Date(`${date}T00:00:00+05:30`);
  const endIST = new Date(`${date}T23:59:59+05:30`);
  const startUTC = new Date(startIST.getTime() - 5.5 * 60 * 60 * 1000).toISOString();
  const endUTC = new Date(endIST.getTime() - 5.5 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("work_sessions")
    .select("session_id, login_time, logout_time, status")
    .eq("user_id", userId)
    .gte("login_time", startUTC)
    .lte("login_time", endUTC)
    .order("login_time", { ascending: true });

  if (error) {
    console.error("Failed to fetch daily sessions", error);
    return [] as Database["public"]["Tables"]["work_sessions"]["Row"][];
  }
  return data ?? [];
}
