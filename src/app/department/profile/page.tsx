export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { UserAvatar } from "@/components/custom/UserAvatar"
import { ProfilePhotoEditor } from "@/components/settings/ProfilePhotoEditor"
import { Card } from "@/components/ui/card"
import { Settings, UserCircle, Building2, Hash, Briefcase, CheckCircle, AlertCircle, Award } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Profile | Department",
}

export default async function DepartmentProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: dept } = await supabase
    .from('departments')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!dept) return <div>Profile not found</div>

  // Map onboarding audit fields for Department Head
  let emergencyContact = dept.emergency_contact
  if (typeof emergencyContact === 'string') {
    try {
      emergencyContact = JSON.parse(emergencyContact)
    } catch (e) {
      emergencyContact = {}
    }
  }
  if (!emergencyContact || typeof emergencyContact !== 'object') {
    emergencyContact = {}
  }

  const uploadedDocs = Array.isArray(dept.uploaded_documents) ? dept.uploaded_documents : []

  const allFields = [
    { key: 'department_head_name', label: 'Full Legal Name', value: dept.department_head_name || dept.full_name },
    { key: 'department_email', label: 'Email Address', value: dept.department_email || dept.email },
    { key: 'phone_number', label: 'Primary Phone Number', value: dept.phone_number },
    { key: 'dob', label: 'Date of Birth', value: dept.dob },
    { key: 'gender', label: 'Gender', value: dept.gender },
    { key: 'address', label: 'Street Address', value: dept.address },
    { key: 'city', label: 'City', value: dept.city },
    { key: 'state', label: 'State', value: dept.state },
    { key: 'pin_code', label: 'Pincode / Postal Code', value: dept.pin_code },
    { key: 'emergency_contact_name', label: 'Emergency Contact Name', value: emergencyContact?.name },
    { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', value: emergencyContact?.phone },
    { key: 'father_name', label: "Father's Name", value: dept.father_name },
    { key: 'mother_name', label: "Mother's Name", value: dept.mother_name },
    { key: 'aadhaar_number', label: 'Aadhaar Card Number', value: dept.aadhaar_number },
    { key: 'pan_number', label: 'PAN Card Number', value: dept.pan_number },
    { key: 'department_managed', label: 'Department Managed', value: dept.department_managed },
    { key: 'managerial_level', label: 'Managerial Level Tier', value: dept.managerial_level },
    { key: 'team_size', label: 'Active Team Size Managed', value: dept.team_size ? String(dept.team_size) : null },
    { key: 'leadership_role', label: 'Leadership Role', value: dept.leadership_role },
    { key: 'reporting_structure', label: 'Reporting Structure', value: dept.reporting_structure },
    { key: 'marital_status', label: 'Marital Status', value: dept.marital_status },
    { key: 'blood_group', label: 'Blood Group', value: dept.blood_group },
    { key: 'languages_known', label: 'Languages Known', value: dept.languages_known },
    { key: 'linkedin', label: 'LinkedIn Profile URL', value: dept.linkedin },
    { key: 'experience', label: 'Prior Work Experience', value: dept.experience },
    { key: 'education', label: 'Highest Level of Education', value: dept.education },
    { key: 'biography', label: 'Professional Biography', value: dept.biography },
    { key: 'alternate_phone', label: 'Alternate Phone Number', value: dept.alternate_phone },
    { key: 'doc_aadhaar', label: 'Aadhaar Card Attachment', value: uploadedDocs.find((d: any) => d.type === 'aadhaar') ? 'Uploaded' : null },
    { key: 'doc_pan', label: 'PAN Card Attachment', value: uploadedDocs.find((d: any) => d.type === 'pan') ? 'Uploaded' : null },
    { key: 'doc_resume', label: 'Resume PDF Copy', value: uploadedDocs.find((d: any) => d.type === 'resume') ? 'Uploaded' : null },
    { key: 'doc_certificate', label: 'Degree Certificate', value: uploadedDocs.find((d: any) => d.type === 'certificate') ? 'Uploaded' : null },
  ]

  const enteredFields = allFields.filter(f => f.value && String(f.value).trim() !== '')
  const pendingFields = allFields.filter(f => !f.value || String(f.value).trim() === '')
  const completionPercentage = dept.profile_completion_percentage ?? 0

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader 
          title="Department Profile" 
          description="View your department head details and settings."
        />
        <div className="flex items-center gap-3">
          <Link 
            href="/onboarding"
            className="px-4 py-2.5 text-xs font-bold text-white bg-[#0066FF] hover:bg-[#0052CC] rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            title="Complete or Update Profile Details"
          >
            Update Profile
          </Link>
          <Link 
            href="/department/settings"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-[#0066FF] hover:border-[#0066FF] hover:bg-blue-50 transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <Card className="p-8 rounded-2xl bg-white shadow-sm border-slate-200">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <ProfilePhotoEditor
              currentPhoto={dept.profile_photo}
              name={dept.department_name}
              userId={dept.id}
            />
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-1">{dept.department_name}</h2>
              <div className="flex items-center gap-2 text-purple-600 font-medium bg-purple-50 w-max px-3 py-1 rounded-full text-sm">
                <Building2 className="w-4 h-4" />
                Department
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <Hash className="w-4 h-4" /> Department ID
                </p>
                <p className="text-lg font-bold text-slate-900">{dept.department_code}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <UserCircle className="w-4 h-4" /> Head Name
                </p>
                <p className="text-lg font-bold text-slate-900">{dept.department_head_name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-4 h-4" /> Role
                </p>
                <p className="text-lg font-bold text-slate-900">Department Admin</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Onboarding & Directory Profile Completion Audit Card */}
      <Card className="p-8 rounded-2xl bg-white shadow-sm border border-slate-200/80 space-y-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Onboarding Profile Audit
            </h2>
            <p className="text-xs text-slate-500 font-medium">Verify your registered corporate directory details below.</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completion score:</span>
            <span className="text-2xl font-black text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-2xl border border-blue-200/40">
              {completionPercentage}%
            </span>
          </div>
        </div>

        {/* 1. Entered Fields Section */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Entered Profile Details ({enteredFields.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enteredFields.map(field => (
              <div 
                key={field.key}
                className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:shadow transition"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{field.label}</span>
                  <span className="text-sm font-bold text-slate-800 line-clamp-1">{field.value}</span>
                </div>
                
                <span className="text-emerald-600 bg-emerald-50 p-1.5 rounded-full border border-emerald-100/50 shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Pending Fields Section (Yet to Enter) */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-base font-bold text-slate-500 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Pending Profile Details (Still Yet to Enter) ({pendingFields.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingFields.map(field => (
              <div 
                key={field.key}
                className="p-4 bg-amber-50/5 border border-dashed border-amber-200/30 rounded-xl flex items-center justify-between gap-3 transition"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{field.label}</span>
                  <span className="text-xs font-semibold text-amber-600 italic">Still yet to enter</span>
                </div>
                
                <span className="text-amber-500 bg-amber-50/50 p-1.5 rounded-full border border-amber-100/50 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </span>
              </div>
            ))}
          </div>
        </div>

      </Card>
    </div>
  )
}
