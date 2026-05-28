"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { calculateCompletionPercentage } from "@/lib/onboarding-utils"

// Format validators
const PHONE_REGEX = /^\d{10}$/
const AADHAAR_REGEX = /^\d{12}$/
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]{1}$/

interface SaveOnboardingPayload {
  role: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE'
  formData: Record<string, any>
  isSubmit?: boolean
}

export async function getOnboardingStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Check roles
  const [admin, dept, emp] = await Promise.all([
    supabase.from('admins').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('departments').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('employees').select('*').eq('id', user.id).maybeSingle()
  ])

  if (admin.data) {
    return { success: true, role: 'ADMIN', profile: admin.data }
  } else if (dept.data) {
    return { success: true, role: 'DEPARTMENT', profile: dept.data }
  } else if (emp.data) {
    return { success: true, role: 'EMPLOYEE', profile: emp.data }
  }

  return { success: false, error: "User profile not found in any role table." }
}

export async function saveOnboardingProfile({ role, formData, isSubmit = false }: SaveOnboardingPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Security check: Verify user matches the role table
  let tableName: 'admins' | 'departments' | 'employees' = 'employees'
  if (role === 'ADMIN') {
    tableName = 'admins'
  } else if (role === 'DEPARTMENT') {
    tableName = 'departments'
  } else {
    tableName = 'employees'
  }

  const { data: roleCheck, error: roleCheckErr } = await supabase
    .from(tableName)
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (roleCheckErr || !roleCheck) {
    return { success: false, error: `Security check failed: You are not registered as ${role}.` }
  }

  // Validate critical formats if they are provided
  if (formData.phone_number && !PHONE_REGEX.test(formData.phone_number)) {
    return { success: false, error: "Phone number must be exactly 10 digits." }
  }
  if (formData.aadhaar_number && !AADHAAR_REGEX.test(formData.aadhaar_number)) {
    return { success: false, error: "Aadhaar number must be exactly 12 digits." }
  }
  if (formData.pan_number && !PAN_REGEX.test(formData.pan_number)) {
    return { success: false, error: "PAN number must be in standard format (e.g. ABCDE1234F)." }
  }
  if (formData.emergency_contact?.phone && !PHONE_REGEX.test(formData.emergency_contact.phone)) {
    return { success: false, error: "Emergency contact phone must be exactly 10 digits." }
  }

  // Calculate completion percentage
  const percentageData = calculateCompletionPercentage(role, formData)
  
  const updateData: Record<string, any> = {
    ...formData,
    profile_completion_percentage: percentageData.score,
    mandatory_fields_completed: percentageData.completedMandatoryFields,
  }

  if (isSubmit) {
    if (percentageData.score < 70) {
      return { 
        success: false, 
        error: `Cannot complete onboarding. Current progress is ${percentageData.score}%, but at least 70% is required.` 
      }
    }
    updateData.onboarding_completed = true
    updateData.onboarding_completed_at = new Date().toISOString()
  }

  // Save to database
  const { error: updateErr } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', user.id)

  if (updateErr) {
    console.error("Onboarding profile save error:", updateErr)
    return { success: false, error: updateErr.message }
  }

  revalidatePath('/onboarding')
  if (role === 'ADMIN') {
    revalidatePath('/admin/dashboard')
  } else if (role === 'DEPARTMENT') {
    revalidatePath('/department/dashboard')
  } else {
    const { data: empData } = await supabase
      .from('employees')
      .select('employee_code')
      .eq('id', user.id)
      .single()
    if (empData?.employee_code) {
      revalidatePath(`/employee/${empData.employee_code}/dashboard`)
    }
    revalidatePath('/employee/dashboard')
  }

  return { 
    success: true, 
    score: percentageData.score,
    onboardingCompleted: !!updateData.onboarding_completed 
  }
}

export async function verifyDocumentAction(targetUserId: string, targetRole: 'DEPARTMENT' | 'EMPLOYEE', docId: string, verifyStatus: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Check if current user is indeed an Admin
  const { data: adminCheck } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminCheck) {
    return { success: false, error: "Unauthorized: Admin privileges required." }
  }

  const tableName = targetRole === 'DEPARTMENT' ? 'departments' : 'employees'

  // Fetch the target user's documents
  const { data: profile, error: fetchError } = await supabase
    .from(tableName)
    .select('uploaded_documents')
    .eq('id', targetUserId)
    .single()

  if (fetchError || !profile) {
    return { success: false, error: "Profile not found." }
  }

  const docs = Array.isArray(profile.uploaded_documents) ? [...profile.uploaded_documents] : []
  const docIdx = docs.findIndex((d: any) => d.id === docId)

  if (docIdx === -1) {
    return { success: false, error: "Document not found in user uploads." }
  }

  // Update verification fields on the specific document
  docs[docIdx] = {
    ...docs[docIdx],
    verified: verifyStatus,
    verifiedAt: verifyStatus ? new Date().toISOString() : null,
    verifiedBy: user.id
  }

  // Update back to database
  const { error: updateError } = await supabase
    .from(tableName)
    .update({ uploaded_documents: docs })
    .eq('id', targetUserId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath(`/admin/employees/${targetUserId}`)
  return { success: true }
}
