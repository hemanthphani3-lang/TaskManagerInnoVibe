"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function RealtimeListener() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { error } = await supabase.auth.getSession()
        if (error && (
          error.message.includes("Refresh Token Not Found") || 
          error.message.includes("refresh_token_not_found") || 
          error.message.includes("Invalid Refresh Token")
        )) {
          console.warn("[Auth] Stale or invalid Supabase session detected. Cleaning up storage...")
          
          // Clear memory state
          await supabase.auth.signOut()
          
          // Clear localStorage keys starting with 'sb-'
          if (typeof window !== 'undefined' && window.localStorage) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i)
              if (key && key.startsWith('sb-')) {
                localStorage.removeItem(key)
              }
            }
          }
          
          // Clear cookies starting with 'sb-'
          if (typeof document !== 'undefined') {
            document.cookie.split(";").forEach((c) => {
              const name = c.trim().split("=")[0]
              if (name.startsWith("sb-")) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
              }
            })
          }
          
          router.refresh()
        }
      } catch (err) {
        console.error("[Auth] Error checking session status:", err)
      }
    }
    checkSession()
  }, [supabase, router])

  useEffect(() => {
    // Subscribe to all changes on the public schema using a unique channel name
    const channelName = `schema-db-changes_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Realtime change detected:', payload)
          // Tell Next.js to re-fetch Server Components to instantly reflect the new data
          router.refresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to Supabase Realtime!')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, supabase])

  return null // This component doesn't render anything visually
}
