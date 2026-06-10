"use client"

import React, { useState, useEffect } from "react"
import { getCrossRoleUsers, createCrossRoleTask } from "@/app/actions/tasks"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { 
  X, 
  UserPlus, 
  Layers, 
  Calendar, 
  AlertCircle, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Loader2,
  Trash2
} from "lucide-react"

interface CreateTaskDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentUserId: string
  currentUserRole?: "ADMIN" | "DEPARTMENT" | "EMPLOYEE"
}

export function CreateTaskDialog({ isOpen, onClose, onSuccess, currentUserId, currentUserRole }: CreateTaskDialogProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(true)
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([])
  
  // Fields
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assigneeRole, setAssigneeRole] = useState<"ADMIN" | "DEPARTMENT" | "EMPLOYEE">("EMPLOYEE")
  const [selectedAssignees, setSelectedAssignees] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [priority, setPriority] = useState("MEDIUM")
  const [category, setCategory] = useState("Operations")
  const [dueDate, setDueDate] = useState("")
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string }[]>([])
  const [uploadingField, setUploadingField] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Load Directory Users
  useEffect(() => {
    async function fetchUsers() {
      setUsersLoading(true)
      const res = await getCrossRoleUsers()
      if (res.success && res.users) {
        // Exclude current logged in user from assignee selection
        setDirectoryUsers(res.users.filter((u: any) => u.id !== currentUserId))
      } else {
        console.error("Directory fetch error:", res)
        toast.error(res.error ? `Failed to retrieve workforce directory: ${res.error}` : "Failed to retrieve system workforce directory.")
      }
      setUsersLoading(false)
    }
    if (isOpen) {
      fetchUsers()
      setValidationErrors([])
    }
  }, [isOpen, currentUserId])

  // Reset assignee search when role changes
  useEffect(() => {
    setSearchQuery("")
  }, [assigneeRole])

  if (!isOpen) return null

  // Filter users by selected assignee role
  const filteredUsers = directoryUsers.filter(u => u.role === assigneeRole)

  // File uploading handler
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const sizeLimit = 20 * 1024 * 1024 // 20MB limit
    if (file.size > sizeLimit) {
      toast.error("Attachment size exceeds 20MB corporate limit.")
      return
    }

    setUploadingField(true)
    setUploadProgress(15)

    try {
      const fileExt = file.name.split('.').pop()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, "_")
      const filePath = `tasks/${currentUserId}/${Date.now()}_${sanitizedName}`

      setUploadProgress(45)
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      setUploadProgress(80)
      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(filePath)

      setUploadProgress(100)

      setAttachments(prev => [
        ...prev,
        {
          name: file.name,
          url: publicUrl,
          type: file.type || 'application/octet-stream'
        }
      ])
      toast.success(`Successfully uploaded ${file.name}!`)
    } catch (err: any) {
      console.error(err)
      toast.error(`File upload failed: ${err.message || String(err)}`)
    } finally {
      setTimeout(() => {
        setUploadingField(false)
        setUploadProgress(0)
      }, 300)
    }
  }

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const addAssignee = (user: any) => {
    if (!selectedAssignees.some(u => u.id === user.id)) {
      setSelectedAssignees(prev => [...prev, user])
    }
    setSearchQuery("")
    setIsSearchFocused(false)
  }

  const removeAssignee = (userId: string) => {
    setSelectedAssignees(prev => prev.filter(u => u.id !== userId))
  }

  const searchableUsers = filteredUsers.filter(u => {
    const isNotSelected = !selectedAssignees.some(sel => sel.id === u.id)
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()))
    return isNotSelected && matchesSearch
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let finalAssignees = [...selectedAssignees]
    if (finalAssignees.length === 0 && searchQuery.trim()) {
      if (searchableUsers.length > 0) {
        finalAssignees = [searchableUsers[0]]
        setSelectedAssignees(finalAssignees)
        setSearchQuery("")
      }
    }

    const errors: string[] = []
    if (!title.trim()) errors.push("Please enter a task title.")
    if (!description.trim()) errors.push("Please provide a task description.")
    if (finalAssignees.length === 0) errors.push("Please select at least one assignee user.")
    if (!dueDate) errors.push("Please select a target deadline date.")

    if (errors.length > 0) {
      setValidationErrors(errors)
      toast.error("Form validation failed. Please review mandatory fields.")
      return
    }

    setValidationErrors([])
    setLoading(true)

    try {
      const res = await createCrossRoleTask({
        title,
        description,
        assigned_to: finalAssignees.map(u => u.id),
        assigned_to_role: assigneeRole,
        priority,
        // Store both legacy due_date and new deadline column
        due_date: dueDate,
        deadline: dueDate,
        category,
        // Store both legacy attachments array of URLs and new attachment_urls JSONB
        attachments: attachments.map(a => a.url),
        attachment_urls: attachments
      })

      if (res.success) {
        toast.success("Task successfully created and assigned!")
        onSuccess()
        // Reset state
        setTitle("")
        setDescription("")
        setAssigneeRole("EMPLOYEE")
        setSelectedAssignees([])
        setPriority("MEDIUM")
        setCategory("Operations")
        setDueDate("")
        setAttachments([])
        onClose()
      } else {
        toast.error(res.error || "Failed to create task.")
      }
    } catch (err: any) {
      toast.error(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#00D4FF] flex items-center justify-center text-white shadow-md shadow-[#0066FF]/25">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">Collaborative Task Creator</h3>
              <p className="text-xs text-slate-400">Assign work to any corporate role across departments.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300">
          
          {/* Validation Alert */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-xs text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500 animate-pulse" />
              <div>
                <p className="font-extrabold uppercase tracking-wider text-[10px] text-red-505">Form Submission Blocked</p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 font-semibold">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Task Title</label>
            <input 
              type="text"
              required
              placeholder="e.g. Implement real-time notifications framework"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full bg-slate-950 border focus:ring-1 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition ${validationErrors.some(e => e.includes("title")) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-[#0066FF] focus:ring-[#0066FF]'}`}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Task Description</label>
            <textarea 
              required
              rows={4}
              placeholder="Detail the scope of work, technical requirements, or expected deliverables..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full bg-slate-950 border focus:ring-1 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition resize-none ${validationErrors.some(e => e.includes("description")) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-[#0066FF] focus:ring-[#0066FF]'}`}
            />
          </div>

          {/* Role & Assignee Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Target Role */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Assignee Role</label>
              <select 
                value={assigneeRole}
                onChange={e => setAssigneeRole(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-xl px-4 py-3 text-sm text-white outline-none transition"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="DEPARTMENT">Department Head</option>
                {currentUserRole !== "ADMIN" && (
                  <option value="ADMIN">System Administrator</option>
                )}
              </select>
            </div>

            {/* Target Search & Selection */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Search & Add Assignees</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder={usersLoading ? "Loading directory..." : `Type to search ${assigneeRole.toLowerCase()}s...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (searchableUsers.length > 0) {
                        addAssignee(searchableUsers[0])
                      }
                    }
                  }}
                  disabled={usersLoading}
                  className={`w-full bg-slate-950 border focus:ring-1 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-655 outline-none transition disabled:opacity-50 ${validationErrors.some(e => e.includes("assignee")) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-[#0066FF] focus:ring-[#0066FF]'}`}
                />
                
                {/* Dropdown search results */}
                {isSearchFocused && (searchQuery || isSearchFocused) && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1">
                    {searchableUsers.length === 0 ? (
                      <p className="text-xs text-slate-500 p-3 text-center">No matching workforce found</p>
                    ) : (
                      searchableUsers.map((u: any) => (
                        <div 
                          key={u.id}
                          onMouseDown={() => addAssignee(u)}
                          className="px-4 py-2.5 hover:bg-[#0066FF]/10 text-xs text-slate-355 hover:text-white cursor-pointer transition flex items-center justify-between"
                        >
                          <span className="font-bold">{u.name}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{u.department || 'Administration'}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Selected assignees chips display */}
          {selectedAssignees.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected Assignees ({selectedAssignees.length})</label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-950/40 border border-slate-850 rounded-2xl">
                {selectedAssignees.map(user => (
                  <div 
                    key={user.id} 
                    className="flex items-center gap-1.5 bg-[#0066FF]/15 border border-[#0066FF]/35 text-white px-3 py-1.5 rounded-full text-xs font-bold"
                  >
                    <span>{user.name}</span>
                    <span className="text-[9px] text-slate-400 font-medium">({user.department || 'Administration'})</span>
                    <button 
                      type="button" 
                      onClick={() => removeAssignee(user.id)}
                      className="text-slate-400 hover:text-red-400 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priority, Category, Deadline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Priority */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Priority Level</label>
              <select 
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-xl px-4 py-3 text-sm text-white outline-none transition"
              >
                <option value="LOW">🟢 Low Priority</option>
                <option value="MEDIUM">🔵 Medium Priority</option>
                <option value="HIGH">🟠 High Priority</option>
                <option value="CRITICAL">🔴 Critical Priority</option>
              </select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Category Tag</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-xl px-4 py-3 text-sm text-white outline-none transition"
              >
                <option value="Operations">Operations</option>
                <option value="Development">Development</option>
                <option value="HR">Human Resources</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Sales">Sales</option>
                <option value="Design">Product Design</option>
                <option value="Other">Other / General</option>
              </select>
            </div>

            {/* Target Deadline */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Deadline Target</label>
              <div className="relative">
                <input 
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className={`w-full bg-slate-950 border focus:ring-1 rounded-xl px-4 py-3 text-sm text-white outline-none transition ${validationErrors.some(e => e.includes("deadline")) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-[#0066FF] focus:ring-[#0066FF]'}`}
                />
              </div>
            </div>

          </div>

          {/* Attachments Section */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Supporting Attachments</label>
            
            {/* Upload Box */}
            <div className="relative border border-dashed border-slate-800 hover:border-[#0066FF]/50 rounded-2xl p-6 bg-slate-950/40 flex flex-col items-center justify-center transition group">
              <input 
                type="file"
                onChange={handleAttachmentUpload}
                disabled={uploadingField}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:pointer-events-none"
              />
              <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-[#0066FF] transition mb-2" />
              <p className="text-xs font-bold text-slate-300">
                {uploadingField ? `Uploading... ${uploadProgress}%` : "Click or drag files here to upload"}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Accepts PDF, Image, ZIP, Doc, Excel up to 20MB</p>
              
              {/* Progress bar */}
              {uploadingField && (
                <div className="w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* List of Attachments */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-semibold text-slate-300 truncate">{file.name}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/30">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition"
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl shadow-md shadow-[#0066FF]/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Assigning Task...
              </>
            ) : (
              "Create & Assign"
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
