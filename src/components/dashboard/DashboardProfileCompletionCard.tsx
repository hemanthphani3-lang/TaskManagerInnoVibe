/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { calculateCompletionPercentage } from "@/lib/onboarding-utils"
import { 
  Award, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle, 
  Lock, 
  Sparkles,
  ShieldCheck,
  UserCheck
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

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 ${getBgGlow()} bg-white shadow-xl shadow-slate-100/40`}>
      
      {/* Dynamic Glow Accents */}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-32 -mt-32 opacity-25 pointer-events-none transition-all ${
        progress < 40 ? 'bg-red-500/20' : progress < 70 ? 'bg-amber-500/20' : 'bg-emerald-500/20'
      }`} />

      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative z-10">
        
        {/* Profile score and motivational prompt */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Workspace Profile Status</span>
            
            {!isUnlocked ? (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-red-200">
                <Lock className="w-3 h-3" /> System Access Restricted
              </span>
            ) : isFullyCompleted ? (
              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/20 shadow-md shadow-amber-500/5 animate-pulse">
                <Award className="w-3 h-3 text-amber-500" /> Profile Fully Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> Portal Unlocked
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2.5">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-baseline">
              <span className={getPercentageColor()}>{progress}%</span>
              <span className="text-sm font-semibold text-slate-400 ml-1">completed</span>
            </h2>
          </div>

          <p className="text-sm font-semibold text-slate-700 leading-relaxed max-w-xl">
            {getMotivationalMessage()}
          </p>

          {/* Missing mandatory fields details */}
          {!isFullyCompleted && missingFields.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Pending Required Fields ({missingFields.length})
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                {missingFields.map(f => (
                  <span 
                    key={f.key} 
                    className="inline-block text-[10px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 rounded-lg text-slate-600 transition-colors"
                  >
                    ✦ {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic score visualization circle / block + buttons */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-4 items-stretch sm:items-center md:items-end justify-end shrink-0">
          
          {/* Action button */}
          <Link
            href="/onboarding"
            className={`px-6 py-3.5 text-xs font-bold rounded-2xl shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 text-white ${
              !isUnlocked 
                ? 'bg-gradient-to-tr from-amber-500 to-orange-500 hover:brightness-110 shadow-orange-500/15'
                : 'bg-gradient-to-tr from-[#0066FF] to-[#00D4FF] hover:brightness-110 shadow-blue-500/15'
            }`}
          >
            {isFullyCompleted ? (
              <>
                <UserCheck className="w-4 h-4" /> Edit Profile Details
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 animate-spin-slow" />
                {!isUnlocked ? 'Complete Profile to Unlock' : 'Update Missing Details'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Link>

          {/* Access status alert info */}
          {!isUnlocked && (
            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Locked modules: Tasks, Leave, Reports, Announcements
            </span>
          )}
        </div>

      </div>

      {/* Modern, Thick Linear Progress Bar */}
      <div className="mt-6">
        <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getProgressColor()} rounded-full`}
          />
          {/* Threshold Marker indicator line */}
          <div className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-red-400/80 z-10" />
        </div>
        <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-2 px-1">
          <span>0%</span>
          <span className="text-red-500">70% Required Threshold</span>
          <span>100% Completed</span>
        </div>
      </div>

    </div>
  )
}
