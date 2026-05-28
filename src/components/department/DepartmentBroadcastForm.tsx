"use client"

import { useState } from "react"
import { broadcastAnnouncement } from "@/app/actions/announcements"
import { Loader2, Megaphone, Eye } from "lucide-react"
import { AttachmentUploader, Attachment } from "../custom/AttachmentUploader"
import { VoiceRecorder } from "../custom/VoiceRecorder"
import { AnnouncementPreview } from "../custom/AnnouncementPreview"

export function DepartmentBroadcastForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  // Announcement fields state
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null)
  
  const [isPreviewing, setIsPreviewing] = useState(false)

  const handleBroadcast = async () => {
    setLoading(true)
    setError("")
    setSuccess(false)

    const formData = new FormData()
    formData.append("title", title)
    formData.append("message", message)
    // Departments can ONLY broadcast to their own employees
    formData.append("target", "DEPARTMENT_EMPLOYEES")
    formData.append("attachments", JSON.stringify(attachments))
    if (voiceUrl) {
      formData.append("voice_note_url", voiceUrl)
    }

    const result = await broadcastAnnouncement(formData)

    if (result.success) {
      setSuccess(true)
      setTitle("")
      setMessage("")
      setAttachments([])
      setVoiceUrl(null)
      setIsPreviewing(false)

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000)
    } else {
      setError(result.error || "Failed to broadcast announcement")
      setIsPreviewing(false) // Exit preview to show error on edit form
    }
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !message) {
      setError("Please fill in all required fields")
      return
    }
    setIsPreviewing(true)
  }

  if (isPreviewing) {
    return (
      <AnnouncementPreview
        title={title}
        message={message}
        target="DEPARTMENT_EMPLOYEES"
        attachments={attachments}
        voiceUrl={voiceUrl}
        role="departments"
        onCancel={() => setIsPreviewing(false)}
        onConfirm={handleBroadcast}
        loading={loading}
      />
    )
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write the full announcement details here..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all resize-none"
          ></textarea>
        </div>

        {/* Dynamic Attachment Uploader */}
        <AttachmentUploader
          role="departments"
          onAttachmentsChange={setAttachments}
          disabled={loading}
        />

        {/* Dynamic Voice Recorder */}
        <VoiceRecorder
          role="departments"
          onVoiceUrlChange={setVoiceUrl}
          disabled={loading}
        />

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !title || !message}
            className="flex-1 flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-[#0066FF]/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
            <span>Preview announcement</span>
          </button>
        </div>
      </form>
    </div>
  )
}
