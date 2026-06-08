'use client'

import React from 'react'
import { Bell, Clock, AlertCircle, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export interface Reminder {
  id: string
  reminder_type: string
  reminder_message: string
  reminder_status: string
  created_at: string
}

interface ReminderCardProps {
  reminders: Reminder[]
}

export function ReminderCard({ reminders: initialReminders }: ReminderCardProps) {
  const [reminders, setReminders] = React.useState(initialReminders)

  const dismissReminder = async (id: string) => {
    // Optimistic UI update
    setReminders(prev => prev.filter(r => r.id !== id))
    
    // Database update
    const supabase = createClient()
    await supabase.from('reminders').update({ reminder_status: 'DISMISSED' }).eq('id', id)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'TASK_PENDING': return <Clock className="w-5 h-5 text-blue-600" />
      case 'DEADLINE_WARNING': return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'NO_UPDATE': return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'ATTENDANCE_REMINDER': return <Bell className="w-5 h-5 text-amber-600" />
      default: return <Bell className="w-5 h-5 text-slate-600" />
    }
  }

  const getColorClass = (type: string) => {
    switch (type) {
      case 'TASK_PENDING': return 'bg-blue-50 border-blue-100'
      case 'DEADLINE_WARNING': return 'bg-orange-50 border-orange-100'
      case 'NO_UPDATE': return 'bg-red-50 border-red-100'
      case 'ATTENDANCE_REMINDER': return 'bg-amber-50 border-amber-100'
      default: return 'bg-slate-50 border-slate-100'
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#0A1A2F] flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Action Required
          {reminders.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {reminders.length}
            </span>
          )}
        </h3>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <motion.div 
                key={reminder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                className={`p-4 rounded-xl border flex items-start gap-4 ${getColorClass(reminder.reminder_type)} relative overflow-hidden group`}
              >
                <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                  {getIcon(reminder.reminder_type)}
                </div>
                <div className="flex-1 pr-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {reminder.reminder_type.replace('_', ' ')}
                  </p>
                  <p className="text-sm font-medium text-slate-900 leading-snug">
                    {reminder.reminder_message}
                  </p>
                </div>
                <button 
                  onClick={() => dismissReminder(reminder.id)}
                  className="absolute top-4 right-4 p-1.5 bg-white text-slate-400 hover:text-slate-900 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:shadow-sm shadow-black/5"
                  title="Dismiss"
                >
                  <Check className="w-4 h-4" />
                </button>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-slate-500 font-medium">You&apos;re all caught up!</p>
              <p className="text-xs text-slate-400 mt-1">No pending reminders.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
