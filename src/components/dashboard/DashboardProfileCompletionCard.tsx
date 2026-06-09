/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { calculateCompletionPercentage } from "@/lib/onboarding-utils"
import { 
  ArrowRight, 
  Sparkles
} from "lucide-react"

interface DashboardProfileCompletionCardProps {
  role: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE'
  profile: Record<string, any>
}

export function DashboardProfileCompletionCard({ role, profile }: DashboardProfileCompletionCardProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (role === 'ADMIN') return null // Admin is exempted!

  const percentageData = calculateCompletionPercentage(role, profile)
  const progress = percentageData.score
  const isFullyCompleted = progress === 100
  const isUnlocked = progress >= 70

  // 11 Mandatory Fields mapping
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
    { key: 'emergency_contact', label: 'Emergency Contact' },
    { key: 'profile_photo', label: 'Profile Photo' }
  ]

  // Calculate missing mandatory fields
  const missingFields = mandatoryFieldsKeys.filter(
    f => !percentageData.completedMandatoryFields.includes(f.key)
  )

  // Color configurations based on progress score
  const getProgressColor = () => {
    if (progress < 40) return 'from-red-500 to-orange-500 shadow-red-500/20'
    if (progress < 70) return 'from-amber-500 to-yellow-500 shadow-yellow-500/20'
    return 'from-emerald-500 to-cyan-500 shadow-emerald-500/20'
  }

  const getPercentageColor = () => {
    if (progress < 40) return 'text-red-500'
    if (progress < 70) return 'text-amber-500'
    return 'text-emerald-500'
  }

  const getBgGlow = () => {
    if (progress < 40) return 'bg-red-500/5 border-red-500/10'
    if (progress < 70) return 'bg-amber-500/5 border-amber-500/10'
    return 'bg-emerald-500/5 border-emerald-500/10'
  }

  const getMotivationalMessage = () => {
    if (progress < 40) return "Let's kickstart your onboarding! Fill in your basic identity card details to begin."
    if (progress < 70) return "You are just a few mandatory fields away from unlocking full portal access!"
    if (progress < 100) return "Fantastic! Your portal is fully unlocked. Complete the optional details to reach 100% compliance."
    return "Outstanding! Your profile is 100% compliant. You are fully setup in the organization directory."
  }

  if (!mounted) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-64 animate-pulse" />
    )
  }

  const remainingCount = missingFields.length

  const getOnboardingUrl = () => {
    if (role === 'DEPARTMENT') return '/department/onboarding'
    return '/employee/onboarding'
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 ${getBgGlow()} bg-white shadow-xl shadow-slate-100/40`}>
      
      {/* Dynamic Glow Accents */}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-32 -mt-32 opacity-25 pointer-events-none transition-all ${
        progress < 40 ? 'bg-red-500/20' : progress < 70 ? 'bg-amber-500/20' : 'bg-emerald-500/20'
      }`} />

      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative z-10">
        
        {/* Profile score and description */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Profile Completion</span>
          </div>

          <div className="flex items-baseline gap-2.5">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              <span className={getPercentageColor()}>{progress}% Complete</span>
            </h2>
          </div>

          <p className="text-sm font-semibold text-slate-700 leading-relaxed max-w-xl">
            {getMotivationalMessage()}
          </p>

          <div className="pt-1">
            <span className="inline-block text-xs font-bold px-3 py-1 bg-slate-100 rounded-lg text-slate-605 border border-slate-200/50">
              {remainingCount} {remainingCount === 1 ? 'Field' : 'Fields'} Remaining
            </span>
          </div>
        </div>

        {/* Action button */}
        <div className="w-full md:w-auto flex items-center shrink-0">
          <Link
            href={getOnboardingUrl()}
            className="w-full md:w-auto px-6 py-3.5 text-xs font-bold rounded-2xl shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 text-white bg-linear-to-tr from-[#0066FF] to-[#00D4FF] hover:brightness-110 shadow-blue-500/15"
          >
            <Sparkles className="w-4 h-4" />
            Update Profile
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

      {/* Modern, Thick Linear Progress Bar */}
      <div className="mt-6">
        <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`absolute top-0 left-0 h-full bg-linear-to-r ${getProgressColor()} rounded-full`}
          />
        </div>
        <div className="flex justify-between w-full text-[9px] font-bold text-slate-400 mt-2 px-1">
          <span>0%</span>
          <span>100% Completed</span>
        </div>
      </div>

    </div>
  )
}
