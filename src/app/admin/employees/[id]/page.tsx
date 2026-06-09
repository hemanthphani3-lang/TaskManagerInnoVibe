"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { calculateCompletionPercentage } from "@/lib/onboarding-utils"
import { verifyDocumentAction } from "@/app/actions/onboarding"
import { toast, Toaster } from "sonner"
import { AttendanceSessionHistorySection } from "@/components/employee/AttendanceSessionHistorySection"
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Download, 
  ExternalLink, 
  Clock, 
  Award, 
  Lock, 
  Unlock,
  Activity,
  Briefcase
} from "lucide-react"

export default function AdminWorkforceProfileViewer() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Record<string, any> | null>(null)
  const [role, setRole] = useState<'EMPLOYEE' | 'DEPARTMENT' | null>(null)
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null)
  const [activePreviewDoc, setActivePreviewDoc] = useState<any>(null)

  // Load profile details (supports both Employee & Dept Head)
  useEffect(() => {
    async function loadData() {
      if (!id) return
      setLoading(true)
      
      // Try fetching as Employee
      const { data: empData } = await supabase
        .from('employees')
        .select('*, departments!department_id(department_name)')
        .eq('id', id)
        .maybeSingle()

      if (empData) {
        setProfile(empData)
        setRole('EMPLOYEE')
        setLoading(false)
        return
      }

      // Try fetching as Department Head
      const { data: deptData } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (deptData) {
        setProfile(deptData)
        setRole('DEPARTMENT')
        setLoading(false)
        return
      }

      toast.error("Profile not found in corporate directory.")
      setLoading(false)
    }

    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center flex-col">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-semibold text-sm">Retrieving secure profile audits...</p>
      </div>
    )
  }

  if (!profile || !role) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link href="/admin/employees" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Workforce Directory
        </Link>
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-950 mb-2">Profile Not Found</h3>
          <p className="text-slate-500 max-w-md mx-auto">The user ID does not map to any active Employee or Department Head record. Please verify the ID or check organizational tables.</p>
        </div>
      </div>
    )
  }

  // Calculate metrics
  const percentageData = calculateCompletionPercentage(role, profile)
  const score = percentageData.score
  const isFullyCompleted = score === 100
  const isUnlocked = score >= 70

  // 16 Mandatory Fields mapping
  const mandatoryFieldsKeys = [
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email Address' },
    { key: 'phone_number', label: 'Phone Number' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'address', label: 'Street Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'pin_code', label: 'Pincode' },
    { key: 'aadhaar_number', label: 'Aadhaar Number' },
    { key: 'pan_number', label: 'PAN Card Number' },
    { key: 'father_name', label: "Father's Name" },
    { key: 'mother_name', label: "Mother's Name" },
    { key: 'emergency_contact', label: 'Emergency Contact' },
    // Role specific
    ...(role === 'DEPARTMENT' ? [
      { key: 'department_managed', label: 'Department Managed' },
      { key: 'managerial_level', label: 'Managerial Level' }
    ] : [
      { key: 'designation', label: 'Designation' },
      { key: 'reporting_manager', label: 'Reporting Manager' }
    ])
  ]

  const missingFields = mandatoryFieldsKeys.filter(
    f => !percentageData.completedMandatoryFields.includes(f.key)
  )

  // Document verification toggle
  const handleVerifyToggle = async (docId: string, currentStatus: boolean) => {
    setUpdatingDocId(docId)
    try {
      const res = await verifyDocumentAction(id, role, docId, !currentStatus)
      if (res.success) {
        toast.success(`Document ${!currentStatus ? 'successfully verified' : 'marked as unverified'}!`)
        // Update local state dynamically
        setProfile(prev => {
          if (!prev) return null
          const docs = Array.isArray(prev.uploaded_documents) ? [...prev.uploaded_documents] : []
          const docIdx = docs.findIndex(d => d.id === docId)
          if (docIdx !== -1) {
            docs[docIdx] = {
              ...docs[docIdx],
              verified: !currentStatus,
              verifiedAt: !currentStatus ? new Date().toISOString() : null
            }
          }
          return { ...prev, uploaded_documents: docs }
        })
      } else {
        toast.error(res.error || "Failed to update verification status.")
      }
    } catch (err: any) {
      toast.error(err.message || String(err))
    } finally {
      setUpdatingDocId(null)
    }
  }

  const getProgressColor = () => {
    if (score < 40) return 'from-red-500 to-orange-500 shadow-red-500/10'
    if (score < 70) return 'from-amber-500 to-yellow-500 shadow-yellow-500/10'
    return 'from-emerald-500 to-cyan-500 shadow-emerald-500/10'
  }

  const getBgGlow = () => {
    if (score < 40) return 'bg-red-500/5 border-red-500/10'
    if (score < 70) return 'bg-amber-500/5 border-amber-500/10'
    return 'bg-emerald-500/5 border-emerald-500/10'
  }

  const isPDF = (url: string) => url?.toLowerCase().endsWith('.pdf') || url?.toLowerCase().includes('.pdf?')

  const uploadedDocs = Array.isArray(profile.uploaded_documents) ? profile.uploaded_documents : []

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <Toaster position="top-right" theme="light" />
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link 
            href="/admin/employees"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> 
            Back to Workforce Directory
          </Link>
          
          <span className="text-xs font-bold text-slate-400">
            Timeline / Last Updated: {profile.updated_at ? new Date(profile.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'No audits yet'}
          </span>
        </div>

        {/* Profile Onboarding Title Card */}
        <div className={`relative overflow-hidden rounded-3xl border p-8 bg-white shadow-xl shadow-slate-100/40`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-60 pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-center relative z-10">
            
            <div className="flex items-start sm:items-center gap-5 flex-col sm:flex-row">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200/50 flex items-center justify-center text-blue-600 font-black text-3xl shrink-0 shadow-md">
                {(role === 'EMPLOYEE' ? profile.employee_name : profile.department_name)?.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-2">
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    {role === 'EMPLOYEE' ? profile.employee_name : profile.department_name}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/40 text-blue-700 text-xs font-bold uppercase shadow-sm">
                    {role === 'DEPARTMENT' ? 'Department Head' : 'Employee'}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500">
                  Code: {role === 'EMPLOYEE' ? profile.employee_code : profile.department_code} | {role === 'EMPLOYEE' ? profile.employee_email : profile.department_email}
                </p>
                {role === 'EMPLOYEE' && profile.departments?.department_name && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    <Building2 className="w-3.5 h-3.5" />
                    {profile.departments.department_name}
                  </span>
                )}
              </div>
            </div>

            {/* Completion Percentage ring/bar */}
            <div className="w-full lg:w-72 space-y-3 shrink-0">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compliance Status</span>
                <span className="text-2xl font-black text-slate-900">{score}%</span>
              </div>
              
              <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getProgressColor()} rounded-full transition-all`}
                  style={{ width: `${score}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold">
                {isFullyCompleted ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> Profile 100% Compliant
                  </span>
                ) : isUnlocked ? (
                  <span className="text-blue-600 flex items-center gap-1">
                    <Unlock className="w-3.5 h-3.5" /> Access Unlocked (70%+)
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 animate-pulse" /> Access Locked (below 70%)
                  </span>
                )}
                <span className="text-slate-400">70% Required</span>
              </div>
            </div>

          </div>
        </div>

        {/* Missing fields alert if < 100 */}
        {!isFullyCompleted && missingFields.length > 0 && (
          <div className="p-5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-3xl flex gap-3 text-amber-900 shadow-sm">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-bold">Pending Profile Requirements ({missingFields.length})</h3>
              <p className="text-xs text-amber-700 mt-0.5">This profile is missing the following required onboarding directory parameters:</p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {missingFields.map(f => (
                  <span key={f.key} className="text-[10px] font-extrabold bg-white border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg">
                    ✦ {f.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Detailed Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Personal, Contact & Employment Details */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Identity Card Details */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-[#0A1A2F] border-b border-slate-100 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Personal Profile Details
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date of Birth</p>
                  <p className="font-bold text-slate-800 mt-1">{profile.dob ? new Date(profile.dob).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Not filled'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gender</p>
                  <p className="font-bold text-slate-800 mt-1">{profile.gender || 'Not filled'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Father's Name</p>
                  <p className="font-bold text-slate-800 mt-1">{profile.father_name || 'Not filled'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mother's Name</p>
                  <p className="font-bold text-slate-800 mt-1">{profile.mother_name || 'Not filled'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marital Status</p>
                  <p className="font-bold text-slate-800 mt-1">{profile.marital_status || 'Not filled'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Blood Group</p>
                  <p className="font-bold text-slate-850 mt-1">
                    {profile.blood_group ? (
                      <span className="inline-block px-2.5 py-0.5 bg-red-50 text-red-600 rounded-md border border-red-155/30 font-bold text-xs">
                        {profile.blood_group}
                      </span>
                    ) : 'Not filled'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Known Languages</p>
                  <p className="font-semibold text-slate-800 mt-1">{profile.languages_known || 'Not filled'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Professional Bio</p>
                  <p className="text-sm leading-relaxed text-slate-600 mt-1 italic">
                    &ldquo;{profile.biography || 'No biography written yet.'}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Professional & Contact Details */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-[#0A1A2F] border-b border-slate-100 pb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Professional & Contact Info
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Corporate Role</p>
                  <p className="font-bold text-slate-800 mt-1">{role === 'DEPARTMENT' ? 'Department Manager' : (profile.designation || 'Not filled')}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reporting Authority</p>
                  <p className="font-bold text-slate-800 mt-1">
                    {role === 'DEPARTMENT' ? 'VP / Executive Board' : (profile.reporting_manager || 'Not filled')}
                  </p>
                </div>

                {role === 'DEPARTMENT' && (
                  <>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department Managed</p>
                      <p className="font-bold text-slate-800 mt-1">{profile.department_managed || 'Not filled'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Managerial Tier</p>
                      <p className="font-bold text-slate-800 mt-1">{profile.managerial_level || 'Not filled'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department Team Size</p>
                      <p className="font-bold text-slate-800 mt-1">{profile.team_size ?? 0} active employees</p>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Phone</p>
                  <p className="font-bold text-slate-800 mt-1">{profile.phone_number || 'Not filled'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alternate Contact</p>
                  <p className="font-semibold text-slate-800 mt-1">{profile.alternate_phone || 'Not filled'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Office Base Address</p>
                  <p className="font-semibold text-slate-850 mt-1">
                    {profile.address}, {profile.city}, {profile.state} - {profile.pin_code}
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency Contacts Group */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-[#0A1A2F] border-b border-slate-100 pb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Emergency Anchor Contact Details
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-150/70">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anchor Name</p>
                  <p className="font-bold text-slate-800 mt-1">{profile.emergency_contact?.name || 'Not filled'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anchor Phone Number</p>
                  <p className="font-bold text-slate-800 mt-1">{profile.emergency_contact?.phone || 'Not filled'}</p>
                </div>
              </div>
            </div>

            {/* Attendance & Session History */}
            {role === 'EMPLOYEE' && (
              <AttendanceSessionHistorySection employeeId={id} />
            )}

          </div>

          {/* Right Column: Verified Documents & Previews */}
          <div className="space-y-8">
            
            {/* Government Verified IDs */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-[#0A1A2F] border-b border-slate-100 pb-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Government Validated IDs
              </h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-150/70 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aadhaar Card No</span>
                    <p className="font-mono font-extrabold text-slate-900 tracking-wider mt-0.5">
                      {profile.aadhaar_number ? profile.aadhaar_number.replace(/(\d{4})/g, '$1 ').trim() : 'Not filled'}
                    </p>
                  </div>
                  {profile.aadhaar_number ? (
                    <span className="p-1 text-emerald-600 bg-emerald-50 rounded-full border border-emerald-100">
                      <CheckCircle className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1 text-red-500 bg-red-50 rounded-full border border-red-100">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border border-slate-150/70 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PAN Card No</span>
                    <p className="font-mono font-extrabold text-slate-900 tracking-wider mt-0.5">
                      {profile.pan_number || 'Not filled'}
                    </p>
                  </div>
                  {profile.pan_number ? (
                    <span className="p-1 text-emerald-600 bg-emerald-50 rounded-full border border-emerald-100">
                      <CheckCircle className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1 text-red-500 bg-red-50 rounded-full border border-red-100">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Document attachments management */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-[#0A1A2F] border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Workforce Attachments
              </h2>

              <div className="space-y-4">
                {uploadedDocs.length === 0 ? (
                  <p className="text-slate-400 text-xs font-semibold text-center py-6">No files uploaded yet.</p>
                ) : (
                  uploadedDocs.map((doc: any) => (
                    <div 
                      key={doc.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 hover:shadow-md ${
                        activePreviewDoc?.id === doc.id 
                          ? 'border-blue-300 bg-blue-50/20' 
                          : doc.verified 
                          ? 'border-emerald-100 bg-emerald-50/5' 
                          : 'border-slate-100 bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${doc.verified ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{doc.type}</span>
                            <span className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[150px]">{doc.name}</span>
                          </div>
                        </div>
                        
                        {/* Download & Preview Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a 
                            href={doc.url} 
                            download 
                            target="_blank"
                            rel="noreferrer"
                            title="Download original file"
                            className="p-1.5 hover:bg-slate-200/70 text-slate-500 rounded-lg border border-slate-200 bg-white shadow-sm transition active:scale-90"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button 
                            onClick={() => setActivePreviewDoc(doc)}
                            title="Preview file"
                            className="p-1.5 hover:bg-slate-200/70 text-slate-500 rounded-lg border border-slate-200 bg-white shadow-sm transition active:scale-90"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Verification section */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN', { dateStyle: 'short' }) : 'No timestamp'}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${doc.verified ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/30' : 'bg-red-50 text-red-800 border border-red-150/30'}`}>
                            {doc.verified ? 'Verified' : 'Pending'}
                          </span>
                          
                          <button
                            onClick={() => handleVerifyToggle(doc.id, !!doc.verified)}
                            disabled={updatingDocId === doc.id}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                              doc.verified 
                                ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700' 
                                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                            }`}
                          >
                            {updatingDocId === doc.id ? 'Saving...' : doc.verified ? 'Revoke Approval' : 'Verify & Approve'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Inline Live Document Preview Drawer Modal */}
        {activePreviewDoc && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Audit Preview: <span className="font-normal text-slate-500">{activePreviewDoc.name}</span>
                </h3>
              </div>
              <button 
                onClick={() => setActivePreviewDoc(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Close Preview
              </button>
            </div>
            
            <div className="w-full h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center relative">
              {isPDF(activePreviewDoc.url) ? (
                <iframe 
                  src={activePreviewDoc.url}
                  className="w-full h-full border-none"
                  title="Document PDF Preview"
                />
              ) : (
                <img 
                  src={activePreviewDoc.url} 
                  alt={activePreviewDoc.name} 
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>File URL: <a href={activePreviewDoc.url} target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold break-all hover:text-blue-800">{activePreviewDoc.url}</a></span>
              <a 
                href={activePreviewDoc.url} 
                download
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-950 text-white rounded-xl font-bold flex items-center gap-1.5 hover:bg-slate-800 active:scale-95 transition"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF / Image
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
