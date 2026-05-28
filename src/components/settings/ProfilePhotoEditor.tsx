"use client"

import { useState, useRef } from "react"
import { Eye, Pencil, X, Upload, Loader2 } from "lucide-react"
import Image from "next/image"

interface ProfilePhotoEditorProps {
  currentPhoto?: string | null
  name: string
  userId: string
  onPhotoUpdated?: (newUrl: string) => void
}

export function ProfilePhotoEditor({ currentPhoto, name, userId, onPhotoUpdated }: ProfilePhotoEditorProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const displayPhoto = currentPhoto && currentPhoto.trim() !== "" ? currentPhoto : null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError("")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("userId", userId)

    try {
      const res = await fetch("/api/upload-profile-photo", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onPhotoUpdated?.(data.url)
      setShowEditModal(false)
      setPreviewUrl(null)
      window.location.reload()
    } catch (err: any) {
      setUploadError(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {/* Profile Photo with Hover Overlay */}
      <div
        className="relative w-32 h-32 flex-shrink-0 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar */}
        <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-md bg-blue-100 flex items-center justify-center">
          {displayPhoto ? (
            <img src={displayPhoto} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-black text-[#0066FF]">{initials}</span>
          )}
        </div>

        {/* Hover Overlay */}
        <div
          className={`absolute inset-0 rounded-3xl bg-black/50 flex items-center justify-center gap-3 transition-all duration-200 ${
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* View Button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowLightbox(true) }}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-110"
            title="View full size"
          >
            <Eye className="w-5 h-5" />
          </button>

          {/* Edit Button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowEditModal(true) }}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-110"
            title="Edit photo"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-4 -right-4 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-white w-full aspect-square flex items-center justify-center">
              {displayPhoto ? (
                <img src={displayPhoto} alt={name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-8xl font-black text-[#0066FF]">{initials}</span>
              )}
            </div>
            <p className="text-center text-white/70 text-sm mt-3 font-medium">{name}</p>
          </div>
        </div>
      )}

      {/* Edit/Upload Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-900 text-lg">Update Profile Photo</h3>
                <button onClick={() => { setShowEditModal(false); setPreviewUrl(null) }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview */}
              <div
                className="w-28 h-28 rounded-2xl mx-auto mb-5 overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer border-2 border-dashed border-slate-300 hover:border-[#0066FF] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : displayPhoto ? (
                  <img src={displayPhoto} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Click to upload</p>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors mb-3"
              >
                Choose Photo
              </button>

              {uploadError && (
                <p className="text-red-500 text-sm mb-3 text-center">{uploadError}</p>
              )}

              <button
                onClick={handleUpload}
                disabled={!previewUrl || uploading}
                className="w-full py-2.5 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading..." : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
