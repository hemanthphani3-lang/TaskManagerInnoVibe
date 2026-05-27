export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { UserAvatar } from "@/components/custom/UserAvatar"
import { ProfilePhotoEditor } from "@/components/settings/ProfilePhotoEditor"
import { Card } from "@/components/ui/card"
import { Settings, UserCircle, Building2, Hash, Briefcase, Calendar, CheckCircle, AlertCircle, Award } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Profile | Employee",
}

export default async function EmployeeProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Use service role client to bypass RLS
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // First try by auth user ID
  let { data: emp } = await adminSupabase
    .from('employees')
    .select('*')
    .eq('id', user!.id)
    .maybeSingle()

  // Fallback: try by email
  if (!emp && user?.email) {
    const { data: empByEmail } = await adminSupabase
      .from('employees')
      .select('*')
      .eq('employee_email', user.email)
      .maybeSingle()
    emp = empByEmail
  }

  if (!emp) return (
    <div className="p-8 text-center text-slate-500">
      <p className="font-semibold">Employee profile not found.</p>
      <p className="text-sm mt-1">Your account ({user?.email}) is not linked to an employee record.</p>
    </div>
  )

  // Fetch department name separately
  let departmentName = "N/A"
  if (emp.department_id) {
    const { data: dept } = await adminSupabase
      .from('departments')
      .select('department_name')
      .eq('id', emp.department_id)
      .maybeSingle()
    if (dept) departmentName = dept.department_name
  }

  // Map onboarding audit fields
  const allFields = [
    { key: 'employee_name', label: 'Full Legal Name', value: emp.employee_name || emp.full_name },
    { key: 'employee_email', label: 'Email Address', value: emp.employee_email || emp.email },
    { key: 'phone_number', label: 'Primary Phone Number', value: emp.phone_number },
    { key: 'dob', label: 'Date of Birth', value: emp.dob },
    { key: 'gender', label: 'Gender', value: emp.gender },
    { key: 'address', label: 'Street Address', value: emp.address },
    { key: 'city', label: 'City', value: emp.city },
    { key: 'state', label: 'State', value: emp.state },
    { key: 'pin_code', label: 'Pincode / Postal Code', value: emp.pin_code },
    { key: 'emergency_contact_name', label: 'Emergency Contact Name', value: emp.emergency_contact?.name },
    { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', value: emp.emergency_contact?.phone },
    { key: 'father_name', label: "Father's Name", value: emp.father_name },
    { key: 'mother_name', label: "Mother's Name", value: emp.mother_name },
    { key: 'aadhaar_number', label: 'Aadhaar Card Number', value: emp.aadhaar_number },
    { key: 'pan_number', label: 'PAN Card Number', value: emp.pan_number },
    { key: 'designation', label: 'Professional Designation', value: emp.designation },
    { key: 'reporting_manager', label: 'Reporting Manager', value: emp.reporting_manager },
    { key: 'marital_status', label: 'Marital Status', value: emp.marital_status },
    { key: 'blood_group', label: 'Blood Group', value: emp.blood_group },
    { key: 'languages_known', label: 'Languages Known', value: emp.languages_known },
    { key: 'linkedin', label: 'LinkedIn Profile URL', value: emp.linkedin },
    { key: 'experience', label: 'Prior Work Experience', value: emp.experience },
    { key: 'education', label: 'Highest Level of Education', value: emp.education },
    { key: 'biography', label: 'Professional Biography', value: emp.biography },
    { key: 'alternate_phone', label: 'Alternate Phone Number', value: emp.alternate_phone },
    { key: 'skills', label: 'Core Technical Skills', value: emp.skills },
    { key: 'employment_type', label: 'Employment Type', value: emp.employment_type },
    { key: 'work_mode', label: 'Work Mode Setup', value: emp.work_mode },
    { key: 'doc_aadhaar', label: 'Aadhaar Card Attachment', value: emp.uploaded_documents?.find((d: any) => d.type === 'aadhaar') ? 'Uploaded' : null },
    { key: 'doc_pan', label: 'PAN Card Attachment', value: emp.uploaded_documents?.find((d: any) => d.type === 'pan') ? 'Uploaded' : null },
    { key: 'doc_resume', label: 'Resume PDF Copy', value: emp.uploaded_documents?.find((d: any) => d.type === 'resume') ? 'Uploaded' : null },
    { key: 'doc_certificate', label: 'Degree Certificate', value: emp.uploaded_documents?.find((d: any) => d.type === 'certificate') ? 'Uploaded' : null },
  ]

  const enteredFields = allFields.filter(f => f.value && String(f.value).trim() !== '')
  const pendingFields = allFields.filter(f => !f.value || String(f.value).trim() === '')
  const completionPercentage = emp.profile_completion_percentage ?? 0

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader 
          title="My Profile" 
          description="View your personal and organizational details."
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
            href="/employee/settings"
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
              currentPhoto={emp.profile_photo}
              name={emp.employee_name}
              userId={emp.id}
            />
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-1">{emp.employee_name}</h2>
              <div className="flex items-center gap-2 text-[#0066FF] font-medium bg-blue-50 w-max px-3 py-1 rounded-full text-sm">
                <Briefcase className="w-4 h-4" />
                Employee
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <Hash className="w-4 h-4" /> Employee ID
                </p>
                <p className="text-lg font-bold text-slate-900">{emp.employee_code}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <UserCircle className="w-4 h-4" /> Role
                </p>
                <p className="text-lg font-bold text-slate-900">{emp.designation}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <Building2 className="w-4 h-4" /> Department
                </p>
                <p className="text-lg font-bold text-slate-900">{departmentName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-4 h-4" /> Joined Date
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : "N/A"}
                </p>
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
