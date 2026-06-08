import { Card } from "@/components/ui/card"
import { Mail, Phone, Briefcase } from "lucide-react"
import { StatusBadge } from "./StatusBadge"
import { UserAvatar } from "./UserAvatar"
import Link from "next/link"

interface EmployeeCardProps {
  id: string
  name: string
  code: string
  email: string
  designation: string
  phone?: string | null
  status: string
  photo?: string | null
}

export function EmployeeCard({ id, name, code, email, designation, phone, status, photo }: EmployeeCardProps) {
  return (
    <Link href={`/department/employees/${id}`} className="block group">
      <Card className="p-5 transition-all duration-200 hover:shadow-lg hover:border-purple-200 hover:shadow-purple-500/5 bg-white rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="flex justify-between items-start mb-4 pl-2">
          <div className="flex gap-4 items-center">
            <UserAvatar 
              url={photo} 
              name={name} 
              className="w-12 h-12"
            />
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{name}</h3>
              <p className="text-xs font-semibold text-slate-400">{code}</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
        
        <div className="space-y-2 mt-5 pl-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{designation}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            <span className="truncate">{email}</span>
          </div>
          {phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{phone}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
