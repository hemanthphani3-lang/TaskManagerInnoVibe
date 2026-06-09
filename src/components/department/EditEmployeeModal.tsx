"use client"

import React, { useState, useRef } from "react"
import { X, Loader2, UploadCloud, Edit3, ShieldAlert } from "lucide-react"
import { deptUpdateEmployeeProfile } from "@/app/actions/employees"
import { toast } from "sonner"

interface EditEmployeeModalProps {
  employee: any
  onClose: () => void
  onSuccess: () => void
}

export function EditEmployeeModal({ employee, onClose, onSuccess }: EditEmployeeModalProps) {
  const [loading, setLoading] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  
  // Local form state initialized from employee object
  const [formData, setFormData] = useState({
    employee_name: employee.employee_name || "",
    employee_email: employee.employee_email || "",
    phone_number: employee.phone_number || "",
    alternate_phone: employee.alternate_phone || "",
    address: employee.address || "",
    emergency_contact: {
      name: employee.emergency_contact?.name || "",
      phone: employee.emergency_contact?.phone || ""
    },
    designation: employee.designation || "",
    reporting_manager: employee.reporting_manager || "",
    employee_code: employee.employee_code || "",
    employment_type: employee.employment_type || "Full-time",
    work_mode: employee.work_mode || "Remote",
    joining_date: employee.joining_date ? employee.joining_date.split('T')[0] : "",
    account_status: employee.account_status || "Active",
    profile_photo: employee.profile_photo || ""
  })

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name.startsWith("emergency_contact_")) {
      const field = name.replace("emergency_contact_", "")
      setFormData(prev => ({
        ...prev,
        emergency_contact: {
          ...prev.emergency_contact,
          [field]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // Handle profile photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photo must be less than 5MB.")
      return
    }

    setPhotoUploading(true)
    const uploadData = new FormData()
    uploadData.append("file", file)
    uploadData.append("userId", employee.id)

    try {
      const res = await fetch("/api/upload-profile-photo", {
        method: "POST",
        body: uploadData
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)

      setFormData(prev => ({ ...prev, profile_photo: result.url }))
      toast.success("Profile photo uploaded successfully!")
    } catch (err: any) {
      toast.error(err.message || "Photo upload failed.")
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Email, name, code, joining date are mandatory
    if (!formData.employee_name.trim()) return toast.error("Employee Name is required.")
    if (!formData.employee_email.trim()) return toast.error("Email Address is required.")
    if (!formData.employee_code.trim()) return toast.error("Employee ID/Code is required.")
    if (!formData.joining_date) return toast.error("Joining Date is required.")

    setLoading(true)
    try {
      const res = await deptUpdateEmployeeProfile(employee.id, formData)
      if (res.success) {
        toast.success("Employee profile updated successfully.")
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || "Failed to update profile.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col my-8 max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Edit Employee Profile</h3>
              <p className="text-xs text-slate-500">Update workspace parameters for this employee.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-150 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          
          {/* Profile Photo upload */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="relative w-20 h-20 rounded-full border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
              {formData.profile_photo ? (
                <img src={formData.profile_photo} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold bg-slate-200">No Photo</div>
              )}
              {photoUploading && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-1.5 text-center sm:text-left">
              <label htmlFor="modal-profile-photo-upload" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm">
                <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                Upload New Photo
              </label>
              <input 
                type="file" 
                id="modal-profile-photo-upload" 
                accept="image/*"
                onChange={handlePhotoUpload} 
                className="hidden" 
                disabled={photoUploading}
              />
              <p className="text-[10px] text-slate-400">Accepts PNG, JPG up to 5MB. Photo will update instantly.</p>
            </div>
          </div>

          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider">1. Personal & Contact Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                <input 
                  type="text" 
                  name="employee_name"
                  value={formData.employee_name}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary Phone</label>
                <input 
                  type="text" 
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alternate Contact</label>
                <input 
                  type="text" 
                  name="alternate_phone"
                  value={formData.alternate_phone}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Login Email Address</label>
                <input 
                  type="email" 
                  name="employee_email"
                  value={formData.employee_email}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800"
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Home Base Address</label>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800"
                  placeholder="Street address, apartment, city, state, pincode"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emergency Contact Person</label>
                <input 
                  type="text" 
                  name="emergency_contact_name"
                  value={formData.emergency_contact.name}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800"
                  placeholder="Contact Name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emergency Phone Number</label>
                <input 
                  type="text" 
                  name="emergency_contact_phone"
                  value={formData.emergency_contact.phone}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800"
                  placeholder="10-digit number"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Employment Details */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider">2. Employment Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Designation / Role Title</label>
                <input 
                  type="text" 
                  name="designation"
                  value={formData.designation}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporting Manager Name</label>
                <input 
                  type="text" 
                  name="reporting_manager"
                  value={formData.reporting_manager}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee ID / Code</label>
                <input 
                  type="text" 
                  name="employee_code"
                  value={formData.employee_code}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800 uppercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employment Type</label>
                <select 
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-850 cursor-pointer"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Work Mode</label>
                <select 
                  name="work_mode"
                  value={formData.work_mode}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-850 cursor-pointer"
                >
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Joining Date</label>
                <input 
                  type="date" 
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-800"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Account Security/Status */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider">3. Account Status</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Status</label>
                <select 
                  name="account_status"
                  value={formData.account_status}
                  onChange={handleFieldChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold text-slate-850 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Locked">Locked</option>
                </select>
              </div>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition bg-white"
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl shadow-md shadow-[#0066FF]/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 transition"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Saving Changes..." : "Save Profile Details"}
          </button>
        </div>
      </div>
    </div>
  )
}
