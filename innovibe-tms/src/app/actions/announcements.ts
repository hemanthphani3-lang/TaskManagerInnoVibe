"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function broadcastAnnouncement(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const title = formData.get('title') as string
  const message = formData.get('message') as string
  const target = formData.get('target') as string // 'ALL', 'DEPARTMENTS', 'EMPLOYEES', 'DEPARTMENT_EMPLOYEES'
  
  // Rich media attachments and voice notes
  const attachmentsJson = formData.get('attachments') as string
  const voiceNoteUrl = formData.get('voice_note_url') as string || null

  if (!title || !message) {
    return { success: false, error: "Missing required fields" }
  }

  // Determine sender role & fetch real name
  let senderRole = 'EMPLOYEE'
  let senderName = 'System User'
  
  const { data: adminCheck } = await supabase.from('admins').select('full_name').eq('id', user.id).maybeSingle()
  if (adminCheck) {
    senderRole = 'ADMIN'
    senderName = adminCheck.full_name || 'System Administrator'
  } else {
    const { data: deptCheck } = await supabase.from('departments').select('department_name, department_head_name').eq('id', user.id).maybeSingle()
    if (deptCheck) {
      senderRole = 'DEPARTMENT'
      senderName = deptCheck.department_head_name 
        ? `${deptCheck.department_head_name} (${deptCheck.department_name} Head)` 
        : `${deptCheck.department_name} Head`
    }
  }

  if (senderRole === 'EMPLOYEE') return { success: false, error: "Unauthorized" }

  let attachments = []
  try {
    if (attachmentsJson) {
      attachments = JSON.parse(attachmentsJson)
    }
  } catch (e) {
    console.error("Failed to parse attachments:", e)
  }

  const payload: any = {
    title,
    message,
    sender_id: user.id,
    sender_role: senderRole,
    target_audience: target,
    attachments,
    voice_note_url: voiceNoteUrl,
    created_by_role: senderRole,
    created_by_name: senderName
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
