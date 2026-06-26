"use client"

import { User } from "lucide-react"
import { BirthdayPerson } from "@/app/actions/birthday"

interface BirthdayCardProps {
  birthdays: BirthdayPerson[]
}

export function BirthdayCard({ birthdays }: BirthdayCardProps) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 flex flex-col hover:shadow transition-shadow shrink-0">
      {/* Title */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-50 mb-3 shrink-0">
        <span className="text-base select-none">🎂</span>
        <h4 className="text-xs font-bold text-[#0A1A2F]">Today's Birthday</h4>
      </div>

      {/* Birthday list */}
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px] scrollbar-thin">
        {birthdays.length > 0 ? (
          birthdays.map((person) => (
            <div 
              key={person.id} 
              className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors"
            >
              {person.profile_photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.profile_photo}
                  alt={person.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0 select-none pointer-events-none"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center border-2 border-white shadow-sm shrink-0 select-none">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-xs truncate leading-snug">{person.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{person.designation}</p>
                <p className="text-[9px] text-[#0066FF] font-semibold mt-1">Wish them a wonderful year ahead!</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-slate-400 italic text-[10px] font-semibold">No birthdays today.</p>
          </div>
        )}
      </div>
    </section>
  )
}
