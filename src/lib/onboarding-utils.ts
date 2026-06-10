/* eslint-disable @typescript-eslint/no-explicit-any */
// Onboarding Helper Functions for Client and Server

export function calculateCompletionPercentage(role: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE', data: Record<string, any> = {}) {
  const safeData = data || {}
  let score = 0
  const completedMandatoryFields: string[] = []

  // Resolve name and email based on role
  let nameValue = ""
  let emailValue = ""
  if (role === 'EMPLOYEE') {
    nameValue = safeData.employee_name || safeData.full_name || ""
    emailValue = safeData.employee_email || safeData.email || ""
  } else if (role === 'DEPARTMENT') {
    nameValue = safeData.department_head_name || safeData.full_name || ""
    emailValue = safeData.department_email || safeData.email || ""
  } else {
    nameValue = safeData.full_name || safeData.employee_name || ""
    emailValue = safeData.email || safeData.employee_email || ""
  }

  // 11 Mandatory Fields (together contribute 70% to the total score)
  const mandatoryFields = [
    { field: 'name', value: nameValue },
    { field: 'email', value: emailValue },
    { field: 'phone_number', value: safeData.phone_number },
    { field: 'dob', value: safeData.dob },
    { field: 'gender', value: safeData.gender },
    { field: 'address', value: safeData.address },
    { field: 'city', value: safeData.city },
    { field: 'state', value: safeData.state },
    { field: 'pin_code', value: safeData.pin_code },
    { 
      field: 'emergency_contact', 
      value: safeData.emergency_contact?.name && safeData.emergency_contact?.phone ? 'filled' : null 
    },
    { field: 'profile_photo', value: safeData.profile_photo }
  ]

  let completedMandatoryCount = 0
  mandatoryFields.forEach(item => {
    if (item.value && String(item.value).trim() !== '') {
      completedMandatoryCount++
      completedMandatoryFields.push(item.field)
    }
  })

  const mandatoryScore = (completedMandatoryCount / 11) * 70

  const hasDocType = (type: string) => {
    return Array.isArray(safeData.uploaded_documents) && safeData.uploaded_documents.some((d: any) => d.type === type)
  }

  // Base Optional Fields (9 fields)
  const baseOptionalFields = [
    { field: 'pan', value: safeData.pan_number || hasDocType('pan') },
    { field: 'resume', value: safeData.resume || hasDocType('resume') },
    { field: 'linkedin', value: safeData.linkedin },
    { field: 'certifications', value: safeData.certifications || hasDocType('certificate') },
    { field: 'marital_status', value: safeData.marital_status },
    { field: 'blood_group', value: safeData.blood_group },
    { field: 'alternate_phone', value: safeData.alternate_phone },
    { field: 'biography', value: safeData.biography },
    { 
      field: 'additional_documents', 
      value: safeData.aadhaar_number || hasDocType('aadhaar') || (Array.isArray(safeData.uploaded_documents) && safeData.uploaded_documents.some((d: any) => !['pan', 'resume', 'certificate'].includes(d.type)))
    }
  ]

  const optionalFields = [...baseOptionalFields]
  if (role === 'EMPLOYEE') {
    optionalFields.push({ field: 'skills', value: safeData.skills })
  }

  const totalOptionalCount = optionalFields.length

  let completedOptionalCount = 0
  optionalFields.forEach(item => {
    if (item.value && String(item.value).trim() !== '' && String(item.value) !== 'false') {
      completedOptionalCount++
    }
  })

  // Optional fields contribute 30% to total score
  const optionalScore = totalOptionalCount > 0 ? (completedOptionalCount / totalOptionalCount) * 30 : 0

  score = Math.round(mandatoryScore + optionalScore)

  const missingMandatoryFields = mandatoryFields
    .filter(item => !item.value || String(item.value).trim() === '')
    .map(item => item.field)

  return {
    score: Math.min(100, score),
    completedMandatoryFields,
    missingMandatoryFields
  }
}

