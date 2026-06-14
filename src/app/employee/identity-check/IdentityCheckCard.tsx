"use client"

import TiltedCard from "@/components/ui/TiltedCard"
import { Briefcase, ShieldCheck, Check } from "lucide-react"

interface IdentityCheckCardProps {
  employeeName: string
  designation: string
  profilePhoto?: string | null
  departmentName: string
  children: React.ReactNode
}

export default function IdentityCheckCard({
  employeeName,
  designation,
  profilePhoto,
  departmentName,
  children
}: IdentityCheckCardProps) {
  return (
    <TiltedCard
      containerHeight="auto"
      containerWidth="440px"
      imageHeight="auto"
      imageWidth="440px"
      scaleOnHover={1.02}
      rotateAmplitude={5}
      showMobileWarning={false}
      showTooltip={false}
    >
      {/* Card Container with glassmorphism, blur, large border-radius, thin white border */}
      <div className="relative w-full bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_20px_50px_rgba(0,10,50,0.08)] border border-white/80 overflow-hidden flex flex-col transition-all duration-300">
        
        {/* Header Section with Soft Gradients, Wave Pattern & Spacing adjusted to avoid profile pic overlap */}
        <div className="relative w-full h-[175px] bg-gradient-to-br from-[#E8ECFF] via-[#F3F5FF] to-[#E6F8FF] flex flex-col items-center pt-5 overflow-hidden shrink-0">
          
          {/* Subtle flowing SVG waves in the background */}
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 175" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M-50,70 C100,10 200,120 450,40" stroke="url(#wave-grad-1)" strokeWidth="1.5" />
              <path d="M-50,90 C80,40 180,140 450,60" stroke="url(#wave-grad-2)" strokeWidth="1" />
              <defs>
                <linearGradient id="wave-grad-1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4F5DFF" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#00A6FF" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="wave-grad-2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4F5DFF" stopOpacity="0.05" />
                  <stop offset="50%" stopColor="#00A6FF" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.05" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Blurred background glow behind check icon */}
          <div className="absolute top-3 w-12 h-12 rounded-full bg-[#0066FF]/10 blur-md" />

          {/* Verification Shield Icon */}
          <div className="relative z-10 p-2.5 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-1.5">
            <ShieldCheck className="w-6 h-6 text-[#0066FF]" />
          </div>

          <p className="text-[10px] font-bold text-[#8A9FB4] uppercase tracking-[0.25em] relative z-10">
            Identity Verification
          </p>
        </div>

        {/* Profile Section overlapping header & body */}
        <div className="relative z-20 flex justify-center -mt-[64px]">
          <div className="relative group/avatar cursor-pointer">
            {profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profilePhoto}
                alt={employeeName}
                className="w-[124px] h-[124px] rounded-full object-cover border-[6px] border-white shadow-[0_8px_20px_rgba(0,10,50,0.12)] transition-all duration-300 group-hover/avatar:scale-[1.03]"
              />
            ) : (
              <div className="w-[124px] h-[124px] rounded-full bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center border-[6px] border-white shadow-[0_8px_20px_rgba(0,10,50,0.12)] transition-all duration-300 group-hover/avatar:scale-[1.03]">
                <ShieldCheck className="w-12 h-12 text-slate-300" />
              </div>
            )}

            {/* Verified Badge attached to bottom right */}
            <div className="absolute bottom-1 right-1.5 w-7 h-7 rounded-full bg-[#0066FF] border-2 border-white flex items-center justify-center shadow-md animate-[pulse_3s_infinite]" style={{ animationDuration: '3s' }}>
              <Check className="w-4 h-4 text-white stroke-[3px]" />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-8 pt-5 pb-8 flex flex-col items-center">
          
          {/* Employee Information */}
          <div className="space-y-1.5 text-center mb-5">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
              {employeeName}
            </h3>
            <p className="text-[#0066FF] text-sm font-bold tracking-wide">
              {designation}
            </p>
          </div>

          {/* Department Badge Pill Component */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] text-slate-600 rounded-full text-xs font-bold shadow-2xs hover:bg-[#E2E8F0] transition-colors duration-200 mb-6 cursor-default">
            <Briefcase className="w-3.5 h-3.5 text-[#0066FF] stroke-[2.5px]" />
            <span>{departmentName}</span>
          </div>

          {/* Premium Custom Divider */}
          <div className="flex items-center gap-4 w-full mb-6 select-none">
            <div className="h-[1px] flex-1 bg-slate-100" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            <div className="h-[1px] flex-1 bg-slate-100" />
          </div>

          {/* Children: Action buttons (Check-in, Secondary action buttons) */}
          <div className="w-full">
            {children}
          </div>
        </div>

      </div>
    </TiltedCard>
  )
}
