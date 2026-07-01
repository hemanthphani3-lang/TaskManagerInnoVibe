'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check, CheckCircle2, Circle, Clock, Info, ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  link_url: string | null
}

interface NotificationsViewProps {
  userId?: string
  isInactive?: boolean
}

export function NotificationsView({ userId: userIdProp, isInactive }: NotificationsViewProps = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  if (isInactive) {
    return (
      <Card className="bg-white border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-[#0066FF] rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Notifications</h2>
              <p className="text-sm text-slate-500 font-medium">You have 0 unread messages</p>
            </div>
          </div>
        </div>
        <div className="p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-slate-900 font-semibold mb-1">No notifications yet</h3>
          <p className="text-slate-500 text-sm">When you get updates, they'll show up here.</p>
        </div>
      </Card>
    )
  }

  useEffect(() => {
    let isMounted = true;
    fetchNotifications()

    // Realtime Subscription using a unique channel name to avoid conflicts across mounts
    const channelName = `realtime_notifications_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (!isMounted) return
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          toast.info(newNotification.title, {
            description: newNotification.message
          })
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchNotifications = async () => {
    try {
      // Use prop userId if available, otherwise fall back to auth lookup
      let uid = userIdProp
      if (!uid) {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return
        uid = userData.user.id
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        
      if (error) throw error
    } catch (error) {
      console.error('Failed to mark as read:', error)
      toast.error('Failed to update notification')
      // Revert on failure
      fetchNotifications()
    }
  }

  const markAllAsRead = async () => {
    try {
      let uid = userIdProp
      if (!uid) {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return
        uid = userData.user.id
      }

      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', uid)
        .eq('is_read', false)

      if (error) throw error
      toast.success("All notifications marked as read")
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      fetchNotifications()
    }
  }

  const handleNotificationClick = async (notif: Notification) => {
    try {
      // 1. Mark as read if unread
      if (!notif.is_read) {
        await markAsRead(notif.id)
      }
      
      // 2. Navigate to link_url if present
      if (notif.link_url) {
        router.push(notif.link_url)
      }
    } catch (err) {
      console.error("Error handling notification click:", err)
    }
  }

  const getIcon = (type: string, isRead: boolean) => {
    const color = isRead ? "text-slate-400" : "text-[#0066FF]"
    switch (type) {
      case 'SYSTEM': return <Info className={`w-5 h-5 ${color}`} />
      case 'TASK': return <CheckCircle2 className={`w-5 h-5 ${color}`} />
      case 'LEAVE': return <Clock className={`w-5 h-5 ${color}`} />
      case 'ALERT': return <ShieldAlert className={`w-5 h-5 text-red-500`} />
      default: return <Bell className={`w-5 h-5 ${color}`} />
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-500 animate-pulse">Loading notifications...</div>
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <Card className="bg-white border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-[#0066FF] rounded-lg">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Notifications</h2>
            <p className="text-sm text-slate-500 font-medium">You have {unreadCount} unread messages</p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0066FF] transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 hover:border-blue-200 shadow-sm"
          >
            <Check className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-semibold mb-1">No notifications yet</h3>
            <p className="text-slate-500 text-sm">When you get updates, they'll show up here.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isBirthday = notif.title.includes('🎂') || notif.title.includes('Birthday')
            
            let bgClass = ''
            if (isBirthday) {
              bgClass = notif.is_read ? 'bg-pink-50/50 hover:bg-pink-50' : 'bg-pink-100 hover:bg-pink-200/60'
            } else {
              bgClass = notif.is_read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'
            }

            return (
              <div 
                key={notif.id} 
                className={`p-5 transition-colors flex gap-4 cursor-pointer ${bgClass}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="mt-1">
                  {getIcon(notif.type, notif.is_read)}
                </div>
                <div className="flex-1 cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className={`text-sm mb-1 ${notif.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${notif.is_read ? 'text-slate-500' : 'text-slate-600'}`}>
                    {notif.message}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="flex items-center">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isBirthday ? 'bg-pink-500' : 'bg-[#0066FF]'}`}></div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
