/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Award,
  Lock
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
          let merged = { ...prev, ...res.profile }
          // Detect saved draft and load latest saved values (auto restore)
          if (res.profile.onboarding_draft && typeof res.profile.onboarding_draft === 'object') {
            merged = { ...merged, ...res.profile.onboarding_draft }
          }
          // Handle emergency contact fallback
          if (!merged.emergency_contact || typeof merged.emergency_contact !== 'object') {
            merged.emergency_contact = { name: "", phone: "" }
          }
          // Handle uploaded docs fallback
          if (!Array.isArray(merged.uploaded_documents)) {
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

      // Let's check step 1 fields (including profile_photo)
      const step1Fields = ['name', 'email', 'phone_number', 'dob', 'gender', 'profile_photo']
      const hasStep1Missing = step1Fields.some(f => !completed.includes(f))
      if (hasStep1Missing) {
        setStep(1)
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
    }, 600)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    
    if (fieldName === 'uploaded_aadhaar' || fieldName === 'uploaded_pan' || fieldName === 'pan_number' || fieldName === 'aadhaar_number') {
      return false
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
    const baseClass = "w-full bg-white dark:bg-slate-950 border rounded-xl px-4 py-3 text-sm outline-none transition text-slate-900 dark:text-white placeholder-slate-450 dark:placeholder-slate-650 focus:ring-1"
    
    if (missing) {
      return `${baseClass} border-red-500/50 hover:border-red-500/70 focus:border-red-500 focus:ring-red-500/20 shadow-sm shadow-red-500/5`
    }
    return `${baseClass} border-slate-200 dark:border-slate-800 focus:border-[#0066FF] focus:ring-[#0066FF]`
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
              sessionStorage.setItem("dashboard_verified", "true")
            } catch (e) {}
            window.location.href = "/employee/dashboard"
          }
        }, 1000)
      } else {
        toast.success("Profile Onboarding Complete! Welcome to InnoVibe TMS.")
        // Hard redirect to clear session states
        if (role === 'ADMIN') window.location.href = "/admin/dashboard"
        else if (role === 'DEPARTMENT') window.location.href = "/department/dashboard"
        else {
          try {
            sessionStorage.setItem("just_checked_in", "true")
            sessionStorage.setItem("dashboard_verified", "true")
          } catch (e) {}
          window.location.href = "/employee/dashboard"
        }
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center flex-col">
        <Loader2 className="w-12 h-12 text-[#0066FF] animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold tracking-wide">Loading secure onboarding center...</p>
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
    if (progress < 40) return 'text-red-500 dark:text-red-400'
    if (progress < 70) return 'text-yellow-550 dark:text-yellow-400'
    return 'text-emerald-600 dark:text-emerald-400'
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A1128] text-slate-800 dark:text-white selection:bg-[#0066FF] selection:text-white pb-20 w-full overflow-x-hidden">
      <Toaster position="top-right" theme="dark" />
      
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#0066FF]/5 dark:bg-[#0066FF]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00D4FF]/3 dark:bg-[#00D4FF]/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center w-full text-slate-900 dark:text-white">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-linear-to-tr from-[#0066FF] to-[#00D4FF] flex items-center justify-center font-bold text-sm sm:text-lg text-white shadow-lg shadow-[#0066FF]/35 shrink-0">
            IV
          </div>
          <div className="shrink-0">
            <h1 className="text-sm sm:text-base font-bold tracking-wide">InnoVibe TMS</h1>
            <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Onboarding Center</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Go To Dashboard button */}
          <div className="relative group">
            <button 
              type="button"
              disabled={saving}
              onClick={(e) => handleSubmit(e)}
              className="px-2.5 sm:px-4 py-2 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 shrink-0 active:scale-95 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 hover:dark:bg-emerald-950/70 border-emerald-250 dark:border-emerald-900/50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Go To Dashboard'}</span>
            </button>
          </div>

          <button 
            type="button"
            onClick={() => saveDraft(true)}
            disabled={saving}
            className="px-2.5 sm:px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 hover:dark:bg-slate-700 active:scale-95 transition text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shrink-0"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span className="max-sm:hidden">Save Draft</span>
            <span className="sm:hidden">Save</span>
          </button>
          
          <button 
            type="button"
            onClick={handleLogout}
            className="px-2.5 sm:px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 hover:dark:bg-red-950/60 transition border border-red-200 dark:border-red-900/40 flex items-center gap-1.5 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="max-sm:hidden">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Profile Completion Panel */}
        <section className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-sm dark:shadow-2xl mb-8 text-slate-800 dark:text-white">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-6">
            
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-[#0066FF]/10 rounded-2xl border border-[#0066FF]/20 text-[#0066FF]">
                {role === 'ADMIN' ? <User className="w-6 h-6" /> : role === 'DEPARTMENT' ? <Award className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Logged In Account</span>
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  {role === 'ADMIN' ? 'Administrator' : role === 'DEPARTMENT' ? 'Department Head' : 'Employee'} Profile Setup
                  <span className="text-[10px] px-2 py-0.5 bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/30 font-bold rounded-full uppercase">
                    {role}
                  </span>
                </h2>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 md:justify-end">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Profile Completion:</span>
                <span className={`text-xl font-black ${getPercentageTextColor()}`}>
                  {progress}%
                </span>
                {isFullyCompleted && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold shadow-md shadow-amber-500/5 animate-pulse">
                    <Award className="w-3 h-3" /> Fully Completed
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Animated Progress Bar */}
          <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div 
              className={`absolute top-0 left-0 h-full bg-linear-to-r ${getProgressColor()} transition-all duration-500 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="relative w-full h-5 text-[10px] text-slate-500 mt-2 px-1">
            <span className="absolute left-1">0% Starts</span>
            <span className="absolute right-1">100% Full Completion</span>
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
                      ? 'bg-linear-to-tr from-[#0066FF] to-[#00D4FF] border-[#0066FF] text-white shadow-lg shadow-[#0066FF]/20 scale-105'
                      : step > s.num
                      ? 'bg-emerald-50 dark:bg-slate-900 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="max-sm:hidden">{s.label}</span>
                </button>
                {idx < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800'}`} />}
              </div>
            ))}
          </div>
        </nav>

        {/* Stepper Form Content */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 backdrop-blur-sm shadow-sm dark:shadow-xl space-y-8">
          
          {/* STEP 1: PERSONAL DETAILS */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Personal Profile Details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Provide basic identification parameters and bio.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Profile Photo Upload */}
                <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-6 p-5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800/85">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center border-2 border-slate-200 dark:border-slate-800 flex-shrink-0">
                    {formData.profile_photo ? (
                      <img src={formData.profile_photo} alt="Profile Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-405 dark:text-slate-650" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Profile Photo <span className="text-red-400">*</span></span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Upload a high-resolution professional headshot. JPEG, PNG formats under 5MB.
                    </p>
                    <div className="relative inline-block">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error("Profile photo must be less than 5MB.")
                            return
                          }
                          setUploadingField('profile_photo')
                          const fData = new FormData()
                          fData.append("file", file)
                          fData.append("userId", userId)
                          try {
                            const uploadRes = await fetch("/api/upload-profile-photo", {
                              method: "POST",
                              body: fData
                            })
                            const uploadData = await uploadRes.json()
                            if (uploadData.error) throw new Error(uploadData.error)
                            handleFieldChange('profile_photo', uploadData.url)
                            toast.success("Profile photo uploaded successfully!")
                          } catch (err: any) {
                            toast.error(err.message || "Upload failed")
                          } finally {
                            setUploadingField(null)
                          }
                        }}
                        className="hidden" 
                        id="upload-profile-photo"
                      />
                      <label 
                        htmlFor="upload-profile-photo"
                        className="px-4 py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-850 hover:border-[#0066FF] hover:bg-slate-100 dark:hover:bg-slate-900/60 text-xs font-semibold text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-white flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                      >
                        {uploadingField === 'profile_photo' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0066FF]" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5 text-slate-500" /> Choose Profile Photo
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
                
                 {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
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
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
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
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
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
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Alternate Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Secondary contact number"
                    maxLength={10}
                    value={formData.alternate_phone || ""}
                    onChange={(e) => handleFieldChange('alternate_phone', e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  />
                </div>

                {/* Father's Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Father&apos;s Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter father's full name"
                    value={formData.father_name || ""}
                    onChange={(e) => handleFieldChange('father_name', e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  />
                </div>

                {/* Mother's Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Mother&apos;s Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter mother's full name"
                    value={formData.mother_name || ""}
                    onChange={(e) => handleFieldChange('mother_name', e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  />
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
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
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    Gender <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.gender || ""}
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
                    className={getInputClassName('gender')}
                  >
                    <option value="" disabled className="text-slate-400">Select Gender</option>
                    <option value="Male" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Male</option>
                    <option value="Female" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Female</option>
                    <option value="Other" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Other</option>
                    <option value="Prefer not to say" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Prefer not to say</option>
                  </select>
                </div>

                {/* Marital Status */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Marital Status (Optional)
                  </label>
                  <select
                    value={formData.marital_status || ""}
                    onChange={(e) => handleFieldChange('marital_status', e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white"
                  >
                    <option value="" className="text-slate-400">Select Status</option>
                    <option value="Single" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Single</option>
                    <option value="Married" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Married</option>
                    <option value="Divorced" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Divorced</option>
                    <option value="Widowed" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Widowed</option>
                  </select>
                </div>

                {/* Blood Group */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Blood Group (Optional)
                  </label>
                  <select
                    value={formData.blood_group || ""}
                    onChange={(e) => handleFieldChange('blood_group', e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white"
                  >
                    <option value="" className="text-slate-400">Select Blood Group</option>
                    <option value="A+" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">A+</option>
                    <option value="A-" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">A-</option>
                    <option value="B+" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">B+</option>
                    <option value="B-" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">B-</option>
                    <option value="O+" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">O+</option>
                    <option value="O-" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">O-</option>
                    <option value="AB+" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">AB+</option>
                    <option value="AB-" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">AB-</option>
                  </select>
                </div>

              </div>

              {/* Professional Biography */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Brief Professional Biography (Optional)
                </label>
                <textarea
                  placeholder="Share a short summary about your background and experience..."
                  value={formData.biography || ""}
                  onChange={(e) => handleFieldChange('biography', e.target.value)}
                  rows={4}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 resize-none"
                />
              </div>

            </div>
          )}

          {/* STEP 2: PROFESSIONAL & ROLE-SPECIFIC DETAILS */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Professional & Role Information</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">These fields are dynamically configured based on your corporate role ({role}).</p>
              </div>

              {/* ADMIN ROLE FIELDS */}
              {role === 'ADMIN' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Organization Role / Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Chief Executive, HR Director"
                      value={formData.organization_role || ""}
                      onChange={(e) => handleFieldChange('organization_role', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-655"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Office Base Location (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hyderabad H.O., Bangalore Office"
                      value={formData.office_location || ""}
                      onChange={(e) => handleFieldChange('office_location', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-655"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Administrative Scope / Access Authority (Optional)
                    </label>
                    <select
                      value={formData.access_authority_level || ""}
                      onChange={(e) => handleFieldChange('access_authority_level', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white"
                    >
                      <option value="" className="text-slate-400">Select Scope Level</option>
                      <option value="Super Admin" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Super Admin</option>
                      <option value="Regional Admin" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Regional Admin</option>
                      <option value="Operations Admin" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Operations Admin</option>
                      <option value="HR Admin" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">HR Admin</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Primary Administrative Responsibility (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Core System Ops, Finance Audits"
                      value={formData.administrative_responsibility || ""}
                      onChange={(e) => handleFieldChange('administrative_responsibility', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                    />
                  </div>
                </div>
              )}

              {/* DEPARTMENT HEAD ROLE FIELDS */}
              {role === 'DEPARTMENT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Department Managed (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Engineering, Sales, Human Resources"
                      value={formData.department_managed || ""}
                      onChange={(e) => handleFieldChange('department_managed', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-655"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Managerial Level (Optional)
                    </label>
                    <select
                      value={formData.managerial_level || ""}
                      onChange={(e) => handleFieldChange('managerial_level', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white"
                    >
                      <option value="" disabled className="text-slate-400">Select Management Tier</option>
                      <option value="Director" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Director</option>
                      <option value="VP" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">VP</option>
                      <option value="General Manager" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">General Manager</option>
                      <option value="Team Head" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Team Head</option>
                      <option value="Supervisor" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Supervisor</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Leadership Role Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Technologist, Growth Enabler"
                      value={formData.leadership_role || ""}
                      onChange={(e) => handleFieldChange('leadership_role', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Active Managed Team Size (Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.team_size || 0}
                      onChange={(e) => handleFieldChange('team_size', parseInt(e.target.value) || 0)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Reporting / Accountability Structure Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Reports directly to HR VP, oversees 4 team leads"
                      value={formData.reporting_structure || ""}
                      onChange={(e) => handleFieldChange('reporting_structure', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                    />
                  </div>
                </div>
              )}

              {/* EMPLOYEE ROLE FIELDS */}
              {role === 'EMPLOYEE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Professional Designation (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer, QA Tester"
                      value={formData.designation || ""}
                      onChange={(e) => handleFieldChange('designation', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-655"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Reporting Manager / Authority (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Doe, Tech Lead"
                      value={formData.reporting_manager || ""}
                      onChange={(e) => handleFieldChange('reporting_manager', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-655"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Employment Type (Optional)
                    </label>
                    <select
                      value={formData.employment_type || ""}
                      onChange={(e) => handleFieldChange('employment_type', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white"
                    >
                      <option value="" className="text-slate-400">Select Employment Type</option>
                      <option value="Full-time" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Full-time</option>
                      <option value="Part-time" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Part-time</option>
                      <option value="Contract" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Contract</option>
                      <option value="Internship" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Internship</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Work Mode Setup (Optional)
                    </label>
                    <select
                      value={formData.work_mode || ""}
                      onChange={(e) => handleFieldChange('work_mode', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white"
                    >
                      <option value="" className="text-slate-400">Select Work Setup</option>
                      <option value="Office-bound" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Office-bound</option>
                      <option value="Remote Work" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Remote Work</option>
                      <option value="Hybrid Model" className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">Hybrid Model</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Core Professional Skills (Comma separated, Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. React, Next.js, Node.js, SQL, TypeSafety"
                      value={formData.skills || ""}
                      onChange={(e) => handleFieldChange('skills', e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                    />
                  </div>
                </div>
              )}

              {/* General Work fields */}
              <div className="border-t border-slate-200 dark:border-slate-800/80 pt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Prior Work Experience Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5+ years at Acme Inc as Sr Developer"
                    value={formData.experience || ""}
                    onChange={(e) => handleFieldChange('experience', e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Highest Level of Education (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Master of Computer Applications (MCA)"
                    value={formData.education || ""}
                    onChange={(e) => handleFieldChange('education', e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    LinkedIn URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.linkedin || ""}
                    onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  />
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: ADDRESS & EMERGENCY CONTACTS */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Residential Address & Contacts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Please supply residential coordinates and an emergency anchor contact.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Street Address */}
                <div className="space-y-2 md:col-span-3">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-300 flex items-center gap-1.5">
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
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-300 flex items-center gap-1.5">
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
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-300 flex items-center gap-1.5">
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
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-300 flex items-center gap-1.5">
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
              <div className="border-t border-slate-200 dark:border-slate-800/80 pt-6">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Primary Emergency Contact Details (Mandatory)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-650 dark:text-slate-300 flex items-center gap-1.5">
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
                    <label className="text-xs font-semibold text-slate-650 dark:text-slate-300 flex items-center gap-1.5">
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Government ID Details & Document Uploads</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Validate official identification markers and submit digital copies.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Aadhaar Number */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-300">
                    Aadhaar Card Number (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="12 digit Aadhaar number"
                    value={formData.aadhaar_number || ""}
                    onChange={(e) => handleFieldChange('aadhaar_number', e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-655"
                  />
                  {formData.aadhaar_number && formData.aadhaar_number.length !== 12 && (
                    <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Must be exactly 12 digits
                    </span>
                  )}
                </div>

                {/* PAN Number */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-650 dark:text-slate-300">
                    Permanent Account Number (PAN) (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="10-character PAN (e.g. ABCDE1234F)"
                    value={formData.pan_number || ""}
                    onChange={(e) => handleFieldChange('pan_number', e.target.value.toUpperCase())}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-655"
                  />
                  {formData.pan_number && !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(formData.pan_number) && (
                    <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Must match standard format (5 Letters, 4 Digits, 1 Letter)
                    </span>
                  )}
                </div>

              </div>

              {/* Upload sections */}
              <div className="border-t border-slate-200 dark:border-slate-800/80 pt-6">
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[#0066FF]" /> Verified Document Attachments
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Upload 1: Aadhaar Card */}
                  <div className={`p-5 rounded-2xl border transition ${
                    isFieldMissing('uploaded_aadhaar')
                      ? 'bg-red-50/5 border-red-500/20 hover:border-red-500/35'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Aadhaar Card copy (Optional upload, PDF/Image)</span>
                    
                    {formData.uploaded_documents?.find((d: any) => d.type === 'aadhaar') ? (
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <span className="text-xs truncate max-w-[200px] font-semibold">✓ Aadhaar Card uploaded</span>
                        <a 
                          href={formData.uploaded_documents.find((d: any) => d.type === 'aadhaar').url}
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] underline font-bold text-[#00D4FF] hover:text-slate-800 dark:hover:text-white"
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
                        className="w-full py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-[#0066FF] hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
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
                      ? 'bg-red-50/5 border-red-500/20 hover:border-red-500/35'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">PAN Card copy (Optional upload, PDF/Image)</span>
                    
                    {formData.uploaded_documents?.find((d: any) => d.type === 'pan') ? (
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <span className="text-xs truncate max-w-[200px] font-semibold">✓ PAN Card uploaded</span>
                        <a 
                          href={formData.uploaded_documents.find((d: any) => d.type === 'pan').url}
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] underline font-bold text-[#00D4FF] hover:text-slate-800 dark:hover:text-white"
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
                        className="w-full py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-[#0066FF] hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
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
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Resume / CV (Optional, PDF only)</span>
                    
                    {formData.uploaded_documents?.find((d: any) => d.type === 'resume') ? (
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <span className="text-xs truncate max-w-[200px] font-semibold">✓ Resume uploaded</span>
                        <a 
                          href={formData.uploaded_documents.find((d: any) => d.type === 'resume').url}
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] underline font-bold text-[#00D4FF] hover:text-slate-800 dark:hover:text-white"
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
                        className="w-full py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-[#0066FF] hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
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
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Degree Certificates (Optional, PDF/Image)</span>
                    
                    {formData.uploaded_documents?.find((d: any) => d.type === 'certificate') ? (
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <span className="text-xs truncate max-w-[200px] font-semibold">✓ Certificate uploaded</span>
                        <a 
                          href={formData.uploaded_documents.find((d: any) => d.type === 'certificate').url}
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] underline font-bold text-[#00D4FF] hover:text-slate-800 dark:hover:text-white"
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
                        className="w-full py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-[#0066FF] hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
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
          <footer className="border-t border-slate-200 dark:border-slate-800 pt-6 flex justify-between items-center">
            <button
              type="button"
              disabled={step === 1}
              onClick={prevStep}
              className="px-5 py-3 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 hover:dark:bg-slate-900 active:scale-95 transition text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ArrowLeft className="w-4 h-4" /> Previous Step
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-5 py-3 text-xs font-bold rounded-xl bg-linear-to-tr from-[#0066FF] to-[#00D4FF] hover:brightness-110 active:scale-95 transition text-white shadow-lg shadow-[#0066FF]/20 flex items-center gap-2"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={progress < 70 || saving}
                className="px-6 py-3.5 text-xs font-extrabold rounded-xl bg-linear-to-tr from-emerald-500 to-cyan-500 hover:brightness-110 active:scale-95 transition text-white shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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



      </main>
    </div>
  )
}
