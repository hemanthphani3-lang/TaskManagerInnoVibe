"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getOnboardingStatus, saveOnboardingProfile } from "@/app/actions/onboarding"
import { calculateCompletionPercentage } from "@/lib/onboarding-utils"
import { toast, Toaster } from "sonner"
import { 
  User, 
  MapPin, 
  Briefcase, 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  LogOut, 
  Loader2, 
  AlertCircle, 
  ShieldAlert, 
  Award 
} from "lucide-react"

// Types
type RoleType = 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<RoleType>('EMPLOYEE')
  const [userId, setUserId] = useState<string>("")
  const [step, setStep] = useState<number>(1)
  const [progress, setProgress] = useState<number>(0)
  const [isFullyCompleted, setIsFullyCompleted] = useState<boolean>(false)
  const [alreadyOnboarded, setAlreadyOnboarded] = useState<boolean>(false)

  // Form Fields
  const [formData, setFormData] = useState<Record<string, any>>({
    // Common profile fields
    full_name: "",
    employee_name: "",
    email: "",
    employee_email: "",
    phone_number: "",
    dob: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    pin_code: "",
    emergency_contact: { name: "", phone: "" },
    joining_date: new Date().toISOString().split('T')[0],
    marital_status: "",
    blood_group: "",
    languages_known: "",
    linkedin: "",
    experience: "",
    education: "",
    resume: "",
    father_name: "",
    mother_name: "",
    biography: "",
    alternate_phone: "",
    uploaded_documents: [],

    // Admin-specific
    organization_role: "",
    access_authority_level: "",
    office_location: "",
    administrative_responsibility: "",

    // Department Head-specific
    department_managed: "",
    team_size: 0,
    leadership_role: "",
    managerial_level: "",
    reporting_structure: "",

    // Employee-specific
    designation: "",
    reporting_manager: "",
    skills: "",
    employment_type: "",
    work_mode: ""
  })

  // Load existing profile status
  useEffect(() => {
    async function loadProfile() {
      const res = await getOnboardingStatus()
      if (res.success && res.role && res.profile) {
        setRole(res.role as RoleType)
        setUserId(res.profile.id)
        setAlreadyOnboarded(!!res.profile.onboarding_completed)
        
        // Merge fetched profile fields into draft form state
        setFormData(prev => {
          const merged = { ...prev, ...res.profile }
          // Handle emergency contact fallback
          if (!res.profile.emergency_contact || typeof res.profile.emergency_contact !== 'object') {
            merged.emergency_contact = { name: "", phone: "" }
          }
          // Handle uploaded docs fallback
          if (!Array.isArray(res.profile.uploaded_documents)) {
            merged.uploaded_documents = []
          }
          return merged
        })
      } else {
        toast.error("Failed to load your profile. Please log in again.")
        router.push("/login")
      }
      setLoading(false)
    }
    loadProfile()
  }, [router])

  // Recalculate completion score when formData changes
  useEffect(() => {
    const calc = calculateCompletionPercentage(role, formData)
    setProgress(calc.score)
    setIsFullyCompleted(calc.score === 100)
  }, [formData, role])

  // Auto-scroll and auto-step on load if we have missing fields
  useEffect(() => {
    if (loading) return

    const timer = setTimeout(() => {
      const calc = calculateCompletionPercentage(role, formData)
      if (calc.score === 100) return

      const completed = calc.completedMandatoryFields

      // Let's check step 1 fields
      const step1Fields = ['name', 'email', 'phone_number', 'dob', 'gender']
      const hasStep1Missing = step1Fields.some(f => !completed.includes(f))
      if (hasStep1Missing) {
        setStep(1)
        scrollToFirstEmpty()
        return
      }

      // Step 2 fields
      const hasStep2Missing = !completed.includes(role === 'ADMIN' ? 'organization_role' : role === 'DEPARTMENT' ? 'department_managed' : 'designation') ||
                              !completed.includes(role === 'ADMIN' ? 'office_location' : role === 'DEPARTMENT' ? 'managerial_level' : 'reporting_manager')
      if (hasStep2Missing) {
        setStep(2)
        scrollToFirstEmpty()
        return
      }

      // Step 3 fields
      const step3Fields = ['address', 'city', 'state', 'pin_code', 'emergency_contact']
      const hasStep3Missing = step3Fields.some(f => !completed.includes(f))
      if (hasStep3Missing) {
        setStep(3)
        scrollToFirstEmpty()
        return
      }

      // Step 4 fields
      const hasStep4Missing = !completed.includes('aadhaar_number') || !completed.includes('pan_number') || !formData.uploaded_documents?.find((d: any) => d.type === 'aadhaar') || !formData.uploaded_documents?.find((d: any) => d.type === 'pan')
      if (hasStep4Missing) {
        setStep(4)
        scrollToFirstEmpty()
        return
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [loading])

  const scrollToFirstEmpty = () => {
    setTimeout(() => {
      // Find first empty input or red border or required empty field
      const firstEmpty = document.querySelector('form input[required]:placeholder-shown, form select[required]:placeholder-shown, form textarea[required]:placeholder-shown, .border-red-500, label span.text-red-400')
      if (firstEmpty) {
        firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (firstEmpty instanceof HTMLInputElement || firstEmpty instanceof HTMLSelectElement || firstEmpty instanceof HTMLTextAreaElement) {
          firstEmpty.focus({ preventScroll: true })
        }
      } else {
        window.scrollTo({ top: 350, behavior: 'smooth' })
      }
    }, 200)
  }

  const isFieldMissing = (fieldName: string, isNested = false, nestedParent = '') => {
    const calc = calculateCompletionPercentage(role, formData)
    const completed = calc.completedMandatoryFields

    if (isNested && nestedParent === 'emergency_contact') {
      const contact = formData.emergency_contact
      return !contact?.name || !contact?.phone
    }
    
    if (fieldName === 'uploaded_aadhaar') {
      return !formData.uploaded_documents?.find((d: any) => d.type === 'aadhaar')
    }
    if (fieldName === 'uploaded_pan') {
      return !formData.uploaded_documents?.find((d: any) => d.type === 'pan')
    }

    let checkKey = fieldName
    if (fieldName === 'full_name' || fieldName === 'employee_name') {
      checkKey = 'name'
    } else if (fieldName === 'email' || fieldName === 'employee_email') {
      checkKey = 'email'
    }
    
    return !completed.includes(checkKey)
  }

  const getInputClassName = (fieldName: string, isNested = false, nestedParent = '') => {
    const missing = isFieldMissing(fieldName, isNested, nestedParent)
    const baseClass = "w-full bg-slate-950 border rounded-xl px-4 py-3 text-sm outline-none transition text-white placeholder-slate-600 focus:ring-1"
    
    if (missing) {
      return `${baseClass} border-red-500/50 hover:border-red-500/70 focus:border-red-500 focus:ring-red-500/20 shadow-sm shadow-red-500/5`
    }
    return `${baseClass} border-slate-800 focus:border-[#0066FF] focus:ring-[#0066FF]`
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedFieldChange = (parent: string, child: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: value
      }
    }))
  }

  // Handle document uploads direct to Supabase storage bucket
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Limit to 20MB
    const limit = 20 * 1024 * 1024
    if (file.size > limit) {
      toast.error("File size exceeds 20MB limit.")
      return
    }

    setUploadingField(fileType)
    setUploadProgress(10)

    try {
      const fileExt = file.name.split('.').pop()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, "_")
      const filePath = `${userId}/${fileType}_${Date.now()}.${fileExt}`

      setUploadProgress(40)
      const { error: uploadError } = await supabase.storage
        .from('onboarding-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      setUploadProgress(80)
      const { data: { publicUrl } } = supabase.storage
        .from('onboarding-documents')
        .getPublicUrl(filePath)

      setUploadProgress(100)

      // Add to uploaded_documents state
      const docObj = {
        id: fileType + "_" + Date.now(),
        name: file.name,
        type: fileType,
        url: publicUrl,
        uploadedAt: new Date().toISOString()
      }

      setFormData(prev => {
        const docs = [...(prev.uploaded_documents || [])]
        // Remove prior doc of same type to avoid duplicates
        const filteredDocs = docs.filter(d => d.type !== fileType)
        filteredDocs.push(docObj)

        const nextState: Record<string, any> = {
          ...prev,
          uploaded_documents: filteredDocs
        }
        if (fileType === 'resume') {
          nextState.resume = publicUrl
        }
        return nextState
      })

      toast.success(`Successfully uploaded ${file.name}!`)
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to upload file: ${err.message || String(err)}`)
    } finally {
      setTimeout(() => {
        setUploadingField(null)
        setUploadProgress(0)
      }, 500)
    }
  }

  // Handle Autosave Draft
  const saveDraft = async (notify = true) => {
    setSaving(true)
    
    // Ensure names and emails align based on role
    const sanitizedData = { ...formData }
    if (role === 'EMPLOYEE') {
      sanitizedData.employee_name = sanitizedData.employee_name || sanitizedData.full_name
      sanitizedData.employee_email = sanitizedData.employee_email || sanitizedData.email
    } else {
      sanitizedData.full_name = sanitizedData.full_name || sanitizedData.employee_name
      sanitizedData.email = sanitizedData.email || sanitizedData.employee_email
    }

    const res = await saveOnboardingProfile({
      role,
      formData: sanitizedData,
      isSubmit: false
    })

    setSaving(false)
    if (res.success) {
      if (notify) toast.success("Draft saved successfully!")
    } else {
      if (notify) toast.error(res.error || "Failed to save draft.")
    }
  }

  // Handle final Onboarding Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (progress < 70) {
      toast.error(`You have completed ${progress}% of your profile. At least 70% (mandatory fields) is required to unlock full access.`)
      return
    }

    setSaving(true)
    const sanitizedData = { ...formData }
    if (role === 'EMPLOYEE') {
      sanitizedData.employee_name = sanitizedData.employee_name || sanitizedData.full_name
      sanitizedData.employee_email = sanitizedData.employee_email || sanitizedData.email
    } else {
      sanitizedData.full_name = sanitizedData.full_name || sanitizedData.employee_name
      sanitizedData.email = sanitizedData.email || sanitizedData.employee_email
    }

    const res = await saveOnboardingProfile({
      role,
      formData: sanitizedData,
      isSubmit: true
    })

    setSaving(false)
    if (res.success) {
      if (alreadyOnboarded) {
        toast.success("Profile details updated successfully!")
        setTimeout(() => {
          if (role === 'ADMIN') window.location.href = "/admin/dashboard"
          else if (role === 'DEPARTMENT') window.location.href = "/department/dashboard"
          else {
            try {
              sessionStorage.setItem("just_checked_in", "true")
            } catch (e) {}
            window.location.href = "/employee/dashboard"
          }
        }, 1000)
      } else {
        toast.success("Profile Onboarding Complete! Welcome to InnoVibe TMS.")
        // Hard redirect to clear session states
        if (role === 'ADMIN') window.location.href = "/admin/dashboard"
        else if (role === 'DEPARTMENT') window.location.href = "/department/dashboard"
        else window.location.href = "/employee/identity-check"
      }
    } else {
      toast.error(res.error || "Failed to complete onboarding.")
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  // Step Navigation with Auto-Save
  const nextStep = () => {
    saveDraft(false)
    setStep(prev => Math.min(4, prev + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prevStep = () => {
    saveDraft(false)
    setStep(prev => Math.max(1, prev - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center flex-col">
        <Loader2 className="w-12 h-12 text-[#0066FF] animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wide">Loading secure onboarding center...</p>
      </div>
    )
  }

  // Set colors dynamically based on percentage
  const getProgressColor = () => {
    if (progress < 40) return 'from-red-500 to-orange-500 shadow-red-500/20'
    if (progress < 70) return 'from-amber-500 to-yellow-500 shadow-yellow-500/20'
    return 'from-emerald-500 to-cyan-500 shadow-emerald-500/20'
  }

  const getPercentageTextColor = () => {
    if (progress < 40) return 'text-red-400'
    if (progress < 70) return 'text-yellow-400'
    return 'text-emerald-400'
  }

  return (
    <div className="min-h-screen bg-[#0A1128] text-white selection:bg-[#0066FF] selection:text-white pb-20 w-full overflow-x-hidden">
      <Toaster position="top-right" theme="dark" />
      
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#0066FF]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00D4FF]/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center w-full">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#00D4FF] flex items-center justify-center font-bold text-sm sm:text-lg text-white shadow-lg shadow-[#0066FF]/35 shrink-0">
            IV
          </div>
          <div className="shrink-0">
            <h1 className="text-sm sm:text-base font-bold tracking-wide">InnoVibe TMS</h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-bold">Onboarding Center</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {alreadyOnboarded && (
            <button 
              type="button"
              onClick={() => {
                if (role === 'ADMIN') router.push('/admin/dashboard')
                else if (role === 'DEPARTMENT') router.push('/department/dashboard')
                else {
                  try {
                    sessionStorage.setItem("just_checked_in", "true")
                  } catch (e) {}
                  router.push('/employee/dashboard')
                }
              }}
              className="px-2.5 sm:px-4 py-2 text-xs font-bold rounded-lg bg-emerald-950/40 text-emerald-400 hover:bg-emerald-950/70 border border-emerald-900/50 transition flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
          )}

          <button 
            onClick={() => saveDraft(true)}
            disabled={saving}
            className="px-2.5 sm:px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 transition text-slate-300 border border-slate-700 flex items-center gap-1.5 shrink-0"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Save</span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-950/30 text-red-400 hover:bg-red-950/60 transition border border-red-900/40 flex items-center gap-1.5 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Profile Completion Panel */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-6">
            
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-[#0066FF]/10 rounded-2xl border border-[#0066FF]/20 text-[#0066FF]">
                {role === 'ADMIN' ? <User className="w-6 h-6" /> : role === 'DEPARTMENT' ? <Award className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Logged In Account</span>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {role === 'ADMIN' ? 'Administrator' : role === 'DEPARTMENT' ? 'Department Head' : 'Employee'} Profile Setup
                  <span className="text-[10px] px-2 py-0.5 bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/30 font-bold rounded-full uppercase">
                    {role}
                  </span>
                </h2>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 md:justify-end">
                <span className="text-slate-400 text-xs font-semibold">Profile Completion:</span>
                <span className={`text-xl font-black ${getPercentageTextColor()}`}>
                  {progress}%
                </span>
                {isFullyCompleted && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold shadow-md shadow-amber-500/5 animate-pulse">
                    <Award className="w-3 h-3" /> Fully Completed
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Unlock Portal at 70% (Mandatory Fields)</p>
            </div>

          </div>

          {/* Animated Progress Bar */}
          <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-500 ease-out`}
              style={{ width: `${progress}%` }}
            />
            {/* Threshold target line */}
            <div className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-red-400/80 z-10" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span>0% Starts</span>
            <span className="text-red-400 font-bold">70% Required Threshold</span>
            <span>100% Full Completion</span>
          </div>
        </section>

        {/* Form Stepper Nav */}
        <nav className="flex justify-between items-center mb-8 px-4">
          <div className="flex items-center gap-4 w-full">
            {[
              { num: 1, label: "Personal", icon: User },
              { num: 2, label: "Role Details", icon: Briefcase },
              { num: 3, label: "Address & Contact", icon: MapPin },
              { num: 4, label: "Documents", icon: FileText }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1 last:flex-initial">
                <button
                  type="button"
                  onClick={() => {
                    saveDraft(false)
                    setStep(s.num)
                  }}
                  className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all ${
                    step === s.num
                      ? 'bg-gradient-to-tr from-[#0066FF] to-[#00D4FF] border-[#0066FF] text-white shadow-lg shadow-[#0066FF]/20 scale-105'
                      : step > s.num
                      ? 'bg-slate-900 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-emerald-500/20' : 'bg-slate-800'}`} />}
              </div>
            ))}
          </div>
        </nav>

        {/* Stepper Form Content */}
        <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-sm shadow-xl space-y-8">
          
          {/* STEP 1: PERSONAL DETAILS */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Personal Profile Details</h3>
                <p className="text-xs text-slate-400">Provide basic identification parameters and bio.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                 {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Full Legal Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full legal name"
                    value={role === 'EMPLOYEE' ? formData.employee_name : formData.full_name}
                    onChange={(e) => handleFieldChange(role === 'EMPLOYEE' ? 'employee_name' : 'full_name', e.target.value)}
                    className={getInputClassName(role === 'EMPLOYEE' ? 'employee_name' : 'full_name')}
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={role === 'EMPLOYEE' ? formData.employee_email : formData.email}
                    onChange={(e) => handleFieldChange(role === 'EMPLOYEE' ? 'employee_email' : 'email', e.target.value)}
                    className={getInputClassName(role === 'EMPLOYEE' ? 'employee_email' : 'email')}
                  />
                </div>

                {/* Mobile Phone Number */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10 digit mobile number"
                    maxLength={10}
                    value={formData.phone_number || ""}
                    onChange={(e) => handleFieldChange('phone_number', e.target.value)}
                    className={getInputClassName('phone_number')}
                  />
                </div>

                {/* Alternate Phone Number */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Alternate Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Secondary contact number"
                    maxLength={10}
                    value={formData.alternate_phone || ""}
                    onChange={(e) => handleFieldChange('alternate_phone', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white placeholder-slate-600"
                  />
                </div>

                {/* Father's Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Father&apos;s Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter father's full name"
                    value={formData.father_name || ""}
                    onChange={(e) => handleFieldChange('father_name', e.target.value)}
                    className={getInputClassName('father_name')}
                  />
                </div>

                {/* Mother's Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Mother&apos;s Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter mother's full name"
                    value={formData.mother_name || ""}
                    onChange={(e) => handleFieldChange('mother_name', e.target.value)}
                    className={getInputClassName('mother_name')}
                  />
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Date of Birth <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob || ""}
                    onChange={(e) => handleFieldChange('dob', e.target.value)}
                    className={getInputClassName('dob')}
                  />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Gender <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.gender || ""}
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
                    className={getInputClassName('gender')}
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* Marital Status */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Marital Status (Optional)
                  </label>
                  <select
                    value={formData.marital_status || ""}
                    onChange={(e) => handleFieldChange('marital_status', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white"
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                {/* Blood Group */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Blood Group (Optional)
                  </label>
                  <select
                    value={formData.blood_group || ""}
                    onChange={(e) => handleFieldChange('blood_group', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

              </div>

              {/* Professional Biography */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Brief Professional Biography (Optional)
                </label>
                <textarea
                  placeholder="Share a short summary about your background and experience..."
                  value={formData.biography || ""}
                  onChange={(e) => handleFieldChange('biography', e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white placeholder-slate-700 resize-none"
                />
              </div>

            </div>
          )}

          {/* STEP 2: PROFESSIONAL & ROLE-SPECIFIC DETAILS */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Professional & Role Information</h3>
                <p className="text-xs text-slate-400">These fields are dynamically configured based on your corporate role ({role}).</p>
              </div>

              {/* ADMIN ROLE FIELDS */}
              {role === 'ADMIN' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      Organization Role / Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chief Executive, HR Director"
                      value={formData.organization_role || ""}
                      onChange={(e) => handleFieldChange('organization_role', e.target.value)}
                      className={getInputClassName('organization_role')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      Office Base Location <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hyderabad H.O., Bangalore Office"
                      value={formData.office_location || ""}
                      onChange={(e) => handleFieldChange('office_location', e.target.value)}
                      className={getInputClassName('office_location')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Administrative Scope / Access Authority (Optional)
                    </label>
                    <select
                      value={formData.access_authority_level || ""}
                      onChange={(e) => handleFieldChange('access_authority_level', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white"
                    >
                      <option value="">Select Scope Level</option>
                      <option value="Super Admin">Super Admin</option>
                      <option value="Regional Admin">Regional Admin</option>
                      <option value="Operations Admin">Operations Admin</option>
                      <option value="HR Admin">HR Admin</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Primary Administrative Responsibility (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Core System Ops, Finance Audits"
                      value={formData.administrative_responsibility || ""}
                      onChange={(e) => handleFieldChange('administrative_responsibility', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white placeholder-slate-650"
                    />
                  </div>
                </div>
              )}

              {/* DEPARTMENT HEAD ROLE FIELDS */}
              {role === 'DEPARTMENT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      Department Managed <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engineering, Sales, Human Resources"
                      value={formData.department_managed || ""}
                      onChange={(e) => handleFieldChange('department_managed', e.target.value)}
                      className={getInputClassName('department_managed')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      Managerial Level <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      value={formData.managerial_level || ""}
                      onChange={(e) => handleFieldChange('managerial_level', e.target.value)}
                      className={getInputClassName('managerial_level')}
                    >
                      <option value="" disabled>Select Management Tier</option>
                      <option value="Director">Director</option>
                      <option value="VP">VP</option>
                      <option value="General Manager">General Manager</option>
                      <option value="Team Head">Team Head</option>
                      <option value="Supervisor">Supervisor</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Leadership Role Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Technologist, Growth Enabler"
                      value={formData.leadership_role || ""}
                      onChange={(e) => handleFieldChange('leadership_role', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white placeholder-slate-650"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Active Managed Team Size (Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.team_size || 0}
                      onChange={(e) => handleFieldChange('team_size', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Reporting / Accountability Structure Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Reports directly to HR VP, oversees 4 team leads"
                      value={formData.reporting_structure || ""}
                      onChange={(e) => handleFieldChange('reporting_structure', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white placeholder-slate-650"
                    />
                  </div>
                </div>
              )}

              {/* EMPLOYEE ROLE FIELDS */}
              {role === 'EMPLOYEE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      Professional Designation <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Software Engineer, QA Tester"
                      value={formData.designation || ""}
                      onChange={(e) => handleFieldChange('designation', e.target.value)}
                      className={getInputClassName('designation')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      Reporting Manager / Authority <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Doe, Tech Lead"
                      value={formData.reporting_manager || ""}
                      onChange={(e) => handleFieldChange('reporting_manager', e.target.value)}
                      className={getInputClassName('reporting_manager')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Employment Type (Optional)
                    </label>
                    <select
                      value={formData.employment_type || ""}
                      onChange={(e) => handleFieldChange('employment_type', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white"
                    >
                      <option value="">Select Employment Type</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Work Mode Setup (Optional)
                    </label>
                    <select
                      value={formData.work_mode || ""}
                      onChange={(e) => handleFieldChange('work_mode', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white"
                    >
                      <option value="">Select Work Setup</option>
                      <option value="Office-bound">Office-bound</option>
                      <option value="Remote Work">Remote Work</option>
                      <option value="Hybrid Model">Hybrid Model</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Core Professional Skills (Comma separated, Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. React, Next.js, Node.js, SQL, TypeSafety"
                      value={formData.skills || ""}
                      onChange={(e) => handleFieldChange('skills', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white placeholder-slate-650"
                    />
                  </div>
                </div>
              )}

              {/* General Work fields */}
              <div className="border-t border-slate-800/80 pt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Prior Work Experience Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5+ years at Acme Inc as Sr Developer"
                    value={formData.experience || ""}
                    onChange={(e) => handleFieldChange('experience', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white placeholder-slate-650"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Highest Level of Education (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Master of Computer Applications (MCA)"
                    value={formData.education || ""}
                    onChange={(e) => handleFieldChange('education', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white placeholder-slate-650"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">
                    LinkedIn URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.linkedin || ""}
                    onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-white placeholder-slate-650"
                  />
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: ADDRESS & EMERGENCY CONTACTS */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Residential Address & Contacts</h3>
                <p className="text-xs text-slate-400">Please supply residential coordinates and an emergency anchor contact.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Street Address */}
                <div className="space-y-2 md:col-span-3">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Street Address / House No <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Flat/House No., Street, Locality"
                    value={formData.address || ""}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    className={getInputClassName('address')}
                  />
                </div>

                {/* City */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter city"
                    value={formData.city || ""}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className={getInputClassName('city')}
                  />
                </div>

                {/* State */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    State <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter state"
                    value={formData.state || ""}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    className={getInputClassName('state')}
                  />
                </div>

                {/* Pincode */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Postal / Pin Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="6-digit postal code"
                    maxLength={6}
                    value={formData.pin_code || ""}
                    onChange={(e) => handleFieldChange('pin_code', e.target.value)}
                    className={getInputClassName('pin_code')}
                  />
                </div>

              </div>

              {/* Emergency Contact Group */}
              <div className="border-t border-slate-800/80 pt-6">
                <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Primary Emergency Contact Details (Mandatory)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      Contact Person Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe Sr."
                      value={formData.emergency_contact?.name || ""}
                      onChange={(e) => handleNestedFieldChange('emergency_contact', 'name', e.target.value)}
                      className={getInputClassName('name', true, 'emergency_contact')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      Contact Person Mobile Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      value={formData.emergency_contact?.phone || ""}
                      onChange={(e) => handleNestedFieldChange('emergency_contact', 'phone', e.target.value)}
                      className={getInputClassName('phone', true, 'emergency_contact')}
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 4: VERIFICATION DOCUMENTS & GOVT IDS */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Government ID Details & Document Uploads</h3>
                <p className="text-xs text-slate-400">Validate official identification markers and submit digital copies.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Aadhaar Number */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Aadhaar Card Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="12 digit Aadhaar number"
                    value={formData.aadhaar_number || ""}
                    onChange={(e) => handleFieldChange('aadhaar_number', e.target.value.replace(/\D/g, ''))}
                    className={getInputClassName('aadhaar_number')}
                  />
                  {formData.aadhaar_number && formData.aadhaar_number.length !== 12 && (
                    <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Must be exactly 12 digits
                    </span>
                  )}
                </div>

                {/* PAN Number */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    Permanent Account Number (PAN) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="10-character PAN (e.g. ABCDE1234F)"
                    value={formData.pan_number || ""}
                    onChange={(e) => handleFieldChange('pan_number', e.target.value.toUpperCase())}
                    className={getInputClassName('pan_number')}
                  />
                  {formData.pan_number && !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(formData.pan_number) && (
                    <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Must match standard format (5 Letters, 4 Digits, 1 Letter)
                    </span>
                  )}
                </div>

              </div>

              {/* Upload sections */}
              <div className="border-t border-slate-800/80 pt-6">
                <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[#0066FF]" /> Verified Document Attachments
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Upload 1: Aadhaar Card */}
                  <div className={`p-5 rounded-2xl border transition ${
                    isFieldMissing('uploaded_aadhaar')
                      ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/35'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}>
                    <span className="text-xs font-bold text-slate-300 block mb-2">Aadhaar Card copy (Mandatory upload, PDF/Image)</span>
                    
                    {formData.uploaded_documents?.find((d: any) => d.type === 'aadhaar') ? (
                      <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-900/40 p-3 rounded-xl text-emerald-400">
                        <span className="text-xs truncate max-w-[200px] font-semibold">✓ Aadhaar Card uploaded</span>
                        <a 
                          href={formData.uploaded_documents.find((d: any) => d.type === 'aadhaar').url}
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] underline font-bold text-[#00D4FF] hover:text-white"
                        >
                          View File
                        </a>
                      </div>
                    ) : null}

                    <div className="mt-3 relative">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'aadhaar')}
                        className="hidden" 
                        id="upload-aadhaar"
                      />
                      <label 
                        htmlFor="upload-aadhaar"
                        className="w-full py-2.5 rounded-xl border border-dashed border-slate-800 hover:border-[#0066FF] hover:bg-slate-900/40 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                      >
                        {uploadingField === 'aadhaar' ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#0066FF]" />
                            <span>Uploading ({uploadProgress}%)</span>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4 text-slate-500" /> Choose Aadhaar Copy
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Upload 2: PAN Card */}
                  <div className={`p-5 rounded-2xl border transition ${
                    isFieldMissing('uploaded_pan')
                      ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/35'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}>
                    <span className="text-xs font-bold text-slate-300 block mb-2">PAN Card copy (Mandatory upload, PDF/Image)</span>
                    
                    {formData.uploaded_documents?.find((d: any) => d.type === 'pan') ? (
                      <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-900/40 p-3 rounded-xl text-emerald-400">
                        <span className="text-xs truncate max-w-[200px] font-semibold">✓ PAN Card uploaded</span>
                        <a 
                          href={formData.uploaded_documents.find((d: any) => d.type === 'pan').url}
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] underline font-bold text-[#00D4FF] hover:text-white"
                        >
                          View File
                        </a>
                      </div>
                    ) : null}

                    <div className="mt-3 relative">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'pan')}
                        className="hidden" 
                        id="upload-pan"
                      />
                      <label 
                        htmlFor="upload-pan"
                        className="w-full py-2.5 rounded-xl border border-dashed border-slate-800 hover:border-[#0066FF] hover:bg-slate-900/40 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                      >
                        {uploadingField === 'pan' ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#0066FF]" />
                            <span>Uploading ({uploadProgress}%)</span>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4 text-slate-500" /> Choose PAN Copy
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Upload 3: Resume */}
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition">
                    <span className="text-xs font-bold text-slate-300 block mb-2">Resume / CV (Optional, PDF only)</span>
                    
                    {formData.uploaded_documents?.find((d: any) => d.type === 'resume') ? (
                      <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-900/40 p-3 rounded-xl text-emerald-400">
                        <span className="text-xs truncate max-w-[200px] font-semibold">✓ Resume uploaded</span>
                        <a 
                          href={formData.uploaded_documents.find((d: any) => d.type === 'resume').url}
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] underline font-bold text-[#00D4FF] hover:text-white"
                        >
                          View File
                        </a>
                      </div>
                    ) : null}

                    <div className="mt-3 relative">
                      <input 
                        type="file" 
                        accept=".pdf"
                        onChange={(e) => handleFileUpload(e, 'resume')}
                        className="hidden" 
                        id="upload-resume"
                      />
                      <label 
                        htmlFor="upload-resume"
                        className="w-full py-2.5 rounded-xl border border-dashed border-slate-800 hover:border-[#0066FF] hover:bg-slate-900/40 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                      >
                        {uploadingField === 'resume' ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#0066FF]" />
                            <span>Uploading ({uploadProgress}%)</span>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4 text-slate-500" /> Choose Resume PDF
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Upload 4: Certifications */}
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition">
                    <span className="text-xs font-bold text-slate-300 block mb-2">Degree Certificates (Optional, PDF/Image)</span>
                    
                    {formData.uploaded_documents?.find((d: any) => d.type === 'certificate') ? (
                      <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-900/40 p-3 rounded-xl text-emerald-400">
                        <span className="text-xs truncate max-w-[200px] font-semibold">✓ Certificate uploaded</span>
                        <a 
                          href={formData.uploaded_documents.find((d: any) => d.type === 'certificate').url}
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] underline font-bold text-[#00D4FF] hover:text-white"
                        >
                          View File
                        </a>
                      </div>
                    ) : null}

                    <div className="mt-3 relative">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'certificate')}
                        className="hidden" 
                        id="upload-certificate"
                      />
                      <label 
                        htmlFor="upload-certificate"
                        className="w-full py-2.5 rounded-xl border border-dashed border-slate-800 hover:border-[#0066FF] hover:bg-slate-900/40 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                      >
                        {uploadingField === 'certificate' ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#0066FF]" />
                            <span>Uploading ({uploadProgress}%)</span>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4 text-slate-500" /> Choose Certificate
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* Stepper Footer Action Controls */}
          <footer className="border-t border-slate-850 pt-6 flex justify-between items-center">
            <button
              type="button"
              disabled={step === 1}
              onClick={prevStep}
              className="px-5 py-3 text-xs font-bold rounded-xl bg-slate-950 hover:bg-slate-900 active:scale-95 transition text-slate-400 border border-slate-800 flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ArrowLeft className="w-4 h-4" /> Previous Step
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-5 py-3 text-xs font-bold rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#00D4FF] hover:brightness-110 active:scale-95 transition text-white shadow-lg shadow-[#0066FF]/20 flex items-center gap-2"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={progress < 70 || saving}
                className="px-6 py-3.5 text-xs font-extrabold rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 hover:brightness-110 active:scale-95 transition text-white shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {alreadyOnboarded ? "Updating Profile..." : "Completing Onboarding..."}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> {alreadyOnboarded ? "Update Profile Details" : "Finalize & Submit Profile"}
                  </>
                )}
              </button>
            )}
          </footer>

        </form>

        {/* Warning card when progress < 70% */}
        {progress < 70 && (
          <div className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <div>
              <span className="text-xs font-bold block mb-1">Portal Access Locked</span>
              <p className="text-[11px] leading-relaxed text-amber-400/90">
                You must complete all mandatory fields across Steps 1-4 to reach at least <strong className="text-white">70%</strong> completion. 
                Currently you are at <strong className="text-white">{progress}%</strong>. Completing Aadhaar, PAN, and emergency contacts will boost your progress.
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
