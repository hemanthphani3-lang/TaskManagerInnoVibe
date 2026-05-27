"use server"

import { createClient } from "@/lib/supabase/server"

export async function createHoliday(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const name = formData.get('name') as string
  const date = formData.get('date') as string
  const type = formData.get('type') as string

  if (!name || !date || !type) {
    return { success: false, error: "Missing required fields" }
  }

  const { error } = await supabase
    .from('holidays')
    .insert({
      holiday_name: name,
      holiday_date: date,
      holiday_type: type,
      created_by: user.id
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deleteHoliday(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
