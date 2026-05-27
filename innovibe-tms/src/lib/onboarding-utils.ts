// Onboarding Helper Functions for Client and Server

export function calculateCompletionPercentage(role: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE', data: Record<string, any>) {
  let score = 0
  const completedMandatoryFields: string[] = []

  // 14 Common Mandatory Fields (each contributes 5% to the score)
  const commonMandatory = [
    { field: 'name', value: role === 'EMPLOYEE' ? data.employee_name : data.full_name },
    { field: 'email', value: role === 'EMPLOYEE' ? data.employee_email : data.email },
    { field: 'phone_number', value: data.phone_number },
    { field: 'dob', value: data.dob },
    { field: 'gender', value: data.gender },
    { field: 'address', value: data.address },
    { field: 'city', value: data.city },
    { field: 'state', value: data.state },
    { field: 'pin_code', value: data.pin_code },
    { field: 'aadhaar_number', value: data.aadhaar_number },
    { field: 'pan_number', value: data.pan_number },
    { field: 'father_name', value: data.father_name },
    { field: 'mother_name', value: data.mother_name },
    { 
      field: 'emergency_contact', 
      value: data.emergency_contact?.name && data.emergency_contact?.phone ? 'filled' : null 
    }
  ]

  commonMandatory.forEach(item => {
    if (item.value && String(item.value).trim() !== '') {
      score += 5
      completedMandatoryFields.push(item.field)
    }
  })

  // 2 Role-specific Mandatory Fields (each contributes 5% to the score)
  let roleSpecific: { field: string; value: any }[] = []
  if (role === 'ADMIN') {
    roleSpecific = [
      { field: 'organization_role', value: data.organization_role },
      { field: 'office_location', value: data.office_location }
    ]
  } else if (role === 'DEPARTMENT') {
    roleSpecific = [
      { field: 'department_managed', value: data.department_managed },
      { field: 'managerial_level', value: data.managerial_level }
    ]
  } else if (role === 'EMPLOYEE') {
    roleSpecific = [
      { field: 'designation', value: data.designation },
      { field: 'reporting_manager', value: data.reporting_manager }
    ]
  }

  roleSpecific.forEach(item => {
    if (item.value && String(item.value).trim() !== '') {
      score += 5
      completedMandatoryFields.push(item.field)
    }
  })

  // Mandatory fields completed score sum cap is 70% (14 fields * 5%)

  // 6 Optional Fields (each contributes 5% to the score, max 30%)
  const optionalFields = [
    { field: 'marital_status', value: data.marital_status },
    { field: 'blood_group', value: data.blood_group },
    { field: 'languages_known', value: data.languages_known },
    { field: 'linkedin', value: data.linkedin },
    { field: 'experience_or_education', value: data.experience || data.education },
    { 
      field: 'uploaded_documents', 
      value: (Array.isArray(data.uploaded_documents) && data.uploaded_documents.length > 0) || data.resume ? 'filled' : null 
    }
  ]

  optionalFields.forEach(item => {
    if (item.value && String(item.value).trim() !== '') {
      score += 5
    }
  })

  return {
    score: Math.min(100, score),
    completedMandatoryFields
  }
}
