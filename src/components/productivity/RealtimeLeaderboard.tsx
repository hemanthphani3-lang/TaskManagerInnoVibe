'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeaderboardTable } from '@/components/productivity/LeaderboardTable'
import type { LeaderboardEntry } from '@/components/productivity/LeaderboardTable'
import { RefreshCw } from 'lucide-react'

interface Employee {
  id: string
  employee_name: string
  designation: string
  profile_photo?: string
}

interface RealtimeLeaderboardProps {
  departmentId: string
  initialEntries: LeaderboardEntry[]
  employees: Employee[]
  title?: string
}

export function RealtimeLeaderboard({
  departmentId,
  initialEntries,
  employees,
  title = 'Team Leaderboard',
}: RealtimeLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [pulse, setPulse] = useState(false)
  const supabase = createClient()

  const refreshLeaderboard = useCallback(async () => {
    const { data: scores } = await supabase
      .from('productivity_scores')
      .select('employee_id, productivity_score')
      .eq('department_id', departmentId)
      .order('productivity_score', { ascending: false })

    const { data: rankings } = await supabase
      .from('rankings')
      .select('employee_id, employee_rank')
      .eq('department_id', departmentId)

    if (!scores) return

    const updated: LeaderboardEntry[] = scores.map((score, idx) => {
      const emp = employees.find(e => e.id === score.employee_id)
      const rank = rankings?.find(r => r.employee_id === score.employee_id)
      return {
        id: score.employee_id,
        rank: rank?.employee_rank ?? idx + 1,
        name: emp?.employee_name || 'Unknown',
        subtitle: emp?.designation || 'Employee',
        score: score.productivity_score ?? 0,
        avatarUrl: emp?.profile_photo ?? undefined,
      }
    }).sort((a, b) => a.rank - b.rank)

    setEntries(updated)
    setLastUpdated(new Date())

    // Flash pulse animation to signal update
    setPulse(true)
    setTimeout(() => setPulse(false), 1000)
  }, [supabase, departmentId, employees])

  useEffect(() => {
    // Subscribe to productivity_scores changes for this department
    const channelName = `leaderboard_${departmentId}_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productivity_scores',
          filter: `department_id=eq.${departmentId}`,
        },
        () => {
          // Re-fetch on any change
          refreshLeaderboard()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rankings',
          filter: `department_id=eq.${departmentId}`,
        },
        () => {
          refreshLeaderboard()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, departmentId, refreshLeaderboard])

  return (
    <div className="relative">
      {/* Live indicator header */}
      <div
        className={`absolute top-4 right-4 z-10 flex items-center gap-1.5 text-xs font-semibold transition-all duration-500 ${
          pulse ? 'text-emerald-600 scale-110' : 'text-slate-400'
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Live
      </div>

      <LeaderboardTable entries={entries.slice(0, 10)} title={title} />

      {/* Last updated footer */}
      <div className="flex items-center justify-end gap-1.5 mt-2 px-1">
        <RefreshCw className={`w-3 h-3 text-slate-400 ${pulse ? 'animate-spin' : ''}`} />
        <span suppressHydrationWarning className="text-[11px] text-slate-400">
          Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })}
        </span>
      </div>
    </div>
  )
}
