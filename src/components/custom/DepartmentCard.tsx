"use client"

import { Card } from "@/components/ui/card"
import { Mail, Users } from "lucide-react"
import { StatusBadge } from "./StatusBadge"
import { UserAvatar } from "./UserAvatar"
import Link from "next/link"
import { ResetPasswordButton } from "@/components/settings/ResetPasswordButton"

interface DepartmentCardProps {
  id: string
  name: string
  code: string
  email: string
  headName: string
  status: string
  photo?: string | null
}

export function DepartmentCard({ id, name, code, email, headName, status, photo }: DepartmentCardProps) {
  return (
    <Link href={`/admin/departments/${id}`} className="block group">
      <Card className="p-6 transition-all duration-200 hover:shadow-lg hover:border-blue-200 hover:shadow-blue-500/5 bg-white rounded-2xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-4 items-center">
            <UserAvatar 
              url={photo} 
              name={name} 
              className="w-12 h-12 rounded-xl"
              fallbackClass="rounded-xl bg-blue-50 text-blue-600"
            />
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{name}</h3>
              <p className="text-xs font-semibold text-slate-400">Code: {code}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={status} />
            <div onClick={(e) => e.preventDefault()}>
              <ResetPasswordButton userId={id} userName={name} />
            </div>
          </div>
        </div>
        
        <div className="space-y-2 mt-6">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-medium">Head: {headName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            <span className="truncate">{email}</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
