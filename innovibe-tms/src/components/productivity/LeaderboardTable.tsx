"use client"

import React from 'react'
import { Trophy, Medal, Award } from 'lucide-react'
import { ProductivityBadge } from './ProductivityBadge'
import { motion } from 'framer-motion'

export interface LeaderboardEntry {
  id: string
  rank: number
  name: string
  subtitle: string
  score: number
  avatarUrl?: string
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  title?: string
}

export function LeaderboardTable({ entries, title = "Top Performers" }: LeaderboardTableProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-amber-500" />
      case 2: return <Medal className="w-5 h-5 text-slate-400" />
      case 3: return <Award className="w-5 h-5 text-amber-700" />
      default: return <span className="text-sm font-bold text-slate-500 dark:text-slate-400">#{rank}</span>
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
        <h3 className="text-lg font-bold text-[#0A1A2F] dark:text-white">{title}</h3>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800">
              <th className="px-6 py-4 font-semibold">Rank</th>
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold text-right">Score</th>
              <th className="px-6 py-4 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                key={entry.id} 
                className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors last:border-0"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600">
                    {getRankIcon(entry.rank)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {entry.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-100 dark:border-blue-800">
                        {entry.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{entry.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{entry.subtitle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-black text-[#0A1A2F] dark:text-white text-lg">{entry.score.toFixed(0)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <ProductivityBadge score={entry.score} />
                </td>
              </motion.tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  No ranking data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
