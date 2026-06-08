"use client"

import { Button } from "@/components/ui/button"
import { LogOut, CheckCircle2, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { checkInEmployee } from "@/app/actions/attendance"

interface ActionButtonsProps {
  employeeId: string
  departmentId: string
}

export default function ActionButtons({ employeeId, departmentId }: ActionButtonsProps) {
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
      // Hard redirect — avoids router.push + router.refresh double-load
      window.location.href = "/employee/dashboard"
    } else {
      setError(result.error || "Failed to check in.")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
      <Button 
        onClick={handleCheckIn}
        disabled={loading}
        className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl py-6 font-semibold tracking-wide shadow-md shadow-[#0066FF]/20"
      >
        {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
        {loading ? "Checking In..." : "Yes, Check-In"}
      </Button>
      <Button 
        variant="ghost" 
        onClick={handleLogout}
        className="w-full text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
      >
        <LogOut className="w-4 h-4 mr-2" />
        This isn&apos;t me
      </Button>
    </div>
  )
}
