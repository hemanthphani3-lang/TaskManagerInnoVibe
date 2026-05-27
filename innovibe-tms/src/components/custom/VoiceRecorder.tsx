"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Mic, Square, Trash2, Play, Pause, AlertCircle, Loader2 } from "lucide-react"

interface VoiceRecorderProps {
  role: "admin" | "departments"
  onVoiceUrlChange: (url: string | null) => void
  disabled?: boolean
}

type RecorderStatus = "idle" | "recording" | "paused" | "stopped" | "uploading"

export function VoiceRecorder({ role, onVoiceUrlChange, disabled = false }: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState<number>(0)
  const [permissionError, setPermissionError] = useState<string>("")
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  useEffect(() => {
    return () => {
      stopTimer()
    }
  }, [])

  const startTimer = () => {
    stopTimer()
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      setPermissionError("")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop stream immediately, just checking permission
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (err: any) {
      console.error("Microphone permission denied:", err)
      setPermissionError("Microphone access denied. Please enable microphone permissions in your browser settings to record voice messages.")
      return false
    }
  }

  const startRecording = async () => {
    const hasPermission = await requestMicrophonePermission()
    if (!hasPermission) return

    audioChunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Select MIME type support
      let mimeType = "audio/webm"
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/ogg"
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "" // default browser MIME type
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        // Stop all tracks in stream to release microphone icon
        stream.getTracks().forEach(track => track.stop())

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)

        // Upload directly to Supabase Storage
        await handleUpload(audioBlob)
      };

      recorder.start(250) // slice size 250ms
      setStatus("recording")
      setRecordingTime(0)
      startTimer()
    } catch (err: any) {
      console.error("Failed to start media recorder:", err)
      setPermissionError("Failed to access your microphone.")
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.pause()
      setStatus("paused")
      stopTimer()
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && status === "paused") {
      mediaRecorderRef.current.resume()
      setStatus("recording")
      startTimer()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && (status === "recording" || status === "paused")) {
      mediaRecorderRef.current.stop()
      stopTimer()
      setStatus("stopped")
    }
  }

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setRecordingTime(0)
    setStatus("idle")
    onVoiceUrlChange(null)
  }

  const handleUpload = async (audioBlob: Blob) => {
    setStatus("uploading")
    const fileName = `voice_${Date.now()}.webm`
    const filePath = `${role}/${fileName}`

    try {
      const { data, error } = await supabase.storage
        .from("announcements")
        .upload(filePath, audioBlob, {
          contentType: "audio/webm",
          cacheControl: "3600",
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("announcements")
        .getPublicUrl(filePath)

      onVoiceUrlChange(publicUrl)
      setStatus("stopped")
    } catch (err: any) {
      console.error("Failed to upload audio to Supabase:", err)
      setPermissionError(`Failed to upload voice recording: ${err.message || err}`)
      setStatus("idle")
      setAudioUrl(null)
    }
  }

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes scaleBar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .waveform-bar {
          animation: scaleBar 1.2s ease-in-out infinite;
        }
      `}</style>

      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Voice Announcement</label>

      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between transition-all">
        
        {/* State 1: Idle (Ready to Record) */}
        {status === "idle" && (
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              disabled={disabled}
              onClick={startRecording}
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Start recording"
            >
              <Mic className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Record Voice Note</span>
              <span className="text-xs text-slate-500">Record a brief microphone audio message.</span>
            </div>
          </div>
        )}

        {/* State 2: Recording / Paused */}
        {(status === "recording" || status === "paused") && (
          <div className="flex items-center gap-4 w-full">
            {/* Blinking Indicator and Timer */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-950/50 shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full bg-red-500 ${status === "recording" ? "animate-ping" : ""}`} />
              <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                {formatTime(recordingTime)}
              </span>
            </div>

            {/* Waveform Animation (Only when recording) */}
            {status === "recording" && (
              <div className="flex items-center gap-[3px] h-6 flex-1 max-w-[120px]">
                {[0.6, 0.3, 0.8, 0.5, 0.9, 0.4, 0.7, 0.3, 0.6].map((height, i) => (
                  <div
                    key={i}
                    className="waveform-bar w-[3px] bg-red-500 rounded-full h-full"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      transformOrigin: "center"
                    }}
                  />
                ))}
              </div>
            )}
            
            {status === "paused" && (
              <span className="text-xs text-slate-400 font-semibold italic flex-1">Recording paused</span>
            )}

            {/* Controls */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {status === "recording" ? (
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all"
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-all animate-pulse"
                >
                  Resume
                </button>
              )}
              <button
                type="button"
                onClick={stopRecording}
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center transition-all"
                title="Stop and save"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            </div>
          </div>
        )}

        {/* State 3: Uploading */}
        {status === "uploading" && (
          <div className="flex items-center gap-3 w-full justify-center py-2">
            <Loader2 className="w-5 h-5 text-[#0066FF] animate-spin" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Uploading audio file...</span>
          </div>
        )}

        {/* State 4: Stopped / Has Audio Preview */}
        {status === "stopped" && audioUrl && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
            {/* Audio player preview */}
            <div className="flex-1">
              <audio src={audioUrl} controls className="w-full h-10 rounded-xl" />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0 justify-end">
              <button
                type="button"
                onClick={deleteRecording}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/45 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950/50 rounded-xl text-xs font-bold transition-all"
                title="Delete recording"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Permission Error Message */}
      {permissionError && (
        <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-100 dark:border-red-950/50">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}
    </div>
  )
}
