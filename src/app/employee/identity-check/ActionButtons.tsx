"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Loader2, Scan } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { checkInEmployee } from "@/app/actions/attendance"

interface ActionButtonsProps {
  employeeId: string
  departmentId: string
  isDepartmentHead?: boolean
}

export default function ActionButtons({ employeeId, departmentId, isDepartmentHead = false }: ActionButtonsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleCheckIn = async () => {
    setLoading(true)
    setError(null)

    const result = await checkInEmployee(employeeId, departmentId)
    
    if (result.success || result.error === "Already checked in today.") {
      try {
        sessionStorage.setItem("just_checked_in", "true")
      } catch (e) {
        console.error("Failed to set sessionStorage:", e)
      }
      window.location.href = isDepartmentHead ? "/department/dashboard" : "/employee/dashboard"
    } else {
      setError(result.error || "Failed to check in.")
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-5">
      {error && <p className="text-red-500 text-xs font-semibold text-center">{error}</p>}
      
      {/* Premium Gradient Check In Button */}
      <button 
        onClick={handleCheckIn}
        disabled={loading}
        className="w-full h-[74px] rounded-[24px] bg-gradient-to-r from-[#00A6FF] to-[#4F5DFF] hover:from-[#00b2ff] hover:to-[#5c6aff] text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] shadow-[0_8px_25px_rgba(0,166,255,0.25)] hover:shadow-[0_12px_30px_rgba(0,166,255,0.35)] flex items-center justify-between px-6 cursor-pointer relative overflow-hidden group disabled:opacity-90"
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-25deg] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" style={{ animationDuration: '1.5s' }} />

        {/* Left Side: Icon + Check In Text */}
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Scan className="w-5 h-5 text-white/90 group-hover:scale-110 transition-transform duration-300" />
          )}
          <span className="text-base tracking-wide font-bold">
            {loading ? "Verifying..." : "Check In"}
          </span>
        </div>

        {/* Right Side: Separator + Verify Identity Action Text */}
        <div className="flex items-center gap-4 h-6">
          <div className="w-[1px] h-full bg-white/20" />
          <span className="text-xs font-medium text-white/80 tracking-wide uppercase">
            Verify Identity
          </span>
        </div>
      </button>

      {/* Minimalistic Secondary Action */}
      <div className="flex justify-center pt-2">
        <button 
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-medium text-sm px-4 py-2 rounded-xl hover:bg-slate-50 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>This isn't me</span>
        </button>
      </div>
    </div>
  )
}
