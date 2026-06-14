"use client"
 
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Trophy } from "lucide-react"
import { ScoreProgressBar } from "@/components/productivity/ScoreProgressBar"
import { ProductivityBadge } from "@/components/productivity/ProductivityBadge"
import CountUp from "@/components/ui/CountUp"
 
interface RealtimeProductivityCardProps {
  employeeId: string
  initialProductivityScore: number
  initialAttendanceRate: number
  initialCompletionRate: number
  initialRank?: number | null
}
 
export function RealtimeProductivityCard({
  employeeId,
  initialProductivityScore,
  initialAttendanceRate,
  initialCompletionRate,
  initialRank
}: RealtimeProductivityCardProps) {
  const [productivityScore, setProductivityScore] = useState(initialProductivityScore)
  const [attendanceRate, setAttendanceRate] = useState(initialAttendanceRate)
  const [completionRate, setCompletionRate] = useState(initialCompletionRate)
  const [rank, setRank] = useState<number | null | undefined>(initialRank)
  
  const supabase = createClient()
 
  useEffect(() => {
    const fetchUpdatedData = async () => {
      try {
        const [{ data: prod }, { data: kpi }, { data: rnk }] = await Promise.all([
          supabase.from('productivity_scores').select('productivity_score').eq('employee_id', employeeId).maybeSingle(),
          supabase.from('kpi_metrics').select('attendance_rate, completion_rate').eq('employee_id', employeeId).maybeSingle(),
          supabase.from('rankings').select('employee_rank').eq('employee_id', employeeId).maybeSingle()
        ])
        
        if (prod) {
          setProductivityScore(prod.productivity_score ?? 0)
        }
        if (kpi) {
          setAttendanceRate(kpi.attendance_rate ?? 0)
          setCompletionRate(kpi.completion_rate ?? 0)
        }
        if (rnk) {
          setRank(rnk.employee_rank)
        }
      } catch (err) {
        console.error("Failed to fetch updated productivity/attendance rates:", err)
      }
    }
 
    const channelName = `productivity_card_${employeeId}_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productivity_scores',
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          fetchUpdatedData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rankings',
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          fetchUpdatedData()
        }
      )
      .subscribe()
 
    return () => {
      supabase.removeChannel(channel)
    }
  }, [employeeId, supabase])
 
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#0A1A2F]">Productivity Score</h3>
          {rank && (
            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
              <Trophy className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Rank #{rank}</span>
            </div>
          )}
        </div>
        <ScoreProgressBar score={productivityScore} />
        <div className="mt-3">
          <ProductivityBadge score={productivityScore} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance</p>
          <p className="text-base font-black text-slate-800 mt-0.5">
            <CountUp to={Math.round(attendanceRate)} duration={1} />%
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completion</p>
          <p className="text-base font-black text-slate-800 mt-0.5">
            <CountUp to={Math.round(completionRate)} duration={1} />%
          </p>
        </div>
      </div>
    </div>
  )
}
