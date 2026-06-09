/* eslint-disable @typescript-eslint/no-explicit-any */
// Onboarding Helper Functions for Client and Server

export function calculateCompletionPercentage(role: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE', data: Record<string, any>) {
  let score = 0
  const completedMandatoryFields: string[] = []

  // 11 Mandatory Fields (together contribute 70% to the total score)
  const mandatoryFields = [
    { field: 'name', value: role === 'EMPLOYEE' ? data.employee_name : data.full_name },
    { field: 'email', value: role === 'EMPLOYEE' ? data.employee_email : data.email },
    { field: 'phone_number', value: data.phone_number },
    { field: 'dob', value: data.dob },
    { field: 'gender', value: data.gender },
    { field: 'address', value: data.address },
    { field: 'city', value: data.city },
    { field: 'state', value: data.state },
    { field: 'pin_code', value: data.pin_code },
    { 
      field: 'emergency_contact', 
      value: data.emergency_contact?.name && data.emergency_contact?.phone ? 'filled' : null 
    },
    { field: 'profile_photo', value: data.profile_photo }
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
    return Array.isArray(data.uploaded_documents) && data.uploaded_documents.some((d: any) => d.type === type)
  }

  // 10 Optional Fields (each contributes 3%, max 30%)
  const optionalFields = [
    { field: 'pan', value: data.pan_number || hasDocType('pan') },
    { field: 'resume', value: data.resume || hasDocType('resume') },
    { field: 'linkedin', value: data.linkedin },
    { field: 'certifications', value: data.certifications || hasDocType('certificate') },
    { field: 'skills', value: data.skills },
    { field: 'marital_status', value: data.marital_status },
    { field: 'blood_group', value: data.blood_group },
    { field: 'alternate_phone', value: data.alternate_phone },
    { field: 'biography', value: data.biography },
    { 
      field: 'additional_documents', 
      value: data.aadhaar_number || hasDocType('aadhaar') || (Array.isArray(data.uploaded_documents) && data.uploaded_documents.some((d: any) => !['pan', 'resume', 'certificate'].includes(d.type)))
    }
  ]

  let completedOptionalCount = 0
  optionalFields.forEach(item => {
    if (item.value && String(item.value).trim() !== '' && String(item.value) !== 'false') {
      completedOptionalCount++
    }
  })

  const optionalScore = completedOptionalCount * 3

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

