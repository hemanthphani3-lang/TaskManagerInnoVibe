"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function RealtimeListener() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to all changes on the public schema with a unique channel name
    const channelName = `schema-db-changes_${Math.random().toString(36).substring(2, 9)}`
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
