/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
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

  // Align role-specific name and email fields
  if (role === 'DEPARTMENT') {
    formData.department_head_name = formData.department_head_name || formData.full_name || formData.employee_name
    formData.department_email = formData.department_email || formData.email || formData.employee_email
  } else if (role === 'EMPLOYEE') {
    formData.employee_name = formData.employee_name || formData.full_name
    formData.employee_email = formData.employee_email || formData.email
  } else if (role === 'ADMIN') {
    formData.full_name = formData.full_name || formData.employee_name
    formData.email = formData.email || formData.employee_email
  }

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

  // Validate critical formats ONLY on final submission
  if (isSubmit) {
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
  }

  // Calculate completion percentage
  const percentageData = calculateCompletionPercentage(role, formData)
  
  const updateData: Record<string, any> = {
    ...formData,
    profile_completion_percentage: percentageData.score,
    mandatory_fields_completed: percentageData.completedMandatoryFields,
    completed_fields: percentageData.completedMandatoryFields,
    onboarding_draft: formData,
    last_saved_at: new Date().toISOString()
  }

  // Onboarding is completed when profile completion percentage is 100% OR when finalized/submitted at >= 70%
  if (percentageData.score === 100 || (isSubmit && percentageData.score >= 70)) {
    updateData.onboarding_completed = true
    updateData.onboarding_completed_at = new Date().toISOString()
  }

  // Define allowed fields for each table to avoid updating non-existent columns (schema cache errors)
  const adminAllowedKeys = [
    'full_name', 'email', 'profile_photo', 'profile_completion_percentage',
    'onboarding_completed', 'onboarding_started_at', 'onboarding_completed_at',
    'mandatory_fields_completed', 'uploaded_documents', 'phone_number',
    'aadhaar_number', 'pan_number', 'dob', 'gender', 'address', 'city', 'state',
    'pin_code', 'emergency_contact', 'joining_date', 'organization_role',
    'access_authority_level', 'office_location', 'administrative_responsibility',
    'marital_status', 'blood_group', 'languages_known', 'certifications',
    'experience', 'education', 'linkedin', 'resume', 'biography', 'alternate_phone',
    'bank_details', 'onboarding_draft', 'last_saved_at', 'completed_fields',
    'father_name', 'mother_name'
  ]

  const departmentAllowedKeys = [
    'department_name', 'department_email', 'department_head_name', 'password_hash',
    'department_code', 'profile_photo', 'status', 'created_by_admin',
    'profile_completion_percentage', 'onboarding_completed', 'onboarding_started_at',
    'onboarding_completed_at', 'mandatory_fields_completed', 'uploaded_documents',
    'phone_number', 'aadhaar_number', 'pan_number', 'dob', 'gender', 'address',
    'city', 'state', 'pin_code', 'emergency_contact', 'joining_date',
    'department_managed', 'team_size', 'leadership_role', 'managerial_level',
    'reporting_structure', 'marital_status', 'blood_group', 'languages_known',
    'certifications', 'experience', 'education', 'linkedin', 'resume', 'biography',
    'alternate_phone', 'bank_details', 'onboarding_draft', 'last_saved_at', 'completed_fields',
    'father_name', 'mother_name'
  ]

  const employeeAllowedKeys = [
    'department_id', 'profile_photo', 'designation', 'employee_name', 'employee_email',
    'password_hash', 'phone_number', 'employee_code', 'joining_date', 'account_status',
    'created_by_department', 'profile_completion_percentage', 'onboarding_completed',
    'onboarding_started_at', 'onboarding_completed_at', 'mandatory_fields_completed',
    'uploaded_documents', 'aadhaar_number', 'pan_number', 'dob', 'gender', 'address',
    'city', 'state', 'pin_code', 'emergency_contact', 'reporting_manager', 'skills',
    'employment_type', 'work_mode', 'marital_status', 'blood_group', 'languages_known',
    'certifications', 'experience', 'education', 'linkedin', 'resume', 'biography',
    'alternate_phone', 'bank_details', 'onboarding_draft', 'last_saved_at', 'completed_fields',
    'father_name', 'mother_name'
  ]

  let allowedKeys: string[] = []
  if (role === 'ADMIN') {
    allowedKeys = adminAllowedKeys
  } else if (role === 'DEPARTMENT') {
    allowedKeys = departmentAllowedKeys
  } else {
    allowedKeys = employeeAllowedKeys
  }

  const filteredUpdateData: Record<string, any> = {}
  for (const key of allowedKeys) {
    if (key in updateData) {
      filteredUpdateData[key] = updateData[key]
    }
  }

  // Save to database using service client to bypass RLS
  // (RLS only has SELECT policies — UPDATE policies are missing, so user-context client silently fails)
  // Security is enforced above via the role check (lines 57-65)
  const serviceSupabase = createServiceClient()
  console.log("Saving onboarding profile for user:", user.id, "role:", role, "isSubmit:", isSubmit, "score:", percentageData.score)
  const { error: updateErr, data: updatedRecords } = await serviceSupabase
    .from(tableName)
    .update(filteredUpdateData)
    .eq('id', user.id)
    .select()

  console.log("Update result:", { updatedRecords, updateErr, rowsUpdated: updatedRecords?.length })

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
    missingFields: percentageData.missingMandatoryFields,
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
