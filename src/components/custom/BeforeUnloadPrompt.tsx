"use client"

import { useEffect } from "react"

interface BeforeUnloadPromptProps {
  enabled?: boolean
}

export function BeforeUnloadPrompt({ enabled = true }: BeforeUnloadPromptProps) {
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If we are actively logging out or submitting a report, let it proceed
      if (typeof window !== "undefined" && (window as any).__isLoggingOut) {
        return
      }

      e.preventDefault()
      // Standard browser confirmation prompt trigger
      e.returnValue = "You have an active work session. You must submit your work report and log out properly before leaving."
      return e.returnValue
    }

    const handleForcedLogout = () => {
      if (typeof window !== "undefined" && !(window as any).__isLoggingOut) {
        (window as any).__isLoggingOut = true
        navigator.sendBeacon("/api/auth/forced-logout")
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("pagehide", handleForcedLogout)
    window.addEventListener("unload", handleForcedLogout)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("pagehide", handleForcedLogout)
      window.removeEventListener("unload", handleForcedLogout)
    }
  }, [enabled])

  return null
}
