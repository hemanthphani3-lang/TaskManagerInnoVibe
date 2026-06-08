"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function broadcastAnnouncement(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const title = formData.get('title') as string
  const message = formData.get('message') as string
  const target = formData.get('target') as string // 'ALL', 'DEPARTMENTS', 'EMPLOYEES', 'DEPARTMENT_EMPLOYEES'

  if (!title || !message) {
    return { success: false, error: "Missing required fields" }
  }

  // Determine sender role
  let senderRole = 'EMPLOYEE'
  const { data: adminCheck } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle()
  if (adminCheck) senderRole = 'ADMIN'
  else {
    const { data: deptCheck } = await supabase.from('departments').select('id').eq('id', user.id).maybeSingle()
    if (deptCheck) senderRole = 'DEPARTMENT'
  }

  if (senderRole === 'EMPLOYEE') return { success: false, error: "Unauthorized" }

  interface AnnouncementPayload {
    title: string
    message: string
    sender_id: string
    sender_role: string
    target_audience: string
    target_department_id?: string
  }

  const payload: AnnouncementPayload = {
    title,
    message,
    sender_id: user.id,
    sender_role: senderRole,
    target_audience: target
  }

  if (target === 'DEPARTMENT_EMPLOYEES' && senderRole === 'DEPARTMENT') {
    payload.target_department_id = user.id
  }

  const { error } = await supabase.from('announcements').insert(payload)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/announcements')
  revalidatePath('/department/announcements')
  revalidatePath('/employee/announcements')
  
  return { success: true }
}
