"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function updateSelfPassword(newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function adminResetPassword(userId: string, newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Check if caller is admin
  const { data: adminCheck } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle()
  if (!adminCheck) return { success: false, error: "Unauthorized: Admins only" }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword
  })

  if (error) return { success: false, error: error.message }
  
  // Also log this security event or notify the user if necessary.
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title: 'Password Reset',
    message: 'Your password was reset by an Administrator.',
    type: 'SYSTEM',
    link_url: '#'
  })

  return { success: true }
}
