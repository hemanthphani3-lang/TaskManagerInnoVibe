import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserCircle2 } from "lucide-react"

interface UserAvatarProps {
  url?: string | null
  name?: string
  className?: string
  fallbackClass?: string
}

export function UserAvatar({ url, name, className = "h-10 w-10", fallbackClass = "" }: UserAvatarProps) {
  const initials = name
    ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : ""

  // Prevent stale cached images by appending a dynamic timestamp query parameter to Supabase URLs
  const imageUrl = url && url.includes("/storage/v1/object/public/")
    ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
    : url

  return (
    <Avatar className={`border border-slate-100 shadow-sm ${className}`}>
      {imageUrl ? (
        <AvatarImage src={imageUrl} alt={name || "User"} className="object-cover" />
      ) : null}
      <AvatarFallback className={`bg-gradient-to-br from-slate-50 to-slate-100 ${fallbackClass}`}>
        {initials || <UserCircle2 className="w-1/2 h-1/2 text-slate-400" />}
      </AvatarFallback>
    </Avatar>
  )
}
