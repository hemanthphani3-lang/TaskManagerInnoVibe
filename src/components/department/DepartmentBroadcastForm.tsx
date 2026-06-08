"use client"

import { useState } from "react"
import { broadcastAnnouncement } from "@/app/actions/announcements"
import { Loader2, Megaphone, Send } from "lucide-react"

export function DepartmentBroadcastForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    // Departments can ONLY broadcast to their own employees
    formData.set('target', 'DEPARTMENT_EMPLOYEES')
    
    const result = await broadcastAnnouncement(formData)

    if (result.success) {
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
    } else {
      setError(result.error || "Failed to broadcast announcement")
    }
    setLoading(false)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0066FF]/20 to-[#0066FF]/5 flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-[#0066FF]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Broadcast to Employees</h2>
          <p className="text-sm text-slate-500">Send a notification to all employees in your department.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 text-sm font-medium">
            Announcement broadcasted successfully!
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Announcement Title</label>
          <input
            name="title"
            required
            placeholder="e.g. Department meeting moved to 3 PM"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Message</label>
          <textarea
            name="message"
            required
            rows={5}
            placeholder="Write the full announcement details here..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all resize-none"
          ></textarea>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center w-full gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-[#0066FF]/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? 'Broadcasting...' : 'Broadcast Announcement'}
          </button>
        </div>
      </form>
    </div>
  )
}
